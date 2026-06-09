using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Dotnet.Mcp.Models;
using Dev.Dotnet.Mcp.Services;
using Dev.Dotnet.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Dotnet.Mcp.Tools;

/// <summary>MCP tools for dotnet new scaffolding and directory templates.</summary>
public sealed class DotnetTools
{
    private readonly DotnetScaffolder _scaffolder;
    private readonly DirectoryTemplateService _directories;
    private readonly ToolCallHistory _history;
    private readonly ILogger<DotnetTools> _logger;

    public DotnetTools(
        DotnetScaffolder scaffolder,
        DirectoryTemplateService directories,
        ToolCallHistory history,
        ILogger<DotnetTools> logger)
    {
        _scaffolder = scaffolder;
        _directories = directories;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "scaffold_dotnet_project")]
    [Description("Runs dotnet new with template, name, and output path. Optionally adds project to a solution.")]
    public async Task<string> ScaffoldDotnetProject(
        [Description("dotnet new template, e.g. classlib, webapi")] string template,
        [Description("Project name")] string name,
        [Description("Absolute output directory path")] string output_path,
        [Description("Optional .sln path for dotnet sln add")] string? solution_path = null,
        [Description("Optional extra dotnet new flags, e.g. --framework net9.0")] string? options = null)
    {
        return await ExecuteAsync(
            "scaffold_dotnet_project",
            new { template, name, output_path, solution_path, options },
            async () =>
            {
                var result = await _scaffolder.ScaffoldAsync(template, name, output_path, solution_path, options);
                return JsonSerializer.Serialize(result, JsonDefaults.Options);
            });
    }

    [McpServerTool(Name = "create_directory_structure")]
    [Description("Creates directories (and empty files for paths with extensions) from a JSON string array of relative paths.")]
    public Task<string> CreateDirectoryStructure(
        [Description("Absolute base directory")] string base_path,
        [Description("JSON array of relative paths, e.g. [\"src/Api\", \"src/Domain/Entities/.gitkeep\"]")] string paths_json)
    {
        return ExecuteAsync(
            "create_directory_structure",
            new { base_path, paths_json },
            () =>
            {
                var result = _directories.Create(base_path, paths_json);
                return Task.FromResult(JsonSerializer.Serialize(result, JsonDefaults.Options));
            });
    }

    private async Task<string> ExecuteAsync(string toolName, object parameters, Func<Task<string>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonDefaults.Options);

        try
        {
            var result = await action();
            sw.Stop();
            _history.Record(toolName, paramJson, result, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== {Tool} ({DurationMs}ms) ===", toolName, sw.ElapsedMilliseconds);
            return result;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonSerializer.Serialize(new { error = ex.Message }, JsonDefaults.Options);
            _history.Record(toolName, paramJson, errorJson, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }
}
