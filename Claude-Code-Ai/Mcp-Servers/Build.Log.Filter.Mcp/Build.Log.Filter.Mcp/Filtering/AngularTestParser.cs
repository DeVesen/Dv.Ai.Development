using System.Text.RegularExpressions;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Filtering;

/// <summary>
/// Angular test output (Jest/Karma-ish).
/// </summary>
public sealed partial class AngularTestParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.NgTest;

    [GeneratedRegex(@"Test Suites:\s*(?<failed>\d+)\s*failed(?:,\s*(?<passed>\d+)\s*passed)?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex JestSuiteSummary();

    [GeneratedRegex(@"Tests:\s*(?<failed>\d+)\s*failed(?:,\s*(?<passed>\d+)\s*passed)?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex JestTestsSummary();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var kept = new List<string>();
        var failureMode = normalizedText.Contains("FAIL ", StringComparison.OrdinalIgnoreCase)
                          || normalizedText.Contains("FAILED", StringComparison.OrdinalIgnoreCase)
                          || normalizedText.Contains("×", StringComparison.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;
            if (IsNoise(t)) continue;
            if (!failureMode && IsPassNoise(t)) continue;

            if (ShouldKeep(t, failureMode))
                kept.Add(t);
        }

        var summary = ParseSummary(normalizedText, failureMode);
        var errors = ExtractFailures(kept);

        var raw = failureMode
            ? string.Join("\n", kept)
            : JestTestsSummary().IsMatch(normalizedText) || JestSuiteSummary().IsMatch(normalizedText)
                ? FirstMatchingSummaryLine(lines) ?? "Angular tests completed successfully."
                : "Angular tests completed successfully.";

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = raw.Trim(),
        };
    }

    private static bool IsNoise(string t)
    {
        var l = t.ToLowerInvariant();
        if (l.StartsWith("chunk ")) return true;
        if (Regex.IsMatch(t, @"^\s*\d+%")) return true;
        if (l.Contains("webpack")) return true;
        if (l.StartsWith("> ng test")) return true;
        return false;
    }

    private static bool IsPassNoise(string t) =>
        t.StartsWith("✓", StringComparison.Ordinal)
        || t.StartsWith("PASS ", StringComparison.OrdinalIgnoreCase)
        || t.Contains("Executed ", StringComparison.OrdinalIgnoreCase) && t.Contains("of", StringComparison.OrdinalIgnoreCase);

    private static bool ShouldKeep(string t, bool failureMode)
    {
        if (t.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("● ", StringComparison.Ordinal)) return true;
        if (t.StartsWith("×", StringComparison.Ordinal)) return true;
        if (t.Contains("Error:", StringComparison.OrdinalIgnoreCase) && failureMode) return true;
        if (t.Contains("Expected ", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Received ", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Chrome", StringComparison.OrdinalIgnoreCase) && t.Contains("ERROR", StringComparison.OrdinalIgnoreCase)) return true;
        if (Regex.IsMatch(t, @"\bFAILED\b") && failureMode) return true;
        if (JestSuiteSummary().IsMatch(t) || JestTestsSummary().IsMatch(t)) return true;
        return false;
    }

    private static FilterSummary ParseSummary(string normalizedText, bool failureMode)
    {
        var s = new FilterSummary { Status = failureMode ? "Failed" : "Passed" };

        var jt = JestTestsSummary().Match(normalizedText);
        if (jt.Success)
        {
            s.Failed = int.Parse(jt.Groups["failed"].Value);
            if (jt.Groups["passed"].Success) s.Passed = int.Parse(jt.Groups["passed"].Value);
        }

        var js = JestSuiteSummary().Match(normalizedText);
        if (js.Success)
        {
            s.Failed ??= int.Parse(js.Groups["failed"].Value);
            if (js.Groups["passed"].Success) s.Passed ??= int.Parse(js.Groups["passed"].Value);
        }

        var dur = Regex.Match(normalizedText, @"Time:\s*(?<d>[^\n]+)", RegexOptions.IgnoreCase);
        if (dur.Success) s.Duration = dur.Groups["d"].Value.Trim();

        var karma = Regex.Match(normalizedText, @"TOTAL:\s*(?<total>\d+)\s+SUCCESS,\s*(?<failed>\d+)\s+FAIL", RegexOptions.IgnoreCase);
        if (karma.Success)
        {
            s.TotalTests = int.Parse(karma.Groups["total"].Value) + int.Parse(karma.Groups["failed"].Value);
            s.Passed = int.Parse(karma.Groups["total"].Value);
            s.Failed = int.Parse(karma.Groups["failed"].Value);
        }

        s.Errors = s.Failed ?? (failureMode ? 1 : 0);
        return s;
    }

    private static List<FilterDiagnostic> ExtractFailures(List<string> kept)
    {
        var errors = new List<FilterDiagnostic>();
        var block = new List<string>();
        foreach (var line in kept)
        {
            if (line.StartsWith("● ", StringComparison.Ordinal) || line.StartsWith("×", StringComparison.Ordinal)
                || line.StartsWith("FAIL ", StringComparison.OrdinalIgnoreCase))
            {
                Flush(block, errors);
                block.Add(line);
            }
            else if (block.Count > 0)
            {
                block.Add(line);
            }
        }

        Flush(block, errors);
        return errors;

        static void Flush(List<string> block, List<FilterDiagnostic> errors)
        {
            if (block.Count == 0) return;
            var msg = string.Join("\n", block);
            var stacks = block.Where(l => l.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)).ToList();
            errors.Add(new FilterDiagnostic
            {
                Message = block[0].Trim(),
                Severity = FilterSeverity.Error,
                Source = "ng test",
                StackTrace = stacks.Count > 0 ? string.Join("\n", stacks) : null,
                RawLine = msg,
            });
            block.Clear();
        }
    }

    private static string? FirstMatchingSummaryLine(string[] lines) =>
        lines.LastOrDefault(l => JestSuiteSummary().IsMatch(l) || JestTestsSummary().IsMatch(l));
}
