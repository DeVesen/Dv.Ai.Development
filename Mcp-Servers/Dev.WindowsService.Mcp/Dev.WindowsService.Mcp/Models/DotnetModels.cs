using System.Text.Json.Serialization;

namespace Dev.WindowsService.Mcp.Models;

public sealed class DotnetBuildResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string[] Errors { get; init; } = [];
    public string[] Warnings { get; init; } = [];
    public int ExitCode { get; init; }
    public string Summary { get; init; } = string.Empty;
    [JsonIgnore] public string ConsoleOutput { get; set; } = string.Empty;
}

public sealed class DotnetScaffoldResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string ProjectPath { get; init; } = string.Empty;
    public bool AddedToSolution { get; init; }
    public string? Error { get; init; }
    [JsonIgnore] public string ConsoleOutput { get; set; } = string.Empty;
}

public sealed class DotnetSolutionResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public string SolutionPath { get; init; } = string.Empty;
    public string? Error { get; init; }
    [JsonIgnore] public string ConsoleOutput { get; set; } = string.Empty;
}

public sealed class DirectoryStructureResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> CreatedDirs { get; init; } = [];
    public IReadOnlyList<string> CreatedFiles { get; init; } = [];
    public string? Error { get; init; }
}

public sealed class RenameFileResult
{
    public bool Success { get; init; }
    public string OldPath { get; init; } = string.Empty;
    public string NewPath { get; init; } = string.Empty;
    public string? Error { get; init; }
}
