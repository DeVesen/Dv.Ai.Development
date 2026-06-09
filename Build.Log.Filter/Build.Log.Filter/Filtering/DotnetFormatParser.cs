using System.Text.RegularExpressions;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Filtering;

/// <summary>
/// dotnet format --verify-no-changes output parser.
/// Extracts files needing formatting and diagnostic IDs.
/// </summary>
public sealed partial class DotnetFormatParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.DotnetFormat;

    // Pattern: /path/to/File.cs(42,17): warning IDE0055: Fix formatting
    [GeneratedRegex(@"^(?<file>.+?)\((?<line>\d+),(?<col>\d+)\)\s*:\s*(?<sev>warning|error)\s+(?<code>\w+)\s*:\s*(?<msg>.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FormatDiagnostic();

    // Pattern: plain file path (one per line) from dotnet format output
    [GeneratedRegex(@"^\s*(?<file>[^\s(].+\.(cs|vb|fs|razor))\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FilePath();

    // Pattern: Formatted code file 'Path.cs'.
    [GeneratedRegex(@"Formatted\s+(code\s+)?file\s+'(?<file>[^']+)'", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FormattedFile();

    // Pattern: Format complete / Formatting complete
    [GeneratedRegex(@"Format(ting)?\s+complete", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FormatComplete();

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var warnings = new List<FilterDiagnostic>();
        var rawKeep = new List<string>();
        var filesNeedingFormat = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            var diagMatch = FormatDiagnostic().Match(t);
            if (diagMatch.Success)
            {
                var diag = new FilterDiagnostic
                {
                    Message = diagMatch.Groups["msg"].Value.Trim(),
                    File = diagMatch.Groups["file"].Value.Trim(),
                    Line = int.TryParse(diagMatch.Groups["line"].Value, out var ln) ? ln : null,
                    Column = int.TryParse(diagMatch.Groups["col"].Value, out var col) ? col : null,
                    Code = diagMatch.Groups["code"].Value.Trim(),
                    Severity = FilterSeverity.Warning,
                    Source = "dotnet-format",
                    RawLine = t,
                };
                warnings.Add(diag);
                filesNeedingFormat.Add(diagMatch.Groups["file"].Value.Trim());
                rawKeep.Add(t);
                continue;
            }

            var formattedMatch = FormattedFile().Match(t);
            if (formattedMatch.Success)
            {
                filesNeedingFormat.Add(formattedMatch.Groups["file"].Value.Trim());
                rawKeep.Add(t);
                continue;
            }

            var fileMatch = FilePath().Match(t);
            if (fileMatch.Success && !FormatComplete().IsMatch(t))
            {
                filesNeedingFormat.Add(fileMatch.Groups["file"].Value.Trim());
                rawKeep.Add(t);
                continue;
            }

            if (FormatComplete().IsMatch(t) ||
                t.Contains("would reformat", StringComparison.OrdinalIgnoreCase) ||
                t.Contains("files need formatting", StringComparison.OrdinalIgnoreCase))
            {
                rawKeep.Add(t);
            }
        }

        var needsFormatting = filesNeedingFormat.Count > 0 ||
                              normalizedText.Contains("would reformat", StringComparison.OrdinalIgnoreCase) ||
                              normalizedText.Contains("files need formatting", StringComparison.OrdinalIgnoreCase);

        var summary = new FilterSummary
        {
            Status = needsFormatting ? "NeedsFormatting" : "Formatted",
            Warnings = warnings.Count,
            Total = filesNeedingFormat.Count,
        };

        return new FilterResult
        {
            Summary = summary,
            Errors = [],
            Warnings = warnings,
            RawFiltered = string.Join("\n", rawKeep),
        };
    }
}
