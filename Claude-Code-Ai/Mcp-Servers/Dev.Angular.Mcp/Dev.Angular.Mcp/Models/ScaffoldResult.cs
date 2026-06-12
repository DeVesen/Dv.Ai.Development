namespace Dev.Angular.Mcp.Models;

public sealed class ScaffoldResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> CreatedFiles { get; init; } = [];
    public int ExitCode { get; init; }
    public string? Error { get; init; }
    public string? Stdout { get; init; }
    public string? Stderr { get; init; }
}
