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
/// P0 Git and test-slice tools: git_changed_files, git_diff_summary, slice_test_targets.
/// </summary>
public sealed class GitAndTestTools
{
    private readonly AllowedDirectoriesService _allowed;
    private readonly GitService _git;
    private readonly SliceTestTargetsService _slice;
    private readonly ToolCallHistory _history;
    private readonly ILogger<GitAndTestTools> _logger;

    public GitAndTestTools(
        AllowedDirectoriesService allowed,
        GitService git,
        SliceTestTargetsService slice,
        ToolCallHistory history,
        ILogger<GitAndTestTools> logger)
    {
        _allowed = allowed; _git = git; _slice = slice;
        _history = history; _logger = logger;
    }

    // ── git_changed_files ──────────────────────────────────────────────────────

    [McpServerTool(Name = "git_changed_files")]
    [Description("Lists changed files in a git repository. base: 'staged' | 'unstaged' | 'all' | 'branch:<name>' | 'commit:<sha>'. Returns {files:[{path, status}], repoRoot, base}.")]
    public string GitChangedFiles(
        [Description("Absolute path to the git repository root")] string repo_root,
        [Description("What to diff: 'staged', 'unstaged', 'all', 'branch:<name>', 'commit:<sha>'")] string @base) =>
        Execute("git_changed_files", "git", new { repo_root, @base }, () =>
        {
            if (string.IsNullOrWhiteSpace(repo_root)) return JsonOptions.Error("repo_root is required");
            var normalized = Path.GetFullPath(repo_root.Trim());
            if (!Directory.Exists(normalized)) return JsonOptions.Error($"repo_root not found: {normalized}");
            if (!_allowed.IsAllowed(normalized)) return JsonOptions.Error("path_not_allowed: repo_root is not under an allowed directory");

            return JsonOptions.Serialize(_git.GetChangedFiles(normalized, @base));
        });

    // ── git_diff_summary ───────────────────────────────────────────────────────

    [McpServerTool(Name = "git_diff_summary")]
    [Description("Compact git diff per file: added/removed line counts + up to 3 context lines per hunk. Returns {files:[{filePath, addedLines, removedLines, hunks:[{header, contextLines}]}]}.")]
    public string GitDiffSummary(
        [Description("JSON array of absolute file paths to diff")] string file_paths,
        [Description("Absolute path to the git repository root")] string repo_root) =>
        Execute("git_diff_summary", "git", new { file_paths, repo_root }, () =>
        {
            if (string.IsNullOrWhiteSpace(repo_root)) return JsonOptions.Error("repo_root is required");
            var normalized = Path.GetFullPath(repo_root.Trim());
            if (!Directory.Exists(normalized)) return JsonOptions.Error($"repo_root not found: {normalized}");

            List<string> paths;
            try { paths = JsonSerializer.Deserialize<List<string>>(file_paths, JsonOptions.Default) ?? []; }
            catch { return JsonOptions.Error("file_paths must be a valid JSON array of strings"); }

            return JsonOptions.Serialize(_git.GetDiffSummary(paths, normalized));
        });

    // ── slice_test_targets ─────────────────────────────────────────────────────

    [McpServerTool(Name = "slice_test_targets")]
    [Description("Derives Angular spec globs and .NET test filters from changed file paths. Returns {angular:{includeGlobs, suggestedNgTestArgs}, dotnet:{testProjectPath, filter}}. stack: 'angular'|'dotnet'|'auto'.")]
    public string SliceTestTargets(
        [Description("JSON array of changed absolute file paths")] string changed_file_paths,
        [Description("Target stack: 'angular' | 'dotnet' | 'auto' (default)")] string stack = "auto") =>
        Execute("slice_test_targets", "test", new { changed_file_paths, stack }, () =>
        {
            List<string> paths;
            try { paths = JsonSerializer.Deserialize<List<string>>(changed_file_paths, JsonOptions.Default) ?? []; }
            catch { return JsonOptions.Error("changed_file_paths must be a valid JSON array of strings"); }

            if (stack is not ("angular" or "dotnet" or "auto"))
                return JsonOptions.Error("stack must be 'angular', 'dotnet', or 'auto'");

            return JsonOptions.Serialize(_slice.Slice(paths, stack));
        });

    // ── helpers ────────────────────────────────────────────────────────────────

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
