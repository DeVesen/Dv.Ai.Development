using System.Text.RegularExpressions;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Filtering;

public sealed partial class VitestParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.Vitest;

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var failureMode = normalizedText.Contains("FAIL ", StringComparison.OrdinalIgnoreCase)
                          || normalizedText.Contains("AssertionError", StringComparison.OrdinalIgnoreCase)
                          || (normalizedText.Contains("failed", StringComparison.OrdinalIgnoreCase)
                              && normalizedText.Contains("Test Files", StringComparison.OrdinalIgnoreCase));

        var lines = normalizedText.Split('\n');
        var kept = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            if (IsVitestNoise(t, failureMode)) continue;

            if (failureMode && ShouldKeep(t)) kept.Add(t);
            if (!failureMode && IsSummaryLike(t)) kept.Add(t);
        }

        var summary = ParseSummary(normalizedText, failureMode);
        var errors = ExtractErrors(kept);

        var raw = failureMode
            ? string.Join("\n", kept)
            : kept.LastOrDefault(IsSummaryLike) ?? "Vitest completed successfully.";

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = raw.Trim(),
        };
    }

    private static bool IsVitestNoise(string t, bool failureMode)
    {
        if (t.StartsWith("stdout", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("stderr", StringComparison.OrdinalIgnoreCase) && !t.Contains("Error", StringComparison.OrdinalIgnoreCase)) return true;

        if (!failureMode)
        {
            if (t.StartsWith("✓", StringComparison.Ordinal)) return true;
            if (Regex.IsMatch(t, @"^\s*√\s")) return true;
        }

        if (IsGenericLogNoise(t)) return true;
        return false;
    }

    private static bool IsGenericLogNoise(string t)
    {
        var s = t.TrimStart();
        if (s.StartsWith("at ", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("Error:", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.Contains("AssertionError", StringComparison.OrdinalIgnoreCase)) return false;
        if (Regex.IsMatch(s, @"^Test Files\s+\d")) return false;
        if (Regex.IsMatch(s, @"^Tests\s+\d")) return false;
        if (Regex.IsMatch(s, @"^\s*Start at\b", RegexOptions.IgnoreCase)) return false;

        return !Regex.IsMatch(s, @"^(×|✓|✗|●|FAIL|PASS)") && !s.Contains("failed", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ShouldKeep(string t) =>
        t.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)
        || t.StartsWith("×", StringComparison.Ordinal)
        || t.Contains("AssertionError", StringComparison.OrdinalIgnoreCase)
        || t.Contains("Error:", StringComparison.OrdinalIgnoreCase)
        || t.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)
        || IsSummaryLike(t);

    private static bool IsSummaryLike(string t) =>
        Regex.IsMatch(t, @"^Test Files\s+", RegexOptions.IgnoreCase)
        || Regex.IsMatch(t, @"^Tests\s+", RegexOptions.IgnoreCase)
        || Regex.IsMatch(t, @"^Duration\s+", RegexOptions.IgnoreCase);

    private static FilterSummary ParseSummary(string text, bool failureMode)
    {
        var s = new FilterSummary { Status = failureMode ? "Failed" : "Passed" };

        var tf = Regex.Match(text, @"Test Files\s+(?<failed>\d+)\s+failed(?:\s+\((?<passed>\d+)\s+passed\))?", RegexOptions.IgnoreCase);
        if (tf.Success)
        {
            s.Failed = int.Parse(tf.Groups["failed"].Value);
            if (tf.Groups["passed"].Success) s.Passed = int.Parse(tf.Groups["passed"].Value);
        }

        var te = Regex.Match(text, @"Tests\s+(?<failed>\d+)\s+failed(?:\s+\((?<passed>\d+)\s+passed\))?", RegexOptions.IgnoreCase);
        if (te.Success)
        {
            s.Failed ??= int.Parse(te.Groups["failed"].Value);
            if (te.Groups["passed"].Success) s.Passed ??= int.Parse(te.Groups["passed"].Value);
        }

        var dur = Regex.Match(text, @"Duration\s+(?<d>[0-9.]+(?:ms|s))", RegexOptions.IgnoreCase);
        if (dur.Success) s.Duration = dur.Groups["d"].Value;

        s.Errors = s.Failed ?? (failureMode ? 1 : 0);
        return s;
    }

    private static List<FilterDiagnostic> ExtractErrors(List<string> kept)
    {
        var list = new List<FilterDiagnostic>();
        foreach (var t in kept)
        {
            if (!t.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase) && !t.StartsWith("×", StringComparison.Ordinal)) continue;
            list.Add(new FilterDiagnostic
            {
                Message = t.Trim(),
                Severity = FilterSeverity.Error,
                Source = "vitest",
                RawLine = t,
            });
        }

        return list;
    }
}
