using System.Text.RegularExpressions;
using Generic.Rtk.Models;

namespace Generic.Rtk.Filtering;

/// <summary>
/// dotnet restore output parser.
/// Extracts NuGet errors/warnings, restored project count, and duration.
/// </summary>
public sealed partial class DotnetRestoreParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.DotnetRestore;

    // Pattern: path/to/project.csproj : error NU1101 : Unable to find package ...
    [GeneratedRegex(@"^(?<file>.+?)\s*:\s*(?<sev>error|warning)\s+(?<code>NU\d+)\s*:\s*(?<msg>.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex NuGetDiagnostic();

    // Pattern: Restored /path/to/Project.csproj (in 1.23 s).
    [GeneratedRegex(@"^\s*Restored\s+.+\.csproj", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex RestoredProject();

    // Pattern: Time Elapsed 00:00:01.23
    [GeneratedRegex(@"Time Elapsed\s+(?<dur>[0-9:.]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex Duration();

    // Pattern: Restore failed / Restore succeeded
    [GeneratedRegex(@"Restore\s+(?<status>failed|succeeded)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex RestoreStatus();

    // Pattern: Nothing to do. None of the projects specified contain packages to restore.
    [GeneratedRegex(@"Nothing to do|All projects are up-to-date", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex NothingToDo();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var errors = new List<FilterDiagnostic>();
        var warnings = new List<FilterDiagnostic>();
        var rawKeep = new List<string>();
        var restoredCount = 0;

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            var nuget = NuGetDiagnostic().Match(t);
            if (nuget.Success)
            {
                var sev = nuget.Groups["sev"].Value.Equals("warning", StringComparison.OrdinalIgnoreCase)
                    ? FilterSeverity.Warning
                    : FilterSeverity.Error;
                var diag = new FilterDiagnostic
                {
                    Message = nuget.Groups["msg"].Value.Trim(),
                    File = nuget.Groups["file"].Value.Trim(),
                    Code = nuget.Groups["code"].Value.Trim(),
                    Severity = sev,
                    Source = "NuGet",
                    RawLine = t,
                };
                if (sev == FilterSeverity.Warning) warnings.Add(diag); else errors.Add(diag);
                rawKeep.Add(t);
                continue;
            }

            if (RestoredProject().IsMatch(t))
            {
                restoredCount++;
                continue; // Don't keep noise lines
            }

            if (RestoreStatus().IsMatch(t) || NothingToDo().IsMatch(t) || Duration().IsMatch(t))
            {
                rawKeep.Add(t);
            }
        }

        var duration = lines
            .Select(l => Duration().Match(l))
            .FirstOrDefault(m => m.Success)?.Groups["dur"].Value;

        var failed = errors.Count > 0 ||
                     normalizedText.Contains("Restore failed", StringComparison.OrdinalIgnoreCase);

        var summary = new FilterSummary
        {
            Status = failed ? "Failed" : "Succeeded",
            Errors = errors.Count,
            Warnings = warnings.Count,
            Total = restoredCount,
            Duration = duration,
        };

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = warnings,
            RawFiltered = string.Join("\n", rawKeep),
        };
    }
}
