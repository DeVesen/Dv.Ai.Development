using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

/// <summary>
/// Handles apply_text_patch: line-range replacement and anchor-based replacement.
/// </summary>
public sealed class PatchService
{
    // ── public API ─────────────────────────────────────────────────────────────

    /// <summary>Anchor-based patch (old_text → new_text).</summary>
    public ApplyPatchResult ApplyAnchorPatch(
        string filePath, string oldText, string newText,
        bool runCompilerGate, bool dryRun, bool rollbackOnError)
    {
        var content = File.ReadAllText(filePath);

        var firstIdx = content.IndexOf(oldText, StringComparison.Ordinal);
        if (firstIdx < 0)
            return Fail(filePath, "anchor_not_found: old_text not found in file", dryRun);

        var secondIdx = content.IndexOf(oldText, firstIdx + 1, StringComparison.Ordinal);
        if (secondIdx >= 0)
            return Fail(filePath, "ambiguous_anchor: old_text appears more than once", dryRun);

        var original = content;
        var patched = content[..firstIdx] + newText + content[(firstIdx + oldText.Length)..];

        var oldLineCount = oldText.Count(c => c == '\n') + 1;
        var newLineCount = newText.Count(c => c == '\n') + 1;
        var linesChanged = Math.Abs(newLineCount - oldLineCount);

        return CommitPatch(filePath, original, patched, linesChanged, "anchor", runCompilerGate, dryRun, rollbackOnError);
    }

    /// <summary>Line-range patch (replaces lines start_line..end_line with new_text).</summary>
    public ApplyPatchResult ApplyLinePatch(
        string filePath, int startLine, int endLine, string newText,
        bool runCompilerGate, bool dryRun, bool rollbackOnError)
    {
        var allLines = File.ReadAllLines(filePath);
        var total = allLines.Length;

        var start = Math.Clamp(startLine, 1, total);
        var end = Math.Clamp(endLine, start, total);

        var before = allLines[..(start - 1)];
        var after = allLines[end..];
        var newLines = newText.Split('\n').Select(l => l.TrimEnd('\r')).ToArray();

        var patched = string.Join(Environment.NewLine, before.Concat(newLines).Concat(after));
        var original = string.Join(Environment.NewLine, allLines);

        var linesChanged = Math.Abs(newLines.Length - (end - start + 1));

        return CommitPatch(filePath, original, patched, linesChanged, "line_range", runCompilerGate, dryRun, rollbackOnError);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private static ApplyPatchResult CommitPatch(
        string filePath, string original, string patched,
        int linesChanged, string mode,
        bool runCompilerGate, bool dryRun, bool rollbackOnError)
    {
        if (dryRun)
            return new ApplyPatchResult(true, filePath, linesChanged, mode, true, null, null);

        File.WriteAllText(filePath, patched);

        CompilerGateResult? gateResult = null;
        if (runCompilerGate && ShouldRunGate(filePath))
        {
            gateResult = RunCompilerGate(filePath);
            if (!gateResult.Ran || gateResult.ErrorCount > 0)
            {
                if (rollbackOnError)
                {
                    File.WriteAllText(filePath, original);
                }
                return new ApplyPatchResult(false, filePath, linesChanged, mode, false, gateResult,
                    $"compiler_gate_failed: {gateResult.ErrorCount} error(s)");
            }
        }

        return new ApplyPatchResult(true, filePath, linesChanged, mode, false, gateResult, null);
    }

    private static bool ShouldRunGate(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext is ".cs" or ".ts";
    }

    private static CompilerGateResult RunCompilerGate(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        var workDir = Path.GetDirectoryName(filePath) ?? ".";

        if (ext == ".cs")
        {
            var csproj = FindNearestCsproj(workDir);
            if (csproj is null)
                return new CompilerGateResult(false, 0, ["No .csproj found near file"]);

            return RunProcess("dotnet", $"build \"{csproj}\" --no-restore -v quiet", Path.GetDirectoryName(csproj)!);
        }
        else // .ts
        {
            return RunProcess("tsc", "--noEmit", workDir);
        }
    }

    private static string? FindNearestCsproj(string startDir)
    {
        var dir = startDir;
        for (var i = 0; i < 8; i++)
        {
            if (dir is null) break;
            var found = Directory.GetFiles(dir, "*.csproj", SearchOption.TopDirectoryOnly).FirstOrDefault();
            if (found is not null) return found;
            dir = Directory.GetParent(dir)?.FullName;
        }
        return null;
    }

    private static CompilerGateResult RunProcess(string exe, string args, string workDir)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = exe, Arguments = args, WorkingDirectory = workDir,
                RedirectStandardOutput = true, RedirectStandardError = true,
                UseShellExecute = false, CreateNoWindow = true,
            };
            using var proc = new Process { StartInfo = psi };
            if (!proc.Start()) return new CompilerGateResult(false, 0, ["Failed to start compiler process"]);

            var stdout = proc.StandardOutput.ReadToEnd();
            var stderr = proc.StandardError.ReadToEnd();
            proc.WaitForExit();

            var output = (stdout + "\n" + stderr).Trim();
            var errorLines = output.Split('\n')
                .Where(l => Regex.IsMatch(l, @"error\s+[A-Z]+\d+:|error TS\d+:", RegexOptions.IgnoreCase))
                .Select(l => l.Trim())
                .Where(l => l.Length > 0)
                .Distinct()
                .Take(20)
                .ToList();

            return new CompilerGateResult(true, errorLines.Count, errorLines);
        }
        catch (Exception ex)
        {
            return new CompilerGateResult(false, 0, [$"Compiler gate error: {ex.Message}"]);
        }
    }

    private static ApplyPatchResult Fail(string filePath, string error, bool dryRun) =>
        new(false, filePath, 0, "unknown", dryRun, null, error);
}
