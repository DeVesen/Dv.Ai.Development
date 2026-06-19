using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.WindowsService.Mcp.Models;
using Dev.WindowsService.Mcp.Services;
using Dev.WindowsService.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.WindowsService.Mcp.Tools;

public sealed class DotnetTools
{
    private readonly DotnetScaffolder _scaffolder;
    private readonly DirectoryTemplateService _directories;
    private readonly DotnetRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<DotnetTools> _logger;

    public DotnetTools(DotnetScaffolder scaffolder, DirectoryTemplateService directories, DotnetRunner runner,
        ToolCallHistory history, ILogger<DotnetTools> logger)
    {
        _scaffolder = scaffolder; _directories = directories; _runner = runner;
        _history = history; _logger = logger;
    }

    [McpServerTool(Name = "create_dotnet_solution")]
    [Description("Creates a new .sln file using 'dotnet new sln'. Use scaffold_dotnet_project afterwards to add projects to it.")]
    public async Task<string> CreateDotnetSolution(
        [Description("Solution name (becomes <name>.sln)")] string name,
        [Description("Absolute output directory path")] string output_path) =>
        await ExecuteAsync("create_dotnet_solution", new { name, output_path }, async () =>
        {
            var result = await _scaffolder.CreateSolutionAsync(name, output_path);
            return (JsonSerializer.Serialize(result, JsonOptions.Default), result.ConsoleOutput);
        });

    [McpServerTool(Name = "rename_file")]
    [Description("Renames or moves a file. Fails if the source does not exist or the destination already exists.")]
    public Task<string> RenameFile(
        [Description("Absolute path of the file to rename")] string old_path,
        [Description("Absolute destination path")] string new_path) =>
        ExecuteAsync("rename_file", new { old_path, new_path }, () =>
        {
            var fullOld = Path.GetFullPath(old_path);
            var fullNew = Path.GetFullPath(new_path);
            RenameFileResult result;
            if (!File.Exists(fullOld))
                result = new RenameFileResult { Success = false, OldPath = fullOld, NewPath = fullNew, Error = $"Source file not found: {fullOld}" };
            else if (File.Exists(fullNew))
                result = new RenameFileResult { Success = false, OldPath = fullOld, NewPath = fullNew, Error = $"Destination already exists: {fullNew}" };
            else
            {
                var destDir = Path.GetDirectoryName(fullNew);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);
                File.Move(fullOld, fullNew);
                result = new RenameFileResult { Success = true, OldPath = fullOld, NewPath = fullNew };
            }
            return Task.FromResult((JsonSerializer.Serialize(result, JsonOptions.Default), string.Empty));
        });

    [McpServerTool(Name = "scaffold_dotnet_project")]
    [Description("Runs dotnet new with template, name, and output path. Optionally adds project to a solution.")]
    public async Task<string> ScaffoldDotnetProject(
        [Description("dotnet new template, e.g. classlib, webapi")] string template,
        [Description("Project name")] string name,
        [Description("Absolute output directory path")] string output_path,
        [Description("Optional absolute .sln path for dotnet sln add")] string? solution_path = null,
        [Description("Optional extra dotnet new flags, e.g. --framework net9.0")] string? options = null) =>
        await ExecuteAsync("scaffold_dotnet_project", new { template, name, output_path, solution_path, options }, async () =>
        {
            var result = await _scaffolder.ScaffoldAsync(template, name, output_path, solution_path, options);
            return (JsonSerializer.Serialize(result, JsonOptions.Default), result.ConsoleOutput);
        });

    [McpServerTool(Name = "create_directory_structure")]
    [Description("Creates directories (and empty files for paths with extensions) from a JSON string array of relative paths.")]
    public Task<string> CreateDirectoryStructure(
        [Description("Absolute base directory")] string base_path,
        [Description("JSON array of relative paths, e.g. [\"src/Api\", \"src/Domain/.gitkeep\"]")] string paths_json) =>
        ExecuteAsync("create_directory_structure", new { base_path, paths_json }, () =>
        {
            var result = _directories.Create(base_path, paths_json);
            return Task.FromResult((JsonSerializer.Serialize(result, JsonOptions.Default), string.Empty));
        });

    [McpServerTool(Name = "build_dotnet_solution")]
    [Description("Runs dotnet build on the given solution, project, or directory and returns a filtered result.")]
    public async Task<string> BuildDotnetSolution(
        [Description("Absolute path to .sln file, .csproj, or directory")] string path,
        [Description("Optional build configuration, e.g. Release, Debug")] string? configuration = null) =>
        await ExecuteAsync("build_dotnet_solution", new { path, configuration }, async () =>
        {
            var result = await _runner.BuildAsync(path, configuration);
            return (JsonSerializer.Serialize(result, JsonOptions.Default), result.ConsoleOutput);
        });

    [McpServerTool(Name = "test_dotnet_solution")]
    [Description("Runs dotnet test on the given solution, project, or directory and returns a filtered result. Use filter to run a subset of tests, test_project_path to test one project only.")]
    public async Task<string> TestDotnetSolution(
        [Description("Absolute path to .sln file, .csproj, or directory")] string path,
        [Description("Optional extra dotnet test flags, e.g. --logger trx")] string? options = null,
        [Description("Optional test filter expression, e.g. 'FullyQualifiedName~MyService'")] string? filter = null,
        [Description("Optional absolute path to a specific test .csproj to run instead of the full solution")] string? test_project_path = null) =>
        await ExecuteAsync("test_dotnet_solution", new { path, options, filter, test_project_path }, async () =>
        {
            var effectivePath = test_project_path ?? path;
            var effectiveOptions = options ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(filter))
                effectiveOptions = (effectiveOptions + $" --filter \"{filter}\"").Trim();
            var result = await _runner.TestAsync(effectivePath, string.IsNullOrWhiteSpace(effectiveOptions) ? null : effectiveOptions);
            return (JsonSerializer.Serialize(result, JsonOptions.Default), result.ConsoleOutput);
        });

    private async Task<string> ExecuteAsync(string toolName, object parameters, Func<Task<(string json, string consoleOutput)>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonOptions.Default);
        try
        {
            var (result, consoleOutput) = await action();
            sw.Stop();
            _history.Record(toolName, "dotnet", paramJson, result, consoleOutput, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== {Tool} ({DurationMs}ms) ===", toolName, sw.ElapsedMilliseconds);
            return result;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record(toolName, "dotnet", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }
}
