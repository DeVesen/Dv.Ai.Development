using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;
using Dev.Mcp.Services;
using Dev.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Mcp.Tools;

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
    public Task<string> GitChangedFiles(
        [Description("Absolute path to the git repository root")] string repo_root,
        [Description("What to diff: 'staged', 'unstaged', 'all', 'branch:<name>', 'commit:<sha>'")] string @base) =>
        ExecuteAsync("git_changed_files", "git", new { repo_root, @base }, async () =>
        {
            if (string.IsNullOrWhiteSpace(repo_root)) return JsonOptions.Error("repo_root is required");
            var normalized = Path.GetFullPath(repo_root.Trim());
            if (!Directory.Exists(normalized)) return JsonOptions.Error($"repo_root not found: {normalized}");
            if (!_allowed.IsAllowed(normalized)) return JsonOptions.Error("path_not_allowed: repo_root is not under an allowed directory");

            return JsonOptions.Serialize(await _git.GetChangedFilesAsync(normalized, @base));
        });

    // ── git_diff_summary ───────────────────────────────────────────────────────

    [McpServerTool(Name = "git_diff_summary")]
    [Description("Compact git diff per file: added/removed line counts + up to 3 context lines per hunk. Returns {files:[{filePath, addedLines, removedLines, hunks:[{header, contextLines}]}]}.")]
    public Task<string> GitDiffSummary(
        [Description("JSON array of absolute file paths to diff")] string file_paths,
        [Description("Absolute path to the git repository root")] string repo_root) =>
        ExecuteAsync("git_diff_summary", "git", new { file_paths, repo_root }, async () =>
        {
            if (string.IsNullOrWhiteSpace(repo_root)) return JsonOptions.Error("repo_root is required");
            var normalized = Path.GetFullPath(repo_root.Trim());
            if (!Directory.Exists(normalized)) return JsonOptions.Error($"repo_root not found: {normalized}");

            List<string> paths;
            try { paths = JsonSerializer.Deserialize<List<string>>(file_paths, JsonOptions.Default) ?? []; }
            catch { return JsonOptions.Error("file_paths must be a valid JSON array of strings"); }

            return JsonOptions.Serialize(await _git.GetDiffSummaryAsync(paths, normalized));
        });

    // ── git_move ───────────────────────────────────────────────────────────────

    [McpServerTool(Name = "git_move")]
    [Description("Moves or renames a file/directory with git mv, preserving git history. Replaces Bash(git mv ...). Returns {success, oldPath, newPath, error}.")]
    public Task<string> GitMove(
        [Description("Absolute source path (file or directory)")] string source,
        [Description("Absolute destination path")] string destination,
        [Description("Absolute git repository root (auto-detected from source directory if omitted)")] string? repo_root = null) =>
        ExecuteAsync("git_move", "git", new { source, destination, repo_root }, async () =>
        {
            if (string.IsNullOrWhiteSpace(source)) return JsonOptions.Error("source is required");
            if (string.IsNullOrWhiteSpace(destination)) return JsonOptions.Error("destination is required");

            var normalizedSource = Path.GetFullPath(source.Trim());
            var normalizedDest = Path.GetFullPath(destination.Trim());

            if (!File.Exists(normalizedSource) && !Directory.Exists(normalizedSource))
                return JsonOptions.Error($"source not found: {normalizedSource}");
            if (!_allowed.IsAllowed(normalizedSource))
                return JsonOptions.Error("path_not_allowed: source is not under an allowed directory");
            if (!_allowed.IsAllowed(normalizedDest))
                return JsonOptions.Error("path_not_allowed: destination is not under an allowed directory");

            var workDir = !string.IsNullOrWhiteSpace(repo_root)
                ? Path.GetFullPath(repo_root.Trim())
                : Path.GetDirectoryName(normalizedSource)!;

            if (!Directory.Exists(workDir))
                return JsonOptions.Error($"repo_root not found: {workDir}");

            var destDir = Path.GetDirectoryName(normalizedDest);
            if (!string.IsNullOrEmpty(destDir) && !Directory.Exists(destDir))
                Directory.CreateDirectory(destDir);

            var (_, stderr, exitCode) = await GitService.RunGitWithResultAsync(workDir, $"mv \"{normalizedSource}\" \"{normalizedDest}\"");

            if (exitCode != 0)
                return JsonSerializer.Serialize(new { success = false, oldPath = normalizedSource, newPath = normalizedDest, error = stderr.Trim() }, JsonOptions.Default);

            return JsonSerializer.Serialize(new { success = true, oldPath = normalizedSource, newPath = normalizedDest, error = (string?)null }, JsonOptions.Default);
        });

    // ── slice_test_targets ─────────────────────────────────────────────────────

    [McpServerTool(Name = "slice_test_targets")]
    [Description("Derives Angular spec globs and .NET test filters from changed file paths. Returns {angular:{includeGlobs, suggestedNgTestArgs}, dotnet:{testProjectPath, filter}}. stack: 'angular'|'dotnet'|'auto'.")]
    public Task<string> SliceTestTargets(
        [Description("JSON array of changed absolute file paths")] string changed_file_paths,
        [Description("Target stack: 'angular' | 'dotnet' | 'auto' (default)")] string stack = "auto") =>
        ExecuteAsync("slice_test_targets", "test", new { changed_file_paths, stack }, () =>
        {
            List<string> paths;
            try { paths = JsonSerializer.Deserialize<List<string>>(changed_file_paths, JsonOptions.Default) ?? []; }
            catch { return Task.FromResult(JsonOptions.Error("changed_file_paths must be a valid JSON array of strings")); }

            if (stack is not ("angular" or "dotnet" or "auto"))
                return Task.FromResult(JsonOptions.Error("stack must be 'angular', 'dotnet', or 'auto'"));

            return Task.FromResult(JsonOptions.Serialize(_slice.Slice(paths, stack)));
        });

    // ── helpers ────────────────────────────────────────────────────────────────

    private async Task<string> ExecuteAsync(string toolName, string source, object parameters, Func<Task<string>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramsJson = JsonSerializer.Serialize(parameters, JsonOptions.Default);
        var pendingId = _history.StartRecord(toolName, source, paramsJson);
        string output;
        try { output = await action(); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tool {Tool} failed", toolName);
            output = JsonOptions.Error(ex.Message);
        }
        sw.Stop();
        _history.Complete(pendingId, output, string.Empty, sw.ElapsedMilliseconds);
        _logger.LogInformation("=== {Tool} ({Duration}ms) ===", toolName, sw.ElapsedMilliseconds);
        return output;
    }
}
