using System.ComponentModel;
using System.Text;
using System.Text.Json;
using Generic.Rtk.Filtering;
using Generic.Rtk.Models;
using Generic.Rtk.Streaming;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Generic.Rtk.Tools;

/// <summary>MCP tools for output filtering.</summary>
public sealed class OutputFilterTools
{
    private readonly OutputFilterService _filterService;
    private readonly StreamFilterSessionManager _sessions;
    private readonly FilterLimits _limits;
    private readonly FilterCallHistory _history;
    private readonly ILogger<OutputFilterTools> _logger;

    public OutputFilterTools(
        OutputFilterService filterService,
        StreamFilterSessionManager sessions,
        FilterLimits limits,
        FilterCallHistory history,
        ILogger<OutputFilterTools> logger)
    {
        _filterService = filterService;
        _sessions = sessions;
        _limits = limits;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "filter_output")]
    [Description(
        "Filters raw build or test output and returns only the filtered text. " +
        "tool_type: DotnetBuild|DotnetTest|DotnetRestore|DotnetFormat|NgBuild|NgTest|Jest|Vitest|NodeGeneric.")]
    public string FilterOutput(
        [Description("Full raw console output")] string raw,
        [Description("Tool kind enum name")] string tool_type)
    {
        var knownType = ToolParameterParsing.TryParseToolType(tool_type, out var tt, out _);

        if (!knownType)
        {
            _logger.LogInformation("=== filter_output passthrough (unknown tool_type '{ToolType}') ===", tool_type);
            var passthroughRecord = new FilterCallRecord(DateTime.UtcNow, $"Unknown({tool_type})", raw, raw);
            _history.Record(passthroughRecord);
            LogSavingsWarning(passthroughRecord);
            return raw;
        }

        _logger.LogInformation("=== BEFORE filter_output ({ToolType}) ===\n{Raw}", tt, raw);

        var result = _filterService.Filter(raw, tt, _limits);
        var filtered = result.RawFiltered;

        var filterRecord = new FilterCallRecord(DateTime.UtcNow, tt.ToString(), raw, filtered);
        _history.Record(filterRecord);
        LogSavingsWarning(filterRecord);

        _logger.LogInformation("=== AFTER filter_output ({ToolType}) ===\n{Filtered}", tt, filtered);

        return filtered;
    }

    [McpServerTool(Name = "filter_output_stream")]
    [Description(
        "Chunked output with line buffering. Reuse session_id; set is_final when done. " +
        "Returns only the filtered text for completed lines in this session.")]
    public string FilterOutputStream(
        [Description("Next chunk of output")] string chunk,
        [Description("Tool kind enum name")] string tool_type,
        [Description("Stable id per logical stream")] string session_id,
        [Description("True when no more chunks follow")] bool is_final = false)
    {
        if (string.IsNullOrWhiteSpace(session_id))
            return "session_id is required.";

        var knownType = ToolParameterParsing.TryParseToolType(tool_type, out var tt, out _);

        if (!knownType)
        {
            _logger.LogInformation("=== filter_output_stream passthrough (unknown tool_type '{ToolType}', session={SessionId}) ===", tool_type, session_id);
            _history.AccumulateStreamInput(session_id, chunk);
            if (is_final)
                _history.RecordStream(session_id, $"Unknown({tool_type})", chunk);
            return chunk;
        }

        _logger.LogInformation("=== BEFORE filter_output_stream ({ToolType}, session={SessionId}, final={IsFinal}) ===\n{Chunk}", tt, session_id, is_final, chunk);

        _history.AccumulateStreamInput(session_id, chunk);

        var result = _sessions.AppendAndFilter(session_id, tt, chunk, is_final, _filterService);
        var filtered = result.RawFiltered;

        if (is_final)
            _history.RecordStream(session_id, tt.ToString(), filtered);

        _logger.LogInformation("=== AFTER filter_output_stream ({ToolType}, session={SessionId}) ===\n{Filtered}", tt, session_id, filtered);

        return filtered;
    }

    [McpServerTool(Name = "get_filter_savings")]
    [Description(
        "Returns token savings from the last N filter calls. Shows input chars, output chars, saved chars and percentage per call.")]
    public string GetFilterSavings(
        [Description("Number of recent calls to show (default 10, max 20)")] int count = 10)
    {
        count = Math.Clamp(count, 1, 20);
        var entries = _history.GetLast(count);

        if (entries.Count == 0)
            return $"No filter calls recorded yet. (v{BuildVersionInfo.Version})";

        var sb = new StringBuilder();
        sb.AppendLine($"GenericRtk MCP v{BuildVersionInfo.Version}");
        sb.AppendLine($"Last {entries.Count} filter call(s):");
        sb.AppendLine();

        foreach (var e in entries)
        {
            sb.AppendLine($"[{e.Timestamp:HH:mm:ss}] {e.ToolType}: " +
                $"{e.OutputChars} of {e.InputChars} chars kept — " +
                $"{e.SavedChars} saved ({e.SavedPercent}%)");
        }

        var totalIn = entries.Sum(e => e.InputChars);
        var totalOut = entries.Sum(e => e.OutputChars);
        var totalSaved = totalIn - totalOut;
        var totalPct = totalIn == 0 ? 0 : Math.Round(totalSaved * 100.0 / totalIn, 1);

        sb.AppendLine();
        sb.AppendLine($"Total: {totalSaved} of {totalIn} chars saved ({totalPct}%)");

        return sb.ToString().TrimEnd();
    }

    [McpServerTool(Name = "get_filter_history")]
    [Description(
        "Returns a summary of the last N filter calls. " +
        "Each entry contains id, toolType, inputChars, outputChars, savedChars, savedPercent. " +
        "Use get_filter_history_detail with the id to retrieve full input/output text.")]
    public string GetFilterHistory(
        [Description("Number of recent calls to show (default 5, max 20)")] int count = 5)
    {
        count = Math.Clamp(count, 1, 20);
        var entries = _history.GetLast(count);

        if (entries.Count == 0)
            return $"No filter calls recorded yet. (v{BuildVersionInfo.Version})";

        var items = entries.Select(e => new
        {
            id = e.Id,
            toolType = e.ToolType,
            inputChars = e.InputChars,
            outputChars = e.OutputChars,
            savedChars = e.SavedChars,
            savedPercent = e.SavedPercent,
        });

        return JsonSerializer.Serialize(items, FilterResultFormatter.JsonOptions);
    }

    [McpServerTool(Name = "get_filter_history_detail")]
    [Description(
        "Returns the full input and output text for a specific filter call. " +
        "Use get_filter_history to obtain the id first.")]
    public string GetFilterHistoryDetail(
        [Description("The 10-character hash id of the filter call")] string id)
    {
        var entry = _history.GetById(id);

        if (entry is null)
            return $"No filter call found with id '{id}'.";

        var detail = new
        {
            id = entry.Id,
            timestamp = entry.Timestamp.ToString("o"),
            toolType = entry.ToolType,
            inputValue = entry.InputValue,
            outputValue = entry.OutputValue,
        };

        return JsonSerializer.Serialize(detail, FilterResultFormatter.JsonOptions);
    }

    [McpServerTool(Name = "analyze_build_output")]
    [Description(
        "Analyzes raw build/test console output and returns only the filtered text. " +
        "format: dotnet-build, dotnet-test, dotnet-restore, dotnet-format, ng-build, ng-test, jest, vitest, node-generic. Auto-detected when omitted.")]
    public string AnalyzeBuildOutput(
        [Description("Full raw stdout/stderr build output")] string text,
        [Description("Output format hint, e.g. dotnet-build, dotnet-test, ng-build, ng-test, jest, vitest, node-generic. Auto-detected when omitted.")] string? format = null)
    {
        var tt = ResolveToolType(format, text);

        if (tt is null)
        {
            _logger.LogInformation("=== analyze_build_output passthrough (unknown format '{Format}') ===", format);
            var analyzePassthrough = new FilterCallRecord(DateTime.UtcNow, $"Unknown({format})", text, text);
            _history.Record(analyzePassthrough);
            LogSavingsWarning(analyzePassthrough);
            return text;
        }

        _logger.LogInformation("=== analyze_build_output (toolType={ToolType}) ===", tt);

        var result = _filterService.Filter(text, tt.Value, _limits);
        var filtered = result.RawFiltered;

        var analyzeRecord = new FilterCallRecord(DateTime.UtcNow, tt.Value.ToString(), text, filtered);
        _history.Record(analyzeRecord);
        LogSavingsWarning(analyzeRecord);

        _logger.LogInformation("=== analyze_build_output result ===\n{Result}", filtered);

        return filtered;
    }

    [McpServerTool(Name = "clear_filter_history")]
    [Description("Clears all recorded filter call history entries.")]
    public string ClearFilterHistory()
    {
        _history.Clear();
        _logger.LogInformation("=== filter history cleared ===");
        return "Filter history cleared.";
    }

    private static ToolType? ResolveToolType(string? format, string text)
    {
        if (!string.IsNullOrWhiteSpace(format))
        {
            var normalized = format.Trim().ToLowerInvariant().Replace("-", "").Replace("_", "");
            return normalized switch
            {
                "dotnetbuild" => ToolType.DotnetBuild,
                "dotnettest" => ToolType.DotnetTest,
                "dotnetrestore" => ToolType.DotnetRestore,
                "dotnetformat" => ToolType.DotnetFormat,
                "ngbuild" or "angularbuild" => ToolType.NgBuild,
                "ngtest" or "angulartest" => ToolType.NgTest,
                "jest" => ToolType.Jest,
                "vitest" => ToolType.Vitest,
                "nodegeneric" or "node" => ToolType.NodeGeneric,
                _ => null,
            };
        }

        // Auto-detect from content
        if (text.Contains("Build succeeded", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Build FAILED", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Warning(s)", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Error(s)", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("MSBuild version", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Build completed in", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Started building project", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Finished building project", StringComparison.OrdinalIgnoreCase))
            return ToolType.DotnetBuild;

        if (text.Contains("dotnet test", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Passed!", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Failed!", StringComparison.OrdinalIgnoreCase))
            return ToolType.DotnetTest;

        if (text.Contains("Restore completed", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Restored ", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("dotnet restore", StringComparison.OrdinalIgnoreCase))
            return ToolType.DotnetRestore;

        if (text.Contains("dotnet format", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Formatted code file", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("would reformat", StringComparison.OrdinalIgnoreCase))
            return ToolType.DotnetFormat;

        if (text.Contains("ng build", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("angular", StringComparison.OrdinalIgnoreCase))
            return ToolType.NgBuild;

        if (text.Contains("PASS", StringComparison.Ordinal) && text.Contains("FAIL", StringComparison.Ordinal) &&
            text.Contains("Tests:", StringComparison.Ordinal))
            return ToolType.Jest;

        return null;
    }

    private void LogSavingsWarning(FilterCallRecord record)
    {
        if (record.ToolType.StartsWith("Unknown(", StringComparison.Ordinal))
        {
            _logger.LogWarning("⚠ UNKNOWN TOOL: '{ToolType}' — no filtering applied ({InputChars} chars)",
                record.ToolType, record.InputChars);
        }
        else if (record.SavedPercent == 0)
        {
            _logger.LogWarning("⚠ NO SAVINGS: {ToolType} — output unchanged ({InputChars} chars)",
                record.ToolType, record.InputChars);
        }
        else if (record.SavedPercent < 5)
        {
            _logger.LogWarning("⚠ LOW SAVINGS: {ToolType} — {SavedPercent}% saved ({InputChars} → {OutputChars} chars)",
                record.ToolType, record.SavedPercent, record.InputChars, record.OutputChars);
        }
    }
}
