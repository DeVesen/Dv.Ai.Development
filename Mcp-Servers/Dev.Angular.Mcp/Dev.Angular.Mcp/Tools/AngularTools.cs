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

/// <summary>MCP tools for Angular CLI scaffolding.</summary>
public sealed class AngularTools
{
    private readonly AngularScaffolder _scaffolder;
    private readonly ToolCallHistory _history;
    private readonly ILogger<AngularTools> _logger;

    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
    };

    public AngularTools(AngularScaffolder scaffolder, ToolCallHistory history, ILogger<AngularTools> logger)
    {
        _scaffolder = scaffolder;
        _history = history;
        _logger = logger;
    }

    [McpServerTool(Name = "scaffold_angular_component")]
    [Description(
        "Generates an Angular component via ng generate. " +
        "Defaults: --standalone --skip-tests. Use options to override defaults.")]
    public async Task<string> ScaffoldAngularComponent(
        [Description("Absolute path to the Angular project root (angular.json directory)")] string project_root,
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
        [Description("Absolute path to the Angular project root (angular.json directory)")] string project_root,
        [Description("Service name (kebab-case recommended)")] string name,
        [Description("Optional --path value, e.g. src/app/services")] string? path = null,
        [Description("Optional CLI flags replacing defaults, e.g. --flat --skip-tests")] string? options = null)
    {
        return await ExecuteAsync(
            "scaffold_angular_service",
            new { project_root, name, path, options },
            () => _scaffolder.ScaffoldServiceAsync(project_root, name, path, options));
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

    private static object ToResponse(ScaffoldResult result) => new
    {
        success = result.Success,
        createdFiles = result.CreatedFiles,
        exitCode = result.ExitCode,
        error = result.Error,
        stdout = result.Stdout,
        stderr = result.Stderr,
    };
}
