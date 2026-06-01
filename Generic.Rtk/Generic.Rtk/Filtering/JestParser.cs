using System.Text.RegularExpressions;
using Generic.Rtk.Models;

namespace Generic.Rtk.Filtering;

public sealed partial class JestParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.Jest;

    [GeneratedRegex(@"Test Suites:\s*(?<failed>\d+)\s*failed", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex SuiteFailed();

    [GeneratedRegex(@"Tests:\s*(?<failed>\d+)\s*failed", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex TestsFailed();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var failureMode = SuiteFailed().IsMatch(normalizedText) || TestsFailed().IsMatch(normalizedText)
                                                                 || normalizedText.Contains("FAIL ", StringComparison.OrdinalIgnoreCase);

        var lines = normalizedText.Split('\n');
        var kept = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;
            if (IsJestNoise(t, failureMode)) continue;

            if (failureMode && ShouldKeepFailure(t)) kept.Add(t);
            if (!failureMode && IsSummaryLine(t)) kept.Add(t);
        }

        var summary = new FilterSummary { Status = failureMode ? "Failed" : "Passed" };
        ParseCounts(normalizedText, summary);

        var errors = ExtractErrors(kept);

        var rawFiltered = failureMode
            ? string.Join("\n", kept)
            : kept.FirstOrDefault(IsSummaryLine) ?? "Jest run completed successfully.";

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = rawFiltered.Trim(),
        };
    }

    private static bool IsJestNoise(string t, bool failureMode)
    {
        if (!failureMode)
        {
            if (t.StartsWith("PASS ", StringComparison.OrdinalIgnoreCase)) return true;
            if (t.StartsWith("✓", StringComparison.Ordinal)) return true;
        }

        if (t.StartsWith("  console.", StringComparison.OrdinalIgnoreCase)) return true;

        if (IsTestLogNoise(t)) return true;

        return false;
    }

    private static bool IsTestLogNoise(string t)
    {
        var s = t.TrimStart();
        if (s.Length == 0) return true;
        if (s.StartsWith("at ", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("PASS ", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("● ", StringComparison.Ordinal)) return false;
        if (s.StartsWith("×", StringComparison.Ordinal)) return false;
        if (s.StartsWith("✓", StringComparison.Ordinal)) return false;
        if (s.StartsWith("Tests:", StringComparison.OrdinalIgnoreCase)) return false;
        if (s.StartsWith("Test Suites:", StringComparison.OrdinalIgnoreCase)) return false;

        return true;
    }

    private static bool ShouldKeepFailure(string t) =>
        t.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)
        || t.StartsWith("● ", StringComparison.Ordinal)
        || t.StartsWith("×", StringComparison.Ordinal)
        || t.Contains("AssertionError", StringComparison.OrdinalIgnoreCase)
        || t.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)
        || IsSummaryLine(t);

    private static bool IsSummaryLine(string t) =>
        t.StartsWith("Test Suites:", StringComparison.OrdinalIgnoreCase) || t.StartsWith("Tests:", StringComparison.OrdinalIgnoreCase);

    private static void ParseCounts(string text, FilterSummary s)
    {
        var m = Regex.Match(text, @"Tests:\s*(?<failed>\d+)\s*failed,\s*(?<passed>\d+)\s*passed", RegexOptions.IgnoreCase);
        if (m.Success)
        {
            s.Failed = int.Parse(m.Groups["failed"].Value);
            s.Passed = int.Parse(m.Groups["passed"].Value);
        }

        var dur = Regex.Match(text, @"Time:\s*(?<d>[^\n]+)", RegexOptions.IgnoreCase);
        if (dur.Success) s.Duration = dur.Groups["d"].Value.Trim();

        s.Errors = s.Failed ?? 0;
    }

    private static List<FilterDiagnostic> ExtractErrors(List<string> kept)
    {
        var errors = new List<FilterDiagnostic>();
        foreach (var line in kept)
        {
            if (!line.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)) continue;
            errors.Add(new FilterDiagnostic
            {
                Message = line.Trim(),
                Severity = FilterSeverity.Error,
                Source = "jest",
                RawLine = line,
            });
        }

        return errors;
    }
}
