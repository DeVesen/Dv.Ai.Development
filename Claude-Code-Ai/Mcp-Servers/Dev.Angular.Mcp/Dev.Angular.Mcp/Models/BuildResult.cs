using System.Text.Json.Serialization;

namespace Dev.Angular.Mcp.Models;

public sealed class BuildResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string[] Errors { get; init; } = [];
    public string[] Warnings { get; init; } = [];
    public int ExitCode { get; init; }
    public string Summary { get; init; } = string.Empty;
    [JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}
