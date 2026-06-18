using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.WindowsService.Mcp.Models;
using Dev.WindowsService.Mcp.Services;
using Dev.WindowsService.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.WindowsService.Mcp.Tools;

public sealed class FilesystemTools
{
    private readonly GlobSearchService _globSearch;
    private readonly ContentSearchService _contentSearch;
    private readonly ImplementationSearchService _implementationSearch;
    private readonly CodeReadService _codeRead;
    private readonly AllowedDirectoriesService _allowed;
    private readonly ToolCallHistory _history;
    private readonly ILogger<FilesystemTools> _logger;

    public FilesystemTools(
        GlobSearchService globSearch, ContentSearchService contentSearch,
        ImplementationSearchService implementationSearch, CodeReadService codeRead,
        AllowedDirectoriesService allowed, ToolCallHistory history, ILogger<FilesystemTools> logger)
    {
        _globSearch = globSearch; _contentSearch = contentSearch;
        _implementationSearch = implementationSearch; _codeRead = codeRead;
        _allowed = allowed; _history = history; _logger = logger;
    }

    [McpServerTool(Name = "find_file")]
    [Description("Finds files by name or glob. Returns JSON array: [{path, relative, sizeBytes}].")]
    public string FindFile(
        [Description("Root directory (absolute path, must be under an AllowedDirectory)")] string root,
        [Description("Filename or glob, e.g. 'UserService.ts' or '**/*Service.cs'")] string pattern,
        [Description("Max results (default 20, max 100)")] int max_results = 20) =>
        Execute("find_file", "filesystem", new { root, pattern, max_results }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_globSearch.FindFile(normalizedRoot, pattern, max_results));
        });

    [McpServerTool(Name = "find_by_content")]
    [Description("Finds files containing a regex/literal. Returns JSON array: [{file, line, match}].")]
    public string FindByContent(
        [Description("Root directory (absolute path, must be under an AllowedDirectory)")] string root,
        [Description("Regex or literal pattern")] string pattern,
        [Description("File glob filter, e.g. '*.cs'")] string? file_glob = null,
        [Description("Max results (default 20, max 100)")] int max_results = 20) =>
        Execute("find_by_content", "filesystem", new { root, pattern, file_glob, max_results }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_contentSearch.FindByContent(normalizedRoot, pattern, file_glob, max_results));
        });

    [McpServerTool(Name = "find_implementations")]
    [Description("Finds all classes implementing an interface in .cs or .ts files. Returns JSON array: [{className, file, line}].")]
    public string FindImplementations(
        [Description("Root directory (absolute path)")] string root,
        [Description("Interface name, e.g. 'IOrderService'")] string interface_name,
        [Description("'csharp', 'typescript', or 'auto' (default)")] string language = "auto",
        [Description("Max results (default 20)")] int max_results = 20) =>
        Execute("find_implementations", "filesystem", new { root, interface_name, language, max_results }, () =>
        {
            if (!ValidateRoot(root, out var normalizedRoot, out var err)) return JsonOptions.Error(err);
            return JsonOptions.Serialize(_implementationSearch.FindImplementations(normalizedRoot, interface_name, language, max_results));
        });

    [McpServerTool(Name = "read_signatures_only")]
    [Description("Returns only public method/property signatures from a .cs or .ts file — no bodies. Typically 90% fewer tokens than reading the full file.")]
    public string ReadSignaturesOnly(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Include private/protected members (default false)")] bool include_private = false) =>
        Execute("read_signatures_only", "filesystem", new { file_path, include_private }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);
            try { return JsonOptions.Serialize(_codeRead.ReadSignaturesOnly(normalized, include_private)); }
            catch (Exception ex) { return JsonOptions.Error(ex.Message); }
        });

    [McpServerTool(Name = "read_method")]
    [Description("Returns a single method/function by name — no other content. Much more token-efficient than reading the whole file.")]
    public string ReadMethod(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Method or function name")] string method_name,
        [Description("Class name for disambiguation (optional)")] string? class_name = null) =>
        Execute("read_method", "filesystem", new { file_path, method_name, class_name }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);
            try { return JsonOptions.Serialize(_codeRead.ReadMethod(normalized, method_name, class_name)); }
            catch (Exception ex) { return JsonOptions.Error(ex.Message); }
        });

    [McpServerTool(Name = "read_class_summary")]
    [Description("Returns class name, base class, interfaces, and property+method list without bodies. Structural overview only.")]
    public string ReadClassSummary(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Class name (optional, reads first class if omitted)")] string? class_name = null) =>
        Execute("read_class_summary", "filesystem", new { file_path, class_name }, () =>
        {
            if (!TryResolveFile(file_path, out var normalized, out var err)) return JsonOptions.Error(err);
            try { return JsonOptions.Serialize(_codeRead.ReadClassSummary(normalized, class_name)); }
            catch (Exception ex) { return JsonOptions.Error(ex.Message); }
        });

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
