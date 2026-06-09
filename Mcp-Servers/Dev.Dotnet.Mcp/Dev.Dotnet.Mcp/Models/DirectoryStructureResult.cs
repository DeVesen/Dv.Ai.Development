namespace Dev.Dotnet.Mcp.Models;

public sealed class DirectoryStructureResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> CreatedDirs { get; init; } = [];
    public IReadOnlyList<string> CreatedFiles { get; init; } = [];
    public string? Error { get; init; }
}
