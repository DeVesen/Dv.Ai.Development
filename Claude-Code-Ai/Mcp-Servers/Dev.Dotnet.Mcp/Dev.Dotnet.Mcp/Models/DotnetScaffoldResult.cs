using System.Text.Json.Serialization;

namespace Dev.Dotnet.Mcp.Models;

public sealed class DotnetScaffoldResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string ProjectPath { get; init; } = string.Empty;
    public bool AddedToSolution { get; init; }
    public string? Error { get; init; }
    [JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}
