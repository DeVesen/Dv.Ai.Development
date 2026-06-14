namespace Dev.Dotnet.Mcp.Models;

public sealed class RenameFileResult
{
    public bool Success { get; init; }
    public string OldPath { get; init; } = string.Empty;
    public string NewPath { get; init; } = string.Empty;
    public string? Error { get; init; }
}
