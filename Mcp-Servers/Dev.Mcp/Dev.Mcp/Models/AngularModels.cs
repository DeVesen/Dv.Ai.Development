using System.Text.Json.Serialization;

namespace Dev.Mcp.Models;

public sealed class AngularBuildResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string[] Errors { get; init; } = [];
    public string[] Warnings { get; init; } = [];
    public int ExitCode { get; init; }
    public string Summary { get; init; } = string.Empty;
    [JsonIgnore] public string ConsoleOutput { get; set; } = string.Empty;
}

public sealed class AngularScaffoldResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> CreatedFiles { get; init; } = [];
    public int ExitCode { get; init; }
    public string? Error { get; init; }
    public string? Stdout { get; init; }
    public string? Stderr { get; init; }
}
