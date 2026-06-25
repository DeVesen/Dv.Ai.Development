using System.Diagnostics;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

/// <summary>
/// Handles git_changed_files and git_diff_summary via shell git commands.
/// </summary>
public sealed class GitService
{
    // ── git_changed_files ──────────────────────────────────────────────────────

    public async Task<GitChangedFilesResult> GetChangedFilesAsync(string repoRoot, string @base)
    {
        string gitArgs;
        if (@base == "staged")
            gitArgs = "diff --cached --name-status";
        else if (@base == "unstaged")
            gitArgs = "diff --name-status";
        else if (@base == "all")
            gitArgs = "status --porcelain";
        else if (@base.StartsWith("branch:", StringComparison.OrdinalIgnoreCase))
        {
            var branchName = @base["branch:".Length..].Trim();
            gitArgs = $"diff --name-status {branchName}...HEAD";
        }
        else if (@base.StartsWith("commit:", StringComparison.OrdinalIgnoreCase))
        {
            var sha = @base["commit:".Length..].Trim();
            gitArgs = $"diff --name-status {sha}...HEAD";
        }
        else
        {
            return new GitChangedFilesResult([], repoRoot, @base);
        }

        var output = await RunGitAsync(repoRoot, gitArgs);
        var files = @base == "all"
            ? ParsePorcelain(output, repoRoot)
            : ParseNameStatus(output, repoRoot);

        return new GitChangedFilesResult(files, repoRoot, @base);
    }

    // ── git_diff_summary ───────────────────────────────────────────────────────

    public async Task<GitDiffSummaryResult> GetDiffSummaryAsync(IReadOnlyList<string> filePaths, string repoRoot)
    {
        var results = new List<FileDiffSummary>();

        foreach (var filePath in filePaths)
        {
            var relativePath = Path.IsPathRooted(filePath)
                ? Path.GetRelativePath(repoRoot, filePath).Replace('\\', '/')
                : filePath.Replace('\\', '/');

            var output = await RunGitAsync(repoRoot, $"diff HEAD -- \"{relativePath}\"");
            if (string.IsNullOrWhiteSpace(output))
                output = await RunGitAsync(repoRoot, $"diff --cached HEAD -- \"{relativePath}\"");

            var summary = ParseDiff(filePath, output);
            results.Add(summary);
        }

        return new GitDiffSummaryResult(results);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private static IReadOnlyList<GitChangedFile> ParseNameStatus(string output, string repoRoot)
    {
        var results = new List<GitChangedFile>();
        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            if (line.Length < 2) continue;
            var statusChar = line[0];
            var rest = line[1..].TrimStart('\t', ' ');
            var parts = rest.Split('\t');
            var relPath = parts.Length > 1 ? parts[^1] : parts[0];
            var fullPath = Path.IsPathRooted(relPath) ? relPath : Path.Combine(repoRoot, relPath);
            var status = MapStatus(statusChar);
            results.Add(new GitChangedFile(fullPath, status));
        }
        return results;
    }

    private static IReadOnlyList<GitChangedFile> ParsePorcelain(string output, string repoRoot)
    {
        var results = new List<GitChangedFile>();
        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            if (line.Length < 3) continue;
            var xy = line[..2];
            var relPath = line[3..].Trim();
            if (relPath.Contains(" -> "))
                relPath = relPath[(relPath.IndexOf(" -> ", StringComparison.Ordinal) + 4)..];
            var fullPath = Path.IsPathRooted(relPath) ? relPath : Path.Combine(repoRoot, relPath);
            var status = MapPorcelainStatus(xy);
            results.Add(new GitChangedFile(fullPath, status));
        }
        return results;
    }

    private static string MapStatus(char c) => c switch
    {
        'A' => "added",
        'D' => "deleted",
        'R' => "added",
        'C' => "added",
        _ => "modified",
    };

    private static string MapPorcelainStatus(string xy)
    {
        var x = xy[0]; var y = xy.Length > 1 ? xy[1] : ' ';
        if (x == '?' || y == '?') return "added";
        if (x == 'D' || y == 'D') return "deleted";
        if (x == 'A' || y == 'A') return "added";
        return "modified";
    }

    private static FileDiffSummary ParseDiff(string filePath, string output)
    {
        var added = 0; var removed = 0;
        var hunks = new List<DiffHunk>();

        if (string.IsNullOrWhiteSpace(output))
            return new FileDiffSummary(filePath, 0, 0, []);

        var lines = output.Split('\n');
        string? currentHeader = null;
        var contextLines = new List<string>();

        foreach (var line in lines)
        {
            if (line.StartsWith("@@", StringComparison.Ordinal))
            {
                if (currentHeader is not null)
                    hunks.Add(new DiffHunk(currentHeader, contextLines.Take(3).ToList()));
                currentHeader = line;
                contextLines = [];
            }
            else if (line.StartsWith('+') && !line.StartsWith("+++", StringComparison.Ordinal))
            {
                added++;
                if (contextLines.Count < 3) contextLines.Add(line);
            }
            else if (line.StartsWith('-') && !line.StartsWith("---", StringComparison.Ordinal))
            {
                removed++;
                if (contextLines.Count < 3) contextLines.Add(line);
            }
            else if (currentHeader is not null && contextLines.Count < 3)
            {
                contextLines.Add(line);
            }
        }

        if (currentHeader is not null)
            hunks.Add(new DiffHunk(currentHeader, contextLines.Take(3).ToList()));

        return new FileDiffSummary(filePath, added, removed, hunks);
    }

    private static readonly TimeSpan GitTimeout = TimeSpan.FromSeconds(15);

    internal static async Task<string> RunGitAsync(string workDir, string args)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "git", Arguments = args, WorkingDirectory = workDir,
                RedirectStandardOutput = true, RedirectStandardError = true,
                UseShellExecute = false, CreateNoWindow = true,
            };
            using var proc = new Process { StartInfo = psi };
            if (!proc.Start()) return string.Empty;
            using var cts = new CancellationTokenSource(GitTimeout);
            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);
            try { await proc.WaitForExitAsync(cts.Token); }
            catch (OperationCanceledException) { try { proc.Kill(entireProcessTree: true); } catch { } return string.Empty; }
            return await stdoutTask;
        }
        catch { return string.Empty; }
    }

    internal static async Task<(string stdout, string stderr, int exitCode)> RunGitWithResultAsync(string workDir, string args)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "git", Arguments = args, WorkingDirectory = workDir,
                RedirectStandardOutput = true, RedirectStandardError = true,
                UseShellExecute = false, CreateNoWindow = true,
            };
            using var proc = new Process { StartInfo = psi };
            if (!proc.Start()) return (string.Empty, "Failed to start git process", -1);
            using var cts = new CancellationTokenSource(GitTimeout);
            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);
            try { await proc.WaitForExitAsync(cts.Token); }
            catch (OperationCanceledException) { try { proc.Kill(entireProcessTree: true); } catch { } return (string.Empty, "git timeout", -1); }
            return (await stdoutTask, await stderrTask, proc.ExitCode);
        }
        catch (Exception ex) { return (string.Empty, ex.Message, -1); }
    }
}
