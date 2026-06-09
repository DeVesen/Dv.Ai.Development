using System.Text.RegularExpressions;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Filtering;

/// <summary>Node / npm script output: keep stderr and crash signatures, drop typical stdout noise.</summary>
public sealed class NodeScriptParser : IToolOutputParser
{
    public ToolType ToolType => ToolType.NodeGeneric;

    public FilterResult Parse(string normalizedText, FilterLimits limits)
    {
        var lines = normalizedText.Split('\n');
        var kept = new List<string>();

        foreach (var line in lines)
        {
            var t = line.TrimEnd();
            if (string.IsNullOrWhiteSpace(t)) continue;

            if (ShouldKeep(t)) kept.Add(t);
        }

        var hasErr = kept.Count > 0;
        var summary = new FilterSummary
        {
            Status = hasErr ? "Failed" : "Succeeded",
            Errors = hasErr ? 1 : 0,
        };

        var errors = new List<FilterDiagnostic>();
        if (hasErr)
        {
            var block = string.Join("\n", kept);
            errors.Add(new FilterDiagnostic
            {
                Message = kept[0],
                Severity = FilterSeverity.Error,
                Source = "node",
                StackTrace = ExtractStack(block),
                RawLine = block,
            });
        }

        return new FilterResult
        {
            Summary = summary,
            Errors = errors,
            Warnings = [],
            RawFiltered = hasErr ? string.Join("\n", kept) : string.Empty,
        };
    }

    private static bool ShouldKeep(string t)
    {
        if (t.StartsWith("npm ERR", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("UnhandledPromiseRejection", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("uncaughtException", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("Uncaught", StringComparison.OrdinalIgnoreCase)) return true;
        if (Regex.IsMatch(t, @"^\s*Error:\s*", RegexOptions.IgnoreCase)) return true;
        if (t.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("AssertionError", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.StartsWith("node:", StringComparison.OrdinalIgnoreCase)) return true;
        if (t.Contains("ERR_", StringComparison.Ordinal)) return true;
        return false;
    }

    private static string? ExtractStack(string block)
    {
        var stackLines = block.Split('\n').Where(l => l.TrimStart().StartsWith("at ", StringComparison.OrdinalIgnoreCase)).ToList();
        return stackLines.Count > 0 ? string.Join("\n", stackLines) : null;
    }
}
