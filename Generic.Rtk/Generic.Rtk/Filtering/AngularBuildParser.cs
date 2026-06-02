using System.Text.RegularExpressions;
using Generic.Rtk.Models;

namespace Generic.Rtk.Filtering;

/// <summary>
/// Angular CLI / webpack-ish build logs.
/// </summary>
public sealed partial class AngularBuildParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.NgBuild;

    [GeneratedRegex(@"^\s*\d+%\s+", RegexOptions.Compiled)]
    private static partial Regex PercentProgress();

    [GeneratedRegex(@"Error:\s*(?<msg>.+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ErrorColon();

    // esbuild format: "X [ERROR] TS2322: <message>" (Angular 17+ with esbuild)
    [GeneratedRegex(@"^X \[ERROR\]\s*(?:(?<code>TS\d+):\s*)?(?<msg>.+)", RegexOptions.Compiled)]
    private static partial Regex EsbuildError();

    [GeneratedRegex(@"(?<file>[^\s'].+\.tsx?)\((?<line>\d+),(?<col>\d+)\):\s*error\s*(?<code>TS\d+):\s*(?<msg>.+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex TsError();

    [GeneratedRegex(@"^\s*Error:\s*(?<msg>.*)$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex LineError();

    private enum BlockKind { Preamble, Warning, Error }

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var blocks = SplitIntoBlocks(lines);

        var kept = new List<string>();
        var errors = new List<FilterDiagnostic>();
        int warnings = 0;

        foreach (var (kind, blockLines) in blocks)
        {
            var trimmed = TrimBlock(blockLines);
            if (trimmed.Count == 0) continue;

            switch (kind)
            {
                case BlockKind.Warning:
                    warnings++;
                    kept.Add(string.Join("\n", trimmed));
                    break;

                case BlockKind.Error:
                    var markerLine = trimmed[0];
                    var blockText = string.Join("\n", trimmed);

                    if (EsbuildError().Match(markerLine) is { Success: true } eb)
                    {
                        errors.Add(new FilterDiagnostic
                        {
                            Message = eb.Groups["msg"].Value.Trim(),
                            Code = eb.Groups["code"].Success ? eb.Groups["code"].Value : null,
                            Severity = FilterSeverity.Error,
                            Source = "ng build",
                            RawLine = blockText,
                        });
                    }
                    else if (ErrorColon().Match(markerLine) is { Success: true } em)
                    {
                        errors.Add(new FilterDiagnostic
                        {
                            Message = em.Groups["msg"].Value.Trim(),
                            Severity = FilterSeverity.Error,
                            Source = "ng build",
                            RawLine = blockText,
                        });
                    }
                    else
                    {
                        errors.Add(new FilterDiagnostic
                        {
                            Message = markerLine.Trim(),
                            Severity = FilterSeverity.Error,
                            Source = "ng build",
                            RawLine = blockText,
                        });
                    }

                    kept.Add(blockText);
                    break;

                case BlockKind.Preamble:
                    ProcessPreambleLines(trimmed, kept, errors, ref warnings);
                    break;
            }
        }

        var time = Regex.Match(normalizedText, @"Time:\s*(?<t>\d+\s*ms|\d+(\.\d+)?\s*s)", RegexOptions.IgnoreCase);
        var chunkMatch = Regex.Matches(normalizedText, @"chunk\s+\{+", RegexOptions.IgnoreCase);

        // "Application bundle generation failed." is an explicit failure indicator —
        // catches cases where error lines were not recognized by the block parser.
        var bundleFailed = normalizedText.Contains("Application bundle generation failed", StringComparison.OrdinalIgnoreCase);

        var hasErrors = errors.Count > 0 || bundleFailed;
        var summary = new FilterSummary
        {
            Status = hasErrors ? "Failed" : "Succeeded",
            Chunks = chunkMatch.Count > 0 ? chunkMatch.Count : null,
            Warnings = warnings,
            Time = time.Success ? time.Groups["t"].Value.Trim() : ExtractTimeFallback(normalizedText),
            Errors = errors.Count,
        };

        if (!hasErrors && kept.Count == 0)
        {
            var done = lines.FirstOrDefault(l => l.Contains("Application bundle generation complete", StringComparison.OrdinalIgnoreCase)
                                                || l.Contains("Build at:", StringComparison.OrdinalIgnoreCase));
            return new FilterResult
            {
                Summary = summary,
                Errors = [],
                Warnings = [],
                RawFiltered = done?.Trim() ?? "Angular build completed successfully.",
            };
        }

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = string.Join("\n", kept),
        };
    }

    private static List<(BlockKind Kind, List<string> Lines)> SplitIntoBlocks(string[] lines)
    {
        var blocks = new List<(BlockKind, List<string>)>();
        BlockKind currentKind = BlockKind.Preamble;
        var currentLines = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimStart();

            if (t.StartsWith("\u25b2 [WARNING]", StringComparison.Ordinal))
            {
                if (currentLines.Count > 0)
                    blocks.Add((currentKind, currentLines));
                currentKind = BlockKind.Warning;
                currentLines = [line.TrimEnd()];
                continue;
            }

            if (t.StartsWith("\u25b2 [ERROR]", StringComparison.Ordinal) ||
                t.StartsWith("\u2718 [ERROR]", StringComparison.Ordinal) ||
                t.StartsWith("X [ERROR]", StringComparison.Ordinal))
            {
                if (currentLines.Count > 0)
                    blocks.Add((currentKind, currentLines));
                currentKind = BlockKind.Error;
                currentLines = [line.TrimEnd()];
                continue;
            }

            if (currentKind != BlockKind.Preamble)
            {
                // Context lines belong to the current warning/error block
                currentLines.Add(line.TrimEnd());
                continue;
            }

            currentLines.Add(line.TrimEnd());
        }

        if (currentLines.Count > 0)
            blocks.Add((currentKind, currentLines));

        return blocks;
    }

    private static List<string> TrimBlock(List<string> lines)
    {
        int start = 0;
        while (start < lines.Count && string.IsNullOrWhiteSpace(lines[start]))
            start++;

        int end = lines.Count - 1;
        while (end >= start && string.IsNullOrWhiteSpace(lines[end]))
            end--;

        if (start > end) return [];
        return lines.GetRange(start, end - start + 1);
    }

    private void ProcessPreambleLines(List<string> lines, List<string> kept,
        List<FilterDiagnostic> errors, ref int warnings)
    {
        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            if (IsWebpackNoise(t)) continue;

            if (t.Contains("warning", StringComparison.OrdinalIgnoreCase) &&
                (t.Contains("Warning", StringComparison.Ordinal) || t.ToLowerInvariant().Contains("warning")))
            {
                warnings++;
                kept.Add(t);
                continue;
            }

            var ts = TsError().Match(t);
            if (ts.Success)
            {
                errors.Add(new FilterDiagnostic
                {
                    Message = ts.Groups["msg"].Value.Trim(),
                    File = ts.Groups["file"].Value.Trim(),
                    Line = int.Parse(ts.Groups["line"].Value),
                    Column = int.Parse(ts.Groups["col"].Value),
                    Code = ts.Groups["code"].Value,
                    Severity = FilterSeverity.Error,
                    Source = "ng build",
                    RawLine = t,
                });
                kept.Add(t);
                continue;
            }

            if (t.Contains("ERROR in", StringComparison.OrdinalIgnoreCase) ||
                t.Contains("Module not found", StringComparison.OrdinalIgnoreCase) ||
                LineError().IsMatch(t) && t.Contains("Error", StringComparison.OrdinalIgnoreCase))
            {
                if (TsError().IsMatch(t) == false && ErrorColon().IsMatch(t))
                {
                    var m = ErrorColon().Match(t);
                    errors.Add(new FilterDiagnostic
                    {
                        Message = m.Groups["msg"].Value.Trim(),
                        Severity = FilterSeverity.Error,
                        Source = "ng build",
                        RawLine = t,
                    });
                }
                else if (!t.EndsWith("Error", StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add(new FilterDiagnostic
                    {
                        Message = t.Trim(),
                        Severity = FilterSeverity.Error,
                        Source = "ng build",
                        RawLine = t,
                    });
                }

                if (!kept.Contains(t)) kept.Add(t);
            }
        }
    }

    private static bool IsWebpackNoise(string t)
    {
        if (PercentProgress().IsMatch(t)) return true;
        var l = t.ToLowerInvariant();
        if (l.Contains("chunk ") && l.Contains("bytes")) return true;
        if (l.StartsWith("asset ")) return true;
        if (l.Contains("webpack compiled")) return true;
        if (l.Contains("⠋") || l.Contains("⠙") || l.Contains("⠹")) return true;
        if (l.Contains("building ") && l.Contains("%")) return true;
        return false;
    }

    private static string? ExtractTimeFallback(string text)
    {
        var m = Regex.Match(text, @"in\s+(?<t>\d+(\.\d+)?\s*s|\d+\s*ms)", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups["t"].Value.Trim() : null;
    }
}
