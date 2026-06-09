using System.Text;
using System.Text.RegularExpressions;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Filtering;

/// <summary>
/// dotnet test / vstest / xUnit style output.
/// </summary>
public sealed partial class DotnetTestParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.DotnetTest;

    [GeneratedRegex(@"Failed!\s+-\s+Failed:\s*(?<failed>\d+),\s*Passed:\s*(?<passed>\d+)(?:,\s*Skipped:\s*(?<skipped>\d+))?(?:,\s*Total:\s*(?<total>\d+))?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FailedFooter();

    [GeneratedRegex(@"Passed!\s+-\s+Failed:\s*(?<failed>\d+),\s*Passed:\s*(?<passed>\d+)(?:,\s*Skipped:\s*(?<skipped>\d+))?(?:,\s*Total:\s*(?<total>\d+))?", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex PassedFooter();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var failureMode = normalizedText.Contains("Failed!", StringComparison.OrdinalIgnoreCase)
                          || normalizedText.Contains("[FAIL]", StringComparison.OrdinalIgnoreCase)
                          || normalizedText.Contains("Test Run Failed.", StringComparison.OrdinalIgnoreCase);

        var lines = normalizedText.Split('\n');
        var kept = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            if (IsNoiseLine(t))
                continue;

            if (!failureMode && IsProbablyPassOnlyLine(t))
                continue;

            if (ShouldKeep(t, failureMode))
                kept.Add(t);
        }

        var summaryLine = lines.LastOrDefault(l =>
            l.Contains("Failed!", StringComparison.OrdinalIgnoreCase) ||
            l.Contains("Passed!", StringComparison.OrdinalIgnoreCase) ||
            l.Contains("Total tests:", StringComparison.OrdinalIgnoreCase));

        var summary = ParseSummary(normalizedText, summaryLine, failureMode);

        var (errors, _) = ExtractFailures(normalizedText, kept);

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = failureMode
                ? string.Join("\n", kept)
                : ((summary.Skipped > 0 || summary.Failed > 0) ? (summaryLine?.Trim() ?? string.Empty) : string.Empty),
        };
    }

    private static bool IsNoiseLine(string t)
    {
        if (t.StartsWith("Starting test execution", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("A total of", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("Waiting for", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Microsoft (R) Test Execution Command Line Tool", StringComparison.Ordinal)) return true;
        if (t.Contains("Copyright (c) Microsoft Corporation", StringComparison.Ordinal)) return true;
        return false;
    }

    private static bool IsProbablyPassOnlyLine(string t) =>
        t.Contains("Passed ", StringComparison.OrdinalIgnoreCase) && !t.Contains("Failed", StringComparison.OrdinalIgnoreCase);

    private static bool ShouldKeep(string t, bool failureMode)
    {
        if (t.Contains("[FAIL]", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("Failed!", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Stack Trace", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Assert.", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Expected:", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Actual:", StringComparison.OrdinalIgnoreCase)) return true;
            if (t.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)) return true;
            if (Regex.IsMatch(t, @"\]\s+at\s+", RegexOptions.IgnoreCase)) return true;
        if (t.Contains("--- End of stack trace", StringComparison.OrdinalIgnoreCase)) return true;
        if (failureMode && t.Contains("Error Message:", StringComparison.OrdinalIgnoreCase)) return true;
        if (failureMode && Regex.IsMatch(t, @"\]\s+.+Exception")) return true;
        return failureMode && t.Contains(" Xunit", StringComparison.OrdinalIgnoreCase);
    }

    private static FilterSummary ParseSummary(string full, string? summaryLine, bool failureMode)
    {
        FilterSummary s = new() { Status = failureMode ? "Failed" : "Passed" };

        var mf = FailedFooter().Match(full);
        var mp = PassedFooter().Match(full);
        var m = mf.Success ? mf : mp;
        if (m.Success)
        {
            s.Failed = int.Parse(m.Groups["failed"].Value);
            s.Passed = int.Parse(m.Groups["passed"].Value);
            if (m.Groups["skipped"].Success) s.Skipped = int.Parse(m.Groups["skipped"].Value);
            if (m.Groups["total"].Success) s.TotalTests = int.Parse(m.Groups["total"].Value);
        }

        var totalTests = Regex.Match(full, @"Total tests:\s*(?<n>\d+)", RegexOptions.IgnoreCase);
        if (totalTests.Success) s.TotalTests = int.Parse(totalTests.Groups["n"].Value);

        if (summaryLine != null && s.Duration is null)
        {
            var dur = Regex.Match(summaryLine, @"Duration:\s*(?<d>[0-9.]+[^\s,]*)", RegexOptions.IgnoreCase);
            if (dur.Success) s.Duration = dur.Groups["d"].Value.Trim();
        }

        s.Errors = s.Failed ?? (failureMode ? 1 : 0);
        return s;
    }

    private static (List<FilterDiagnostic> errors, List<string> raw) ExtractFailures(string normalizedText, List<string> kept)
    {
        var errors = new List<FilterDiagnostic>();
        if (kept.Count == 0) return (errors, kept);

        var sb = new StringBuilder();
        foreach (var line in kept)
        {
            if (line.Contains("[FAIL]", StringComparison.OrdinalIgnoreCase))
            {
                TryFlush(sb, errors);
                sb.AppendLine(line);
                continue;
            }

            if (sb.Length > 0 || line.Contains("Stack Trace", StringComparison.OrdinalIgnoreCase) ||
                line.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("Assert.", StringComparison.OrdinalIgnoreCase))
            {
                sb.AppendLine(line);
            }
        }

        TryFlush(sb, errors);
        return (errors, kept);

        static void TryFlush(StringBuilder sb, List<FilterDiagnostic> errors)
        {
            if (sb.Length == 0) return;
            var block = sb.ToString().Trim();
            sb.Clear();
            if (string.IsNullOrEmpty(block)) return;

            var lines = block.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var messageLine = lines.FirstOrDefault(l => l.Contains("[FAIL]", StringComparison.OrdinalIgnoreCase))
                              ?? lines.FirstOrDefault() ?? block;
            var msg = Regex.Replace(messageLine, @"^\[.*?\]\s*", "");
            var stackLines = lines.Where(l =>
                l.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase) ||
                Regex.IsMatch(l, @"\]\s+at\s+", RegexOptions.IgnoreCase)).ToList();
            var stack = stackLines.Count > 0 ? string.Join("\n", stackLines) : null;

            errors.Add(new FilterDiagnostic
            {
                Message = msg,
                Severity = FilterSeverity.Error,
                Source = "dotnet test",
                StackTrace = stack,
                RawLine = block,
            });
        }
    }
}
