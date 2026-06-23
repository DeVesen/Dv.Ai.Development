namespace Dev.Mcp.Models;

public sealed class AngularArchSummary
{
    public int FilesScanned { get; init; }
    public int Violations { get; init; }
}

public sealed class MisplacedEntry
{
    public string Class { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
    public string ExpectedZone { get; init; } = "core/api/";
}

public sealed class HttpInFeatureServiceEntry
{
    public string Class { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
}

public sealed class NamingViolationEntry
{
    public string File { get; init; } = string.Empty;
    public string Issue { get; init; } = string.Empty;
}

public sealed class AngularArchResult
{
    public AngularArchSummary Summary { get; init; } = new();
    public MisplacedEntry[] Misplaced { get; init; } = [];
    public HttpInFeatureServiceEntry[] HttpInFeatureService { get; init; } = [];
    public NamingViolationEntry[] NamingViolations { get; init; } = [];
    public string? Error { get; init; }
}
