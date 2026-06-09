using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Filesystem.Mcp.Json;
using Dev.Filesystem.Mcp.Services;
using Dev.Filesystem.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Filesystem.Mcp.Tools;

public sealed class FilesystemTools
{
    private readonly GlobSearchService _globSearch;
    private readonly ContentSearchService _contentSearch;
    private readonly ImplementationSearchService _implementationSearch;
    private readonly CodeReadService _codeRead;
    private readonly ToolCallHistory _history;
    private readonly ILogger<FilesystemTools> _logger;

    public FilesystemTools(
        GlobSearchService globSearch,
        ContentSearchService contentSearch,
        ImplementationSearchService implementationSearch,
        CodeReadService codeRead,
        ToolCallHistory history,
        ILogger<FilesystemTools> logger)
    {
        _globSearch = globSearch;
        _contentSearch = contentSearch;
        _implementationSearch = implementationSearch;
        _codeRead = codeRead;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "find_file")]
    [Description("Finds files by name or glob. Returns JSON array: [{path, relative, sizeBytes}]. Token-efficient alternative to directory listing.")]
    public string FindFile(
        [Description("Root directory (absolute path)")] string root,
        [Description("Filename or glob, e.g. 'UserService.ts' or '**/*Service.cs'")] string pattern,
        [Description("Max results (default 20, max 100)")] int max_results = 20) =>
        Execute("find_file", new { root, pattern, max_results }, () =>
        {
            if (!PathValidator.TryValidateRoot(root, out var normalizedRoot, out var error))
                return JsonResultFormatter.Error(error);

            var results = _globSearch.FindFile(normalizedRoot, pattern, max_results);
            return JsonResultFormatter.Success(results);
        });

    [McpServerTool(Name = "find_by_content")]
    [Description("Finds files containing a regex/literal. Returns JSON array: [{file, line, match}]. Use instead of loading whole files.")]
    public string FindByContent(
        [Description("Root directory (absolute path)")] string root,
        [Description("Regex or literal pattern")] string pattern,
        [Description("File glob filter, e.g. '*.cs' (default: all)")] string? file_glob = null,
        [Description("Max results (default 20, max 100)")] int max_results = 20) =>
        Execute("find_by_content", new { root, pattern, file_glob, max_results }, () =>
        {
            if (!PathValidator.TryValidateRoot(root, out var normalizedRoot, out var error))
                return JsonResultFormatter.Error(error);

            var results = _contentSearch.FindByContent(normalizedRoot, pattern, file_glob, max_results);
            return JsonResultFormatter.Success(results);
        });

    [McpServerTool(Name = "find_implementations")]
    [Description("Finds all classes implementing an interface in .cs or .ts files. Returns JSON array: [{className, file, line}].")]
    public string FindImplementations(
        [Description("Root directory (absolute path)")] string root,
        [Description("Interface name, e.g. 'IOrderService' (with or without I prefix)")] string interface_name,
        [Description("'csharp', 'typescript', or 'auto' (default)")] string language = "auto",
        [Description("Max results (default 20)")] int max_results = 20) =>
        Execute("find_implementations", new { root, interface_name, language, max_results }, () =>
        {
            if (!PathValidator.TryValidateRoot(root, out var normalizedRoot, out var error))
                return JsonResultFormatter.Error(error);

            var results = _implementationSearch.FindImplementations(normalizedRoot, interface_name, language, max_results);
            return JsonResultFormatter.Success(results);
        });

    [McpServerTool(Name = "read_signatures_only")]
    [Description("Returns only public method/property signatures from a .cs or .ts file — no bodies. Typically 90% fewer tokens than reading the full file.")]
    public string ReadSignaturesOnly(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Include private/protected members (default false)")] bool include_private = false) =>
        Execute("read_signatures_only", new { file_path, include_private }, () =>
        {
            if (!TryResolveFileRoot(file_path, out var normalizedFile, out var error))
                return JsonResultFormatter.Error(error);

            try
            {
                var results = _codeRead.ReadSignaturesOnly(normalizedFile, include_private);
                return JsonResultFormatter.Success(results);
            }
            catch (Exception ex)
            {
                return JsonResultFormatter.Error(ex.Message);
            }
        });

    [McpServerTool(Name = "read_method")]
    [Description("Returns a single method/function by name — no other content. Much more token-efficient than reading the whole file.")]
    public string ReadMethod(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Method or function name")] string method_name,
        [Description("Class name for disambiguation (optional)")] string? class_name = null) =>
        Execute("read_method", new { file_path, method_name, class_name }, () =>
        {
            if (!TryResolveFileRoot(file_path, out var normalizedFile, out var error))
                return JsonResultFormatter.Error(error);

            try
            {
                var result = _codeRead.ReadMethod(normalizedFile, method_name, class_name);
                return JsonResultFormatter.Success(result);
            }
            catch (Exception ex)
            {
                return JsonResultFormatter.Error(ex.Message);
            }
        });

    [McpServerTool(Name = "read_class_summary")]
    [Description("Returns class name, base class, interfaces, and property+method list without bodies. Structural overview only.")]
    public string ReadClassSummary(
        [Description("Absolute path to .cs or .ts file")] string file_path,
        [Description("Class name (optional, reads first class if omitted)")] string? class_name = null) =>
        Execute("read_class_summary", new { file_path, class_name }, () =>
        {
            if (!TryResolveFileRoot(file_path, out var normalizedFile, out var error))
                return JsonResultFormatter.Error(error);

            try
            {
                var result = _codeRead.ReadClassSummary(normalizedFile, class_name);
                return JsonResultFormatter.Success(result);
            }
            catch (Exception ex)
            {
                return JsonResultFormatter.Error(ex.Message);
            }
        });

    private string Execute(string toolName, object parameters, Func<string> action)
    {
        var sw = Stopwatch.StartNew();
        string output;
        try
        {
            output = action();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tool {Tool} failed", toolName);
            output = JsonResultFormatter.Error(ex.Message);
        }

        sw.Stop();
        var paramsJson = JsonSerializer.Serialize(parameters, JsonResultFormatter.JsonOptions);
        _history.Record(toolName, paramsJson, output, (int)sw.ElapsedMilliseconds);
        _logger.LogInformation("=== {Tool} ({Duration}ms) ===\n{Output}", toolName, sw.ElapsedMilliseconds, output);
        return output;
    }

    private static bool TryResolveFileRoot(string filePath, out string normalizedFile, out string error)
    {
        normalizedFile = string.Empty;
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(filePath))
        {
            error = "file_path is required";
            return false;
        }

        try
        {
            normalizedFile = Path.GetFullPath(filePath.Trim());
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }

        var projectRoot = Environment.GetEnvironmentVariable("PROJECT_ROOT");
        if (!string.IsNullOrWhiteSpace(projectRoot)
            && PathValidator.TryValidateRoot(projectRoot, out var normalizedRoot, out _)
            && !PathValidator.IsUnderRoot(normalizedFile, normalizedRoot))
        {
            error = $"Path is outside project root: {normalizedFile}";
            return false;
        }

        if (!File.Exists(normalizedFile))
        {
            error = $"File not found: {normalizedFile}";
            return false;
        }

        return true;
    }
}
