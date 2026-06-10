namespace Dev.Dotnet.Mcp.Models;

public sealed class DotnetBuildResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string[] Errors { get; init; } = [];
    public string[] Warnings { get; init; } = [];
    public int ExitCode { get; init; }
    public string Summary { get; init; } = string.Empty;
}
