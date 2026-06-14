using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Dotnet.Mcp.Models;
using Dev.Dotnet.Mcp.Services;
using Dev.Dotnet.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Dotnet.Mcp.Tools;

/// <summary>MCP tools for dotnet new scaffolding, directory templates, build, and test.</summary>
public sealed class DotnetTools
{
    private readonly DotnetScaffolder _scaffolder;
    private readonly DirectoryTemplateService _directories;
    private readonly DotnetRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<DotnetTools> _logger;

    public DotnetTools(
        DotnetScaffolder scaffolder,
        DirectoryTemplateService directories,
        DotnetRunner runner,
        ToolCallHistory history,
        ILogger<DotnetTools> logger)
    {
        _scaffolder = scaffolder;
        _directories = directories;
        _runner = runner;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "create_dotnet_solution")]
    [Description("Creates a new .sln file using 'dotnet new sln'. Use scaffold_dotnet_project afterwards to add projects to it.")]
    public async Task<string> CreateDotnetSolution(
        [Description("Solution name (becomes <name>.sln)")] string name,
        [Description("Container-absolute output directory, e.g. /workspace/backend (mapped from ${workspaceFolder}:/workspace)")] string output_path)
    {
        return await ExecuteAsync(
            "create_dotnet_solution",
            new { name, output_path },
            async () =>
            {
                var result = await _scaffolder.CreateSolutionAsync(name, output_path);
                return (JsonSerializer.Serialize(result, JsonDefaults.Options), result.ConsoleOutput);
            });
    }

    [McpServerTool(Name = "rename_file")]
    [Description("Renames or moves a file. Fails if the source does not exist or the destination already exists.")]
    public Task<string> RenameFile(
        [Description("Container-absolute path of the file to rename, e.g. /workspace/src/OldName.cs")] string old_path,
        [Description("Container-absolute destination path, e.g. /workspace/src/NewName.cs")] string new_path)
    {
        return ExecuteAsync(
            "rename_file",
            new { old_path, new_path },
            () =>
            {
                var result = RenameFileInternal(old_path, new_path);
                return Task.FromResult((JsonSerializer.Serialize(result, JsonDefaults.Options), string.Empty));
            });
    }

    private static Dev.Dotnet.Mcp.Models.RenameFileResult RenameFileInternal(string oldPath, string newPath)
    {
        var fullOld = Path.GetFullPath(oldPath);
        var fullNew = Path.GetFullPath(newPath);

        if (!File.Exists(fullOld))
            return new Dev.Dotnet.Mcp.Models.RenameFileResult { Success = false, OldPath = fullOld, NewPath = fullNew, Error = $"Source file not found: {fullOld}" };
        if (File.Exists(fullNew))
            return new Dev.Dotnet.Mcp.Models.RenameFileResult { Success = false, OldPath = fullOld, NewPath = fullNew, Error = $"Destination already exists: {fullNew}" };

        var destDir = Path.GetDirectoryName(fullNew);
        if (!string.IsNullOrEmpty(destDir))
            Directory.CreateDirectory(destDir);

        File.Move(fullOld, fullNew);
        return new Dev.Dotnet.Mcp.Models.RenameFileResult { Success = true, OldPath = fullOld, NewPath = fullNew };
    }

    [McpServerTool(Name = "scaffold_dotnet_project")]
    [Description("Runs dotnet new with template, name, and output path. Optionally adds project to a solution.")]
    public async Task<string> ScaffoldDotnetProject(
        [Description("dotnet new template, e.g. classlib, webapi")] string template,
        [Description("Project name")] string name,
        [Description("Container-absolute output directory path, e.g. /workspace/src/MyLib (mapped from ${workspaceFolder}:/workspace)")] string output_path,
        [Description("Optional container-absolute .sln path for dotnet sln add")] string? solution_path = null,
        [Description("Optional extra dotnet new flags, e.g. --framework net9.0")] string? options = null)
    {
        return await ExecuteAsync(
            "scaffold_dotnet_project",
            new { template, name, output_path, solution_path, options },
            async () =>
            {
                var result = await _scaffolder.ScaffoldAsync(template, name, output_path, solution_path, options);
                return (JsonSerializer.Serialize(result, JsonDefaults.Options), result.ConsoleOutput);
            });
    }

    [McpServerTool(Name = "create_directory_structure")]
    [Description("Creates directories (and empty files for paths with extensions) from a JSON string array of relative paths.")]
    public Task<string> CreateDirectoryStructure(
        [Description("Container-absolute base directory, e.g. /workspace/src (mapped from ${workspaceFolder}:/workspace)")] string base_path,
        [Description("JSON array of relative paths, e.g. [\"src/Api\", \"src/Domain/Entities/.gitkeep\"]")] string paths_json)
    {
        return ExecuteAsync(
            "create_directory_structure",
            new { base_path, paths_json },
            () =>
            {
                var result = _directories.Create(base_path, paths_json);
                return Task.FromResult((JsonSerializer.Serialize(result, JsonDefaults.Options), string.Empty));
            });
    }

    [McpServerTool(Name = "build_dotnet_solution")]
    [Description(
        "Runs dotnet build on the given solution, project, or directory and returns a filtered result. " +
        "Raw console output is never forwarded — only structured errors, warnings, and a summary are returned.")]
    public async Task<string> BuildDotnetSolution(
        [Description("Container-absolute path to .sln file, .csproj, or directory, e.g. /workspace/backend/MySolution.sln (mapped from ${workspaceFolder}:/workspace)")] string path,
        [Description("Optional build configuration, e.g. Release, Debug")] string? configuration = null)
    {
        return await ExecuteAsync(
            "build_dotnet_solution",
            new { path, configuration },
            async () =>
            {
                var result = await _runner.BuildAsync(path, configuration);
                return (JsonSerializer.Serialize(result, JsonDefaults.Options), result.ConsoleOutput);
            });
    }

    [McpServerTool(Name = "test_dotnet_solution")]
    [Description(
        "Runs dotnet test on the given solution, project, or directory and returns a filtered result. " +
        "Raw console output is never forwarded — only failed test names and a summary are returned.")]
    public async Task<string> TestDotnetSolution(
        [Description("Container-absolute path to .sln file, .csproj, or directory, e.g. /workspace/backend/MySolution.sln (mapped from ${workspaceFolder}:/workspace)")] string path,
        [Description("Optional extra dotnet test flags, e.g. --logger trx")] string? options = null)
    {
        return await ExecuteAsync(
            "test_dotnet_solution",
            new { path, options },
            async () =>
            {
                var result = await _runner.TestAsync(path, options);
                return (JsonSerializer.Serialize(result, JsonDefaults.Options), result.ConsoleOutput);
            });
    }

    private async Task<string> ExecuteAsync(string toolName, object parameters, Func<Task<(string json, string consoleOutput)>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonDefaults.Options);

        try
        {
            var (result, consoleOutput) = await action();
            sw.Stop();
            _history.Record(toolName, paramJson, result, consoleOutput, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== {Tool} ({DurationMs}ms) ===", toolName, sw.ElapsedMilliseconds);
            return result;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonSerializer.Serialize(new { error = ex.Message }, JsonDefaults.Options);
            _history.Record(toolName, paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }
}
