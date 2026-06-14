using System.Text.Json.Serialization;

namespace Dev.Dotnet.Mcp.Models;

public sealed class DotnetSolutionResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string SolutionPath { get; init; } = string.Empty;
    public string? Error { get; init; }
    [JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}
