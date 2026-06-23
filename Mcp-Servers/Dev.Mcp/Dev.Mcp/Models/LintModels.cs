using System.Text.Json.Serialization;

namespace Dev.Mcp.Models;

public sealed class LintIssue
{
    public string File { get; init; } = string.Empty;
    public int Line { get; init; }
    public string Rule { get; init; } = string.Empty;
    public string Msg { get; init; } = string.Empty;
}

public sealed class LintSummary
{
    public int Errors { get; init; }
    public int Warnings { get; init; }
}

public sealed class LintResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public LintSummary Summary { get; init; } = new();
    public LintIssue[] Errors { get; init; } = [];
    public LintIssue[] Warnings { get; init; } = [];
    public string? Error { get; init; }
    [JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}
