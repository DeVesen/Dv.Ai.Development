using System.Text;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

/// <summary>
/// Handles apply_text_patch: line-range replacement and anchor-based replacement.
/// </summary>
public sealed class PatchService
{
    // ── public API ─────────────────────────────────────────────────────────────

    /// <summary>Anchor-based patch (old_text → new_text). EOL-agnostic match; preserves the file's original EOL.</summary>
    public async Task<ApplyPatchResult> ApplyAnchorPatchAsync(
        string filePath, string oldText, string newText,
        bool runCompilerGate, bool dryRun, bool rollbackOnError)
    {
        var raw = File.ReadAllText(filePath);

        // Match in LF space so a \n-joined anchor matches \r\n content, keeping a
        // map from each LF-space index back to its raw offset.
        var (rawLf, map) = NormalizeWithMap(raw);
        var anchorLf = oldText.Replace("\r\n", "\n");

        var firstLf = rawLf.IndexOf(anchorLf, StringComparison.Ordinal);
        if (firstLf < 0)
            return Fail(filePath, "anchor_not_found: old_text not found in file", dryRun);

        var secondLf = rawLf.IndexOf(anchorLf, firstLf + 1, StringComparison.Ordinal);
        if (secondLf >= 0)
            return Fail(filePath, "ambiguous_anchor: old_text appears more than once", dryRun);

        // Map the matched LF span back to raw offsets. rawEnd is one past the LAST
        // matched char (map[last] + 1) — NOT map[firstLf + len], which would swallow
        // a trailing '\r' at a CRLF boundary.
        var rawStart = map[firstLf];
        var lastLf = firstLf + anchorLf.Length - 1;
        var rawEnd = map[lastLf] + 1;

        var dominantEol = DominantEol(raw);
        var newTextEol = ToEol(newText, dominantEol);
        var patched = raw[..rawStart] + newTextEol + raw[rawEnd..];

        var oldLineCount = oldText.Count(c => c == '\n') + 1;
        var newLineCount = newText.Count(c => c == '\n') + 1;
        var linesChanged = Math.Abs(newLineCount - oldLineCount);

        return await CommitPatchAsync(filePath, raw, patched, linesChanged, "anchor", runCompilerGate, dryRun, rollbackOnError);
    }

    /// <summary>Line-range patch (replaces lines start_line..end_line with new_text).</summary>
    public async Task<ApplyPatchResult> ApplyLinePatchAsync(
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

        return await CommitPatchAsync(filePath, original, patched, linesChanged, "line_range", runCompilerGate, dryRun, rollbackOnError);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    // Returns an LF-normalized copy of raw plus a map: map[i] = raw offset of the
    // i-th char of the LF-normalized string. Only the '\r' of each "\r\n" pair is
    // dropped; lone '\r' and lone '\n' are preserved.
    private static (string lf, int[] map) NormalizeWithMap(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        var map = new int[raw.Length];
        var n = 0;
        for (var i = 0; i < raw.Length; i++)
        {
            if (raw[i] == '\r' && i + 1 < raw.Length && raw[i + 1] == '\n')
                continue; // drop CR of CRLF; the following LF is emitted next iteration
            map[n] = i;
            sb.Append(raw[i]);
            n++;
        }
        var trimmed = new int[n];
        Array.Copy(map, trimmed, n);
        return (sb.ToString(), trimmed);
    }

    // Dominant EOL by frequency; defaults to "\n" for a file with no newline.
    private static string DominantEol(string raw)
    {
        var crlf = 0;
        for (var i = 0; i + 1 < raw.Length; i++)
            if (raw[i] == '\r' && raw[i + 1] == '\n') crlf++;
        var lfOnly = raw.Count(c => c == '\n') - crlf;
        if (crlf == 0 && lfOnly == 0) return "\n";
        // Tie (equal non-zero counts) resolves to CRLF.
        return crlf >= lfOnly ? "\r\n" : "\n";
    }

    // Rewrites text to the given EOL style (normalize to LF first, then expand).
    private static string ToEol(string text, string eol)
    {
        var lf = text.Replace("\r\n", "\n");
        return eol == "\n" ? lf : lf.Replace("\n", "\r\n");
    }

    private static async Task<ApplyPatchResult> CommitPatchAsync(
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
            gateResult = await RunCompilerGateAsync(filePath);
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

    private static async Task<CompilerGateResult> RunCompilerGateAsync(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        var workDir = Path.GetDirectoryName(filePath) ?? ".";

        if (ext == ".cs")
        {
            var csproj = FindNearestCsproj(workDir);
            if (csproj is null)
                return new CompilerGateResult(false, 0, ["No .csproj found near file"]);

            return await RunGateAsync("dotnet", $"build \"{csproj}\" --no-restore -v quiet", Path.GetDirectoryName(csproj)!);
        }
        else // .ts
        {
            return await RunGateAsync("tsc", "--noEmit", workDir);
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

    // Runs the compiler through the shared ProcessRunner: full-path resolution (so a
    // bare tsc.cmd/ng.cmd wrapper is launched correctly on Windows instead of
    // misresolving its %~dp0) and an exit code captured independently of stdout/stderr
    // drain (a lingering child can no longer force a false timeout).
    private static async Task<CompilerGateResult> RunGateAsync(string exe, string args, string workDir)
    {
        ProcessRunResult run;
        try
        {
            run = await ProcessRunner.RunAsync(exe, args, workDir, timeoutSeconds: 60);
        }
        catch (Exception ex)
        {
            return new CompilerGateResult(false, 0, [$"Compiler gate error: {ex.Message}"]);
        }

        if (run.TimedOut)
            return new CompilerGateResult(false, 0, ["compiler gate timeout"]);

        // Pass/fail policy unchanged: the gate is driven by parsed compiler errors,
        // not the raw exit code — preserving the existing CompilerGateResult contract.
        var output = (run.Stdout + "\n" + run.Stderr).Trim();
        var errorLines = output.Split('\n')
            .Where(l => Regex.IsMatch(l, @"error\s+[A-Z]+\d+:|error TS\d+:", RegexOptions.IgnoreCase))
            .Select(l => l.Trim())
            .Where(l => l.Length > 0)
            .Distinct()
            .Take(20)
            .ToList();

        return new CompilerGateResult(true, errorLines.Count, errorLines);
    }

    private static ApplyPatchResult Fail(string filePath, string error, bool dryRun) =>
        new(false, filePath, 0, "unknown", dryRun, null, error);
}
