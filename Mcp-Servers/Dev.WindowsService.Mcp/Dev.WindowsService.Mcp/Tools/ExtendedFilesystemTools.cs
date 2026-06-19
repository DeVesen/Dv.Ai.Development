using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.WindowsService.Mcp.Models;
using Dev.WindowsService.Mcp.Services;
using Dev.WindowsService.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.WindowsService.Mcp.Tools;

/// <summary>
/// P0/P1/P2 extended filesystem tools:
/// read_lines, read_files_batch, apply_text_patch, rename_file_with_impact,
/// find_angular_route, find_angular_guard, find_dotnet_endpoint, find_di_registration,
/// read_component_bundle, update_imports, delete_file_safe, replace_in_files, insert_member.
/// </summary>
public sealed class ExtendedFilesystemTools
{
    private readonly AllowedDirectoriesService _allowed;
    private readonly CodeReadService _codeRead;
    private readonly PatchService _patch;
    private readonly ImpactAnalysisService _impact;
    private readonly AngularDiscoveryService _angularDiscovery;
    private readonly DotnetDiscoveryService _dotnetDiscovery;
    private readonly FileOperationsService _fileOps;
    private readonly ToolCallHistory _history;
    private readonly ILogger<ExtendedFilesystemTools> _logger;

    public ExtendedFilesystemTools(
        AllowedDirectoriesService allowed,
        CodeReadService codeRead,
        PatchService patch,
        ImpactAnalysisService impact,
        AngularDiscoveryService angularDiscovery,
        DotnetDiscoveryService dotnetDiscovery,
        FileOperationsService fileOps,
        ToolCallHistory history,
        ILogger<ExtendedFilesystemTools> logger)
    {
        _allowed = allowed; _codeRead = codeRead; _patch = patch;
        _impact = impact; _angularDiscovery = angularDiscovery;
        _dotnetDiscovery = dotnetDiscovery; _fileOps = fileOps;
        _history = history; _logger = logger;
    }

    // ── read_lines ─────────────────────────────────────────────────────────────

    [McpServerTool(Name = "read_lines")]
    [Description("Reads a specific line range from a file with optional context lines. Returns {filePath, lines:[{lineNo,text}], totalLines, requestedStart, requestedEnd}. Max 500 lines (range + 2*context_lines).")]
    public string ReadLines(
        [Description("Absolute path to the file")] string file_path,
        [Description("First line to read (1-based)")] int start_line,
        [Description("Last line to read (1-based, inclusive)")] int end_line,
        [Description("Extra context lines before start and after end (default 0)")] int context_lines = 0) =>
        Execute("read_lines", "filesystem", new { file_path, start_line, end_line, context_lines }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);

            var allLines = File.ReadAllLines(normalized);
            var total = allLines.Length;
            var ctx = Math.Max(0, context_lines);

            var effectiveStart = Math.Max(1, start_line - ctx);
            var effectiveEnd = Math.Min(total, end_line + ctx);
            var count = effectiveEnd - effectiveStart + 1;

            if (count > 500)
                return JsonOptions.Error("read_lines: requested range exceeds 500 lines. Reduce range or context_lines.");

            var lines = allLines[(effectiveStart - 1)..effectiveEnd]
                .Select((text, i) => new LineEntry(effectiveStart + i, text))
                .ToList();

            return JsonOptions.Serialize(new ReadLinesResult(normalized, lines, total, start_line, end_line));
        });

    // ── read_files_batch ───────────────────────────────────────────────────────

    [McpServerTool(Name = "read_files_batch")]
    [Description("Reads multiple files at once. mode: 'signatures' | 'class_summary' | 'method'. For mode=method, provide method_names JSON array. Max 25 files.")]
    public string ReadFilesBatch(
        [Description("JSON array of absolute file paths (max 25)")] string file_paths,
        [Description("Read mode: 'signatures' | 'class_summary' | 'method'")] string mode,
        [Description("JSON array of method names (required for mode=method)")] string? method_names = null) =>
        Execute("read_files_batch", "filesystem", new { file_paths, mode, method_names }, () =>
        {
            List<string> paths;
            try { paths = JsonSerializer.Deserialize<List<string>>(file_paths, JsonOptions.Default) ?? []; }
            catch { return JsonOptions.Error("file_paths must be a valid JSON array of strings"); }

            if (paths.Count > 25)
                return JsonOptions.Error("read_files_batch: max 25 file paths allowed");

            List<string>? methods = null;
            if (mode == "method")
            {
                if (string.IsNullOrWhiteSpace(method_names))
                    return JsonOptions.Error("method_names is required when mode=method");
                try { methods = JsonSerializer.Deserialize<List<string>>(method_names, JsonOptions.Default) ?? []; }
                catch { return JsonOptions.Error("method_names must be a valid JSON array of strings"); }
            }

            var results = new List<BatchFileResult>();
            foreach (var path in paths)
            {
                if (!TryResolveFile(path, out var normalized, out var fileErr))
                {
                    results.Add(new BatchFileResult(path, null, fileErr));
                    continue;
                }

                try
                {
                    string content;
                    if (mode == "signatures")
                    {
                        var sigs = _codeRead.ReadSignaturesOnly(normalized, false);
                        content = JsonOptions.Serialize(sigs);
                    }
                    else if (mode == "class_summary")
                    {
                        var summaries = new List<ClassSummaryResult>();
                        try { summaries.Add(_codeRead.ReadClassSummary(normalized, null)); } catch { }
                        content = JsonOptions.Serialize(summaries);
                    }
                    else if (mode == "method" && methods is not null)
                    {
                        var methodResults = new List<MethodReadResult?>();
                        foreach (var methodName in methods)
                        {
                            try { methodResults.Add(_codeRead.ReadMethod(normalized, methodName, null)); }
                            catch { methodResults.Add(null); }
                        }
                        content = JsonOptions.Serialize(methodResults);
                    }
                    else
                    {
                        content = JsonOptions.Error($"Unknown mode: {mode}");
                    }

                    results.Add(new BatchFileResult(normalized, content, null));
                }
                catch (Exception ex)
                {
                    results.Add(new BatchFileResult(path, null, ex.Message));
                }
            }

            return JsonOptions.Serialize(results);
        });

    // ── apply_text_patch ───────────────────────────────────────────────────────

    [McpServerTool(Name = "apply_text_patch")]
    [Description("Patches a file by line range (start_line+end_line+new_text) or anchor (old_text+new_text). Optionally runs compiler gate. dry_run=true previews without writing.")]
    public string ApplyTextPatch(
        [Description("Absolute path to the file")] string file_path,
        [Description("Replacement text")] string new_text,
        [Description("First line to replace (1-based, line-range mode)")] int? start_line = null,
        [Description("Last line to replace (1-based, inclusive, line-range mode)")] int? end_line = null,
        [Description("Anchor text to replace (anchor mode; alternative to start_line/end_line)")] string? old_text = null,
        [Description("Run dotnet build / tsc --noEmit after patch on .cs/.ts (default true)")] bool run_compiler_gate = true,
        [Description("Preview only, do not write file (default false)")] bool dry_run = false,
        [Description("Restore original if compiler gate fails (default false)")] bool rollback_on_error = false) =>
        Execute("apply_text_patch", "filesystem", new { file_path, start_line, end_line, old_text, run_compiler_gate, dry_run }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);

            ApplyPatchResult result;
            if (old_text is not null)
            {
                result = _patch.ApplyAnchorPatch(normalized, old_text, new_text, run_compiler_gate, dry_run, rollback_on_error);
            }
            else if (start_line.HasValue && end_line.HasValue)
            {
                result = _patch.ApplyLinePatch(normalized, start_line.Value, end_line.Value, new_text, run_compiler_gate, dry_run, rollback_on_error);
            }
            else
            {
                return JsonOptions.Error("apply_text_patch: provide either old_text or (start_line + end_line)");
            }

            if (result.Error is not null &&
                (result.Error.StartsWith("ambiguous_anchor") || result.Error.StartsWith("anchor_not_found") || result.Error.StartsWith("path_not")))
                return JsonOptions.Error(result.Error);

            return JsonOptions.Serialize(result);
        });

    // ── rename_file_with_impact ────────────────────────────────────────────────

    [McpServerTool(Name = "rename_file_with_impact")]
    [Description("Renames a file with impact analysis. execute=false (default) shows importers, spec files, and .csproj references without modifying anything. execute=true performs the rename.")]
    public string RenameFileWithImpact(
        [Description("Current absolute file path")] string old_path,
        [Description("New absolute file path")] string new_path,
        [Description("false (default) = preview impact only; true = rename the file")] bool execute = false) =>
        Execute("rename_file_with_impact", "filesystem", new { old_path, new_path, execute }, () =>
        {
            if (string.IsNullOrWhiteSpace(old_path)) return JsonOptions.Error("old_path is required");
            if (string.IsNullOrWhiteSpace(new_path)) return JsonOptions.Error("new_path is required");

            var fullOld = Path.GetFullPath(old_path.Trim());
            var fullNew = Path.GetFullPath(new_path.Trim());

            if (!_allowed.IsAllowed(fullOld)) return JsonOptions.Error("path_not_allowed: old_path is not under an allowed directory");
            if (!_allowed.IsAllowed(fullNew)) return JsonOptions.Error("path_not_allowed: new_path is not under an allowed directory");
            if (!File.Exists(fullOld)) return JsonOptions.Error("path_not_found: old_path does not exist");

            var impact = _impact.Analyse(fullOld);

            if (execute)
            {
                if (File.Exists(fullNew))
                    return JsonOptions.Error("rename_conflict: new_path already exists");

                var destDir = Path.GetDirectoryName(fullNew);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);
                File.Move(fullOld, fullNew);

                return JsonOptions.Serialize(new RenameWithImpactResult(fullOld, fullNew, true, impact, null));
            }

            return JsonOptions.Serialize(new RenameWithImpactResult(fullOld, fullNew, false, impact, null));
        });

    // ── find_angular_route ─────────────────────────────────────────────────────

    [McpServerTool(Name = "find_angular_route")]
    [Description("Finds Angular route configurations matching a partial route path. Returns {routes:[{routePath, component, filePath, line, guards}], truncated}.")]
    public string FindAngularRoute(
        [Description("Angular project root (absolute path)")] string root,
        [Description("Partial route path to search for, e.g. 'admin' or 'product/:id'")] string route_path) =>
        Execute("find_angular_route", "angular", new { root, route_path }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_angularDiscovery.FindRoutes(normalizedRoot, route_path));
        });

    // ── find_angular_guard ─────────────────────────────────────────────────────

    [McpServerTool(Name = "find_angular_guard")]
    [Description("Finds Angular route guards matching a partial name. Returns {guards:[{name, filePath, line, canActivate, canActivateChild}], truncated}.")]
    public string FindAngularGuard(
        [Description("Angular project root (absolute path)")] string root,
        [Description("Partial guard name to search for")] string guard_name) =>
        Execute("find_angular_guard", "angular", new { root, guard_name }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_angularDiscovery.FindGuards(normalizedRoot, guard_name));
        });

    // ── find_dotnet_endpoint ───────────────────────────────────────────────────

    [McpServerTool(Name = "find_dotnet_endpoint")]
    [Description("Finds .NET Web API endpoints matching a partial route or action name. Returns {endpoints:[{controller, action, httpMethod, routeTemplate, filePath, line}], truncated}.")]
    public string FindDotnetEndpoint(
        [Description(".NET project root (absolute path)")] string root,
        [Description("Partial route path (e.g. 'api/search') or action name (e.g. 'SearchAsync')")] string route_or_action) =>
        Execute("find_dotnet_endpoint", "dotnet", new { root, route_or_action }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_dotnetDiscovery.FindEndpoints(normalizedRoot, route_or_action));
        });

    // ── find_di_registration ───────────────────────────────────────────────────

    [McpServerTool(Name = "find_di_registration")]
    [Description("Finds DI registrations (AddSingleton/Scoped/Transient in .cs; providers:[] in .ts). Returns {registrations:[{service, lifetime, filePath, line, registrationPattern}], truncated}.")]
    public string FindDiRegistration(
        [Description("Project root (absolute path)")] string root,
        [Description("Partial service name to search for")] string service_name,
        [Description("Language: 'csharp' (default) | 'angular'")] string language = "csharp") =>
        Execute("find_di_registration", "dotnet", new { root, service_name, language }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);

            var result = language == "angular"
                ? _angularDiscovery.FindAngularDiRegistrations(normalizedRoot, service_name)
                : _dotnetDiscovery.FindDiRegistrations(normalizedRoot, service_name);

            return JsonOptions.Serialize(result);
        });

    // ── read_component_bundle ──────────────────────────────────────────────────

    [McpServerTool(Name = "read_component_bundle")]
    [Description("Reads an Angular .component.ts and its template, styles, and spec in one call. template_mode='summary' returns binding list instead of full HTML.")]
    public string ReadComponentBundle(
        [Description("Absolute path to the .component.ts file")] string component_ts_path,
        [Description("Include template (default true)")] bool include_template = true,
        [Description("'full' = full HTML; 'summary' = bindings list (default 'summary')")] string template_mode = "summary",
        [Description("Include styles (default false)")] bool include_styles = false,
        [Description("Include spec signatures (default false)")] bool include_spec = false) =>
        Execute("read_component_bundle", "angular", new { component_ts_path, include_template, template_mode, include_styles, include_spec }, () =>
        {
            if (!TryResolveFile(component_ts_path, out var normalized, out var err)) return JsonOptions.Error(err);
            if (template_mode is not ("full" or "summary"))
                return JsonOptions.Error("template_mode must be 'full' or 'summary'");

            try
            {
                return JsonOptions.Serialize(_angularDiscovery.ReadComponentBundle(normalized, include_template, template_mode, include_styles, include_spec));
            }
            catch (Exception ex) { return JsonOptions.Error(ex.Message); }
        });

    // ── update_imports ─────────────────────────────────────────────────────────

    [McpServerTool(Name = "update_imports")]
    [Description("Updates import paths across TypeScript or C# files. Provide file_path for a single file or directory to scan all files. Returns {success, filesUpdated, changes[{file, line, oldImport, newImport}]}.")]
    public string UpdateImports(
        [Description("Absolute path to a single file (or omit to use directory)")] string? file_path,
        [Description("Absolute path to a directory (or omit to use file_path)")] string? directory,
        [Description("Old import path (TypeScript: relative path; C#: namespace)")] string old_path,
        [Description("New import path")] string new_path,
        [Description("Symbol being moved (optional, informational)")] string? symbol = null,
        [Description("'typescript' | 'csharp' | 'auto' (default)")] string language = "auto") =>
        Execute("update_imports", "filesystem", new { file_path, directory, old_path, new_path, symbol, language }, () =>
        {
            if (file_path is null && directory is null)
                return JsonOptions.Error("Provide either file_path or directory");
            if (file_path is not null && !_allowed.IsAllowed(file_path))
                return JsonOptions.Error("path_not_allowed: file_path is not under an allowed directory");
            if (directory is not null && !_allowed.IsAllowed(directory))
                return JsonOptions.Error("path_not_allowed: directory is not under an allowed directory");

            return JsonOptions.Serialize(_dotnetDiscovery.UpdateImports(file_path, directory, symbol, old_path, new_path, language));
        });

    // ── delete_file_safe ───────────────────────────────────────────────────────

    [McpServerTool(Name = "delete_file_safe")]
    [Description("Deletes a file after checking for references. dry_run=true (default) previews. force=true deletes even if references exist. Returns {wouldDelete, references, safe, warning, deleted}.")]
    public string DeleteFileSafe(
        [Description("Absolute path to the file")] string file_path,
        [Description("Preview only, do not delete (default true)")] bool dry_run = true,
        [Description("Delete even if references exist (default false)")] bool force = false) =>
        Execute("delete_file_safe", "filesystem", new { file_path, dry_run, force }, () =>
        {
            if (!_allowed.IsAllowed(file_path)) return JsonOptions.Error("path_not_allowed: file_path is not under an allowed directory");
            var normalized = Path.GetFullPath(file_path.Trim());
            if (!File.Exists(normalized)) return JsonOptions.Error("path_not_found: file does not exist");

            return JsonOptions.Serialize(_fileOps.DeleteFileSafe(normalized, dry_run, force));
        });

    // ── replace_in_files ───────────────────────────────────────────────────────

    [McpServerTool(Name = "replace_in_files")]
    [Description("Replaces text/regex across files under root. dry_run=true (default) shows preview. confirm=true + dry_run=false applies changes. Returns {affectedFiles, totalOccurrences, applied}.")]
    public string ReplaceInFiles(
        [Description("Root directory to search")] string root,
        [Description("Literal text to find (alternative to pattern)")] string? old_text = null,
        [Description("Regex pattern to find (alternative to old_text)")] string? pattern = null,
        [Description("Replacement text")] string new_text = "",
        [Description("File glob filter, e.g. '*.ts'")] string? file_glob = null,
        [Description("Preview only (default true)")] bool dry_run = true,
        [Description("Must be true together with dry_run=false to apply changes")] bool confirm = false) =>
        Execute("replace_in_files", "filesystem", new { root, old_text, pattern, new_text, file_glob, dry_run, confirm }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            if (old_text is null && pattern is null)
                return JsonOptions.Error("Provide either old_text or pattern");

            return JsonOptions.Serialize(_fileOps.ReplaceInFiles(normalizedRoot, old_text, pattern, new_text, file_glob, dry_run, confirm));
        });

    // ── insert_member ──────────────────────────────────────────────────────────

    [McpServerTool(Name = "insert_member")]
    [Description("Inserts a method, property, or field into a .cs or .ts class. position='end_of_class' (default) or 'after_member' (requires after_member_name). Returns {success, filePath, insertedAtLine}.")]
    public string InsertMember(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("'method' | 'property' | 'field'")] string member_kind,
        [Description("Member signature, e.g. 'public string Name { get; set; }'")] string signature,
        [Description("Method body lines (optional; methods get throw NotImplementedException if omitted)")] string? body = null,
        [Description("'end_of_class' (default) | 'after_member'")] string position = "end_of_class",
        [Description("Name of existing member to insert after (required for position=after_member)")] string? after_member_name = null) =>
        Execute("insert_member", "filesystem", new { file_path, member_kind, signature, position, after_member_name }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);
            if (member_kind is not ("method" or "property" or "field"))
                return JsonOptions.Error("member_kind must be 'method', 'property', or 'field'");
            if (position is not ("end_of_class" or "after_member"))
                return JsonOptions.Error("position must be 'end_of_class' or 'after_member'");
            if (position == "after_member" && string.IsNullOrWhiteSpace(after_member_name))
                return JsonOptions.Error("after_member_name is required when position=after_member");

            return JsonOptions.Serialize(_fileOps.InsertMember(normalized, member_kind, signature, body, position, after_member_name));
        });

    // ── helpers ────────────────────────────────────────────────────────────────

    private bool ValidateRoot(string root, out string normalizedRoot, out string error)
    {
        if (!PathValidator.TryValidateRoot(root, out normalizedRoot, out error)) return false;
        if (!_allowed.TryValidateAllowed(normalizedRoot, out error)) return false;
        return true;
    }

    private bool TryResolveFile(string filePath, out string normalizedFile, out string error)
    {
        normalizedFile = string.Empty; error = string.Empty;
        if (string.IsNullOrWhiteSpace(filePath)) { error = "file_path is required"; return false; }
        try { normalizedFile = Path.GetFullPath(filePath.Trim()); }
        catch (Exception ex) { error = ex.Message; return false; }
        if (!_allowed.TryValidateAllowed(normalizedFile, out error)) return false;
        if (!File.Exists(normalizedFile)) { error = $"File not found: {normalizedFile}"; return false; }
        return true;
    }

    private string Execute(string toolName, string source, object parameters, Func<string> action)
    {
        var sw = Stopwatch.StartNew();
        string output;
        try { output = action(); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tool {Tool} failed", toolName);
            output = JsonOptions.Error(ex.Message);
        }
        sw.Stop();
        var paramsJson = JsonSerializer.Serialize(parameters, JsonOptions.Default);
        _history.Record(toolName, source, paramsJson, output, string.Empty, sw.ElapsedMilliseconds);
        _logger.LogInformation("=== {Tool} ({Duration}ms) ===", toolName, sw.ElapsedMilliseconds);
        return output;
    }
}
