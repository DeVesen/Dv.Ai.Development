using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Dev.Angular.Mcp.Models;
using Dev.Angular.Mcp.Services;
using Dev.Angular.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Angular.Mcp.Tools;

/// <summary>MCP tools for Angular CLI scaffolding, build, and test.</summary>
public sealed class AngularTools
{
    private readonly AngularScaffolder _scaffolder;
    private readonly AngularRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<AngularTools> _logger;

    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
    };

    public AngularTools(AngularScaffolder scaffolder, AngularRunner runner, ToolCallHistory history, ILogger<AngularTools> logger)
    {
        _scaffolder = scaffolder;
        _runner = runner;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "scaffold_angular_component")]
    [Description(
        "Generates an Angular component via ng generate. " +
        "Defaults: --standalone --skip-tests. Use options to override defaults.")]
    public async Task<string> ScaffoldAngularComponent(
        [Description("Container-absolute path to the Angular project root, e.g. /workspace/frontend (mapped from ${workspaceFolder}:/workspace)")] string project_root,
        [Description("Component name (kebab-case recommended)")] string name,
        [Description("Optional --path value, e.g. src/app/shared")] string? path = null,
        [Description("Optional CLI flags replacing defaults, e.g. --inline-style --skip-tests")] string? options = null)
    {
        return await ExecuteAsync(
            "scaffold_angular_component",
            new { project_root, name, path, options },
            () => _scaffolder.ScaffoldComponentAsync(project_root, name, path, options));
    }

    [McpServerTool(Name = "scaffold_angular_service")]
    [Description(
        "Generates an Angular service via ng generate. " +
        "Default: --skip-tests. Use options to override defaults.")]
    public async Task<string> ScaffoldAngularService(
        [Description("Container-absolute path to the Angular project root, e.g. /workspace/frontend (mapped from ${workspaceFolder}:/workspace)")] string project_root,
        [Description("Service name (kebab-case recommended)")] string name,
        [Description("Optional --path value, e.g. src/app/services")] string? path = null,
        [Description("Optional CLI flags replacing defaults, e.g. --flat --skip-tests")] string? options = null)
    {
        return await ExecuteAsync(
            "scaffold_angular_service",
            new { project_root, name, path, options },
            () => _scaffolder.ScaffoldServiceAsync(project_root, name, path, options));
    }

    [McpServerTool(Name = "build_angular_project")]
    [Description(
        "Runs ng build in the Angular project root and returns a filtered result. " +
        "Raw console output is never forwarded — only structured errors, warnings, and a summary are returned. " +
        "Defaults to the 'production' configuration unless overridden.")]
    public async Task<string> BuildAngularProject(
        [Description("Container-absolute path to the Angular project root, e.g. /workspace/frontend (mapped from ${workspaceFolder}:/workspace)")] string project_root,
        [Description("Optional build configuration, e.g. production, development")] string? configuration = null)
    {
        return await ExecuteAsync(
            "build_angular_project",
            new { project_root, configuration },
            () => _runner.BuildAsync(project_root, configuration));
    }

    [McpServerTool(Name = "test_angular_project")]
    [Description(
        "Runs ng test --watch=false in the Angular project root and returns a filtered result. " +
        "Raw console output is never forwarded — only failed test names and a summary are returned. " +
        "For containerized environments add '--browsers=ChromeHeadlessCI' via options.")]
    public async Task<string> TestAngularProject(
        [Description("Container-absolute path to the Angular project root, e.g. /workspace/frontend (mapped from ${workspaceFolder}:/workspace)")] string project_root,
        [Description("Optional extra ng test flags, e.g. --browsers=ChromeHeadlessCI")] string? options = null)
    {
        return await ExecuteAsync(
            "test_angular_project",
            new { project_root, options },
            () => _runner.TestAsync(project_root, options));
    }

    private async Task<string> ExecuteAsync(
        string toolName,
        object parameters,
        Func<Task<ScaffoldResult>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonOptions);

        try
        {
            var result = await action();
            sw.Stop();

            var json = JsonSerializer.Serialize(ToResponse(result), JsonOptions);
            _history.Record(toolName, paramJson, json, sw.ElapsedMilliseconds);
            _logger.LogInformation(
                "=== {Tool} ({DurationMs}ms, success={Success}, files={FileCount}) ===",
                toolName, sw.ElapsedMilliseconds, result.Success, result.CreatedFiles.Count);

            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonSerializer.Serialize(new { error = ex.Message }, JsonOptions);
            _history.Record(toolName, paramJson, errorJson, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }

    private async Task<string> ExecuteAsync(
        string toolName,
        object parameters,
        Func<Task<BuildResult>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonOptions);

        try
        {
            var result = await action();
            sw.Stop();

            var json = JsonSerializer.Serialize(ToBuildResponse(result), JsonOptions);
            _history.Record(toolName, paramJson, json, sw.ElapsedMilliseconds);
            _logger.LogInformation(
                "=== {Tool} ({DurationMs}ms, success={Success}, errors={ErrorCount}) ===",
                toolName, sw.ElapsedMilliseconds, result.Success, result.Errors.Length);

            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonSerializer.Serialize(new { error = ex.Message }, JsonOptions);
            _history.Record(toolName, paramJson, errorJson, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }

    private static object ToResponse(ScaffoldResult result) => new
    {
        success = result.Success,
        createdFiles = result.CreatedFiles,
        exitCode = result.ExitCode,
        error = result.Error,
    };

    private static object ToBuildResponse(BuildResult result) => new
    {
        success = result.Success,
        command = result.Command,
        errors = result.Errors,
        warnings = result.Warnings,
        exitCode = result.ExitCode,
        summary = result.Summary,
    };
}
