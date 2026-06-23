using System.Text.Json.Serialization;

namespace Dev.Mcp.Models;

public sealed class InspectionIssue
{
    public string File { get; init; } = string.Empty;
    public int Line { get; init; }
    public string Rule { get; init; } = string.Empty;
    public string Msg { get; init; } = string.Empty;
}

public sealed class InspectionSummary
{
    public int Errors { get; init; }
    public int Warnings { get; init; }
    public int Suggestions { get; init; }
}

public sealed class InspectionResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public InspectionSummary Summary { get; init; } = new();
    public InspectionIssue[] Errors { get; init; } = [];
    public InspectionIssue[] Warnings { get; init; } = [];
    public InspectionIssue[] Suggestions { get; init; } = [];
    public string? Error { get; init; }
    [JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}
