using System.Text;
using System.Text.RegularExpressions;
using Generic.Rtk.Models;

namespace Generic.Rtk.Filtering;

/// <summary>
/// MSBuild / dotnet build output.
/// </summary>
public sealed partial class DotnetBuildParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.DotnetBuild;

    [GeneratedRegex(@"^(?<file>.+?)\((?<line>\d+)(?:,(?<col>\d+))?\)\s*:\s*(?<sev>error|warning)\s+(?<code>[^\s:]+)\s*:\s*(?<msg>.*)$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex MsbuildDiagnostic();

    [GeneratedRegex(@"^(?<sev>error|warning)\s+(?<code>[^\s:]+)\s*:\s*(?<msg>.*)$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex BareDiagnostic();

    [GeneratedRegex(@"^\s*(?<count>\d+)\s+Error\(s\)\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ErrorSummary();

    [GeneratedRegex(@"^\s*(?<count>\d+)\s+Warning\(s\)\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex WarningSummary();

    [GeneratedRegex(@"^\d+>", RegexOptions.Compiled)]
    private static partial Regex StreamPrefix();

    [GeneratedRegex(@"Errors:\s*(?<count>\d+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex RiderErrorCount();

    [GeneratedRegex(@"Warnings:\s*(?<count>\d+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex RiderWarningCount();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var errors = new List<FilterDiagnostic>();
        var warnings = new List<FilterDiagnostic>();
        var rawKeep = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            var stripped = StripStreamPrefix(t);

            if (stripped.Contains("Build succeeded", StringComparison.OrdinalIgnoreCase) ||
                stripped.Contains("Build FAILED", StringComparison.OrdinalIgnoreCase) ||
                stripped.Contains("Time Elapsed", StringComparison.OrdinalIgnoreCase))
            {
                rawKeep.Add(stripped);
                continue;
            }

            var m = MsbuildDiagnostic().Match(stripped);
            if (m.Success)
            {
                var sev = m.Groups["sev"].Value.Equals("warning", StringComparison.OrdinalIgnoreCase)
                    ? FilterSeverity.Warning
                    : FilterSeverity.Error;
                var diag = new FilterDiagnostic
                {
                    Message = m.Groups["msg"].Value.Trim(),
                    File = m.Groups["file"].Value.Trim(),
                    Line = int.TryParse(m.Groups["line"].Value, out var ln) ? ln : null,
                    Column = int.TryParse(m.Groups["col"].Value, out var col) ? col : null,
                    Code = m.Groups["code"].Value.Trim(),
                    Severity = sev,
                    Source = "MSBuild",
                    RawLine = stripped,
                };
                if (sev == FilterSeverity.Warning) warnings.Add(diag); else errors.Add(diag);
                rawKeep.Add(stripped);
                continue;
            }

            var b = BareDiagnostic().Match(stripped);
            if (b.Success && (stripped.Contains("error", StringComparison.OrdinalIgnoreCase) || stripped.Contains("warning", StringComparison.OrdinalIgnoreCase)))
            {
                var sev = b.Groups["sev"].Value.Equals("warning", StringComparison.OrdinalIgnoreCase)
                    ? FilterSeverity.Warning
                    : FilterSeverity.Error;
                var diag = new FilterDiagnostic
                {
                    Message = b.Groups["msg"].Value.Trim(),
                    Code = b.Groups["code"].Value.Trim(),
                    Severity = sev,
                    Source = "MSBuild",
                    RawLine = stripped,
                };
                if (sev == FilterSeverity.Warning) warnings.Add(diag); else errors.Add(diag);
                rawKeep.Add(stripped);
            }
        }

        var errorCount = errors.Count;
        var warnCount = warnings.Count;

        foreach (var line in lines)
        {
            var stripped = StripStreamPrefix(line);
            var m = ErrorSummary().Match(stripped);
            if (m.Success && int.TryParse(m.Groups["count"].Value, out var c)) errorCount = c;
            m = WarningSummary().Match(stripped);
            if (m.Success && int.TryParse(m.Groups["count"].Value, out var w2)) warnCount = w2;

            var re = RiderErrorCount().Match(stripped);
            if (re.Success && int.TryParse(re.Groups["count"].Value, out var rc)) errorCount = rc;
            var rw = RiderWarningCount().Match(stripped);
            if (rw.Success && int.TryParse(rw.Groups["count"].Value, out var rwc)) warnCount = rwc;
        }

        var status = normalizedText.Contains("Build FAILED", StringComparison.OrdinalIgnoreCase) ||
                     normalizedText.Contains("Succeeded: False", StringComparison.OrdinalIgnoreCase) ||
                     errors.Count > 0
            ? "Failed"
            : "Succeeded";

        var summary = new FilterSummary
        {
            Status = status,
            Errors = errorCount,
            Warnings = warnCount,
        };

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = warnings,
            RawFiltered = string.Join("\n", rawKeep),
        };
    }

    private static string StripStreamPrefix(string line)
    {
        return StreamPrefix().Replace(line, "", 1);
    }
}
