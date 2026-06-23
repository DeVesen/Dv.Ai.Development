using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;
using Dev.Mcp.Services;
using Dev.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Mcp.Tools;

public sealed class AngularTools
{
    private readonly AngularScaffolder _scaffolder;
    private readonly AngularRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<AngularTools> _logger;

    public AngularTools(AngularScaffolder scaffolder, AngularRunner runner, ToolCallHistory history, ILogger<AngularTools> logger)
    {
        _scaffolder = scaffolder; _runner = runner; _history = history; _logger = logger;
    }

    [McpServerTool(Name = "create_angular_project")]
    [Description("Creates a new Angular workspace via ng new. Defaults: --standalone --skip-tests --routing --style=scss.")]
    public async Task<string> CreateAngularProject(
        [Description("Absolute path to the parent directory where the project folder will be created")] string parent_directory,
        [Description("Project name (kebab-case recommended)")] string name,
        [Description("Optional CLI flags replacing defaults, e.g. --style=css --no-routing")] string? options = null) =>
        await ExecuteScaffoldAsync("create_angular_project", new { parent_directory, name, options },
            () => _scaffolder.CreateProjectAsync(parent_directory, name, options));

    [McpServerTool(Name = "scaffold_angular_component")]
    [Description("Generates an Angular component via ng generate. Defaults: --standalone --skip-tests.")]
    public async Task<string> ScaffoldAngularComponent(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Component name (kebab-case recommended)")] string name,
        [Description("Optional --path value, e.g. src/app/shared")] string? path = null,
        [Description("Optional CLI flags replacing defaults")] string? options = null) =>
        await ExecuteScaffoldAsync("scaffold_angular_component", new { project_root, name, path, options },
            () => _scaffolder.ScaffoldComponentAsync(project_root, name, path, options));

    [McpServerTool(Name = "scaffold_angular_service")]
    [Description("Generates an Angular service via ng generate. Default: --skip-tests.")]
    public async Task<string> ScaffoldAngularService(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Service name (kebab-case recommended)")] string name,
        [Description("Optional --path value, e.g. src/app/services")] string? path = null,
        [Description("Optional CLI flags replacing defaults")] string? options = null) =>
        await ExecuteScaffoldAsync("scaffold_angular_service", new { project_root, name, path, options },
            () => _scaffolder.ScaffoldServiceAsync(project_root, name, path, options));

    [McpServerTool(Name = "scaffold_angular_directive")]
    [Description("Generates an Angular directive via ng generate. Defaults: --standalone --skip-tests.")]
    public async Task<string> ScaffoldAngularDirective(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Directive name (kebab-case recommended)")] string name,
        [Description("Optional --path value")] string? path = null,
        [Description("Optional CLI flags replacing defaults")] string? options = null) =>
        await ExecuteScaffoldAsync("scaffold_angular_directive", new { project_root, name, path, options },
            () => _scaffolder.ScaffoldDirectiveAsync(project_root, name, path, options));

    [McpServerTool(Name = "scaffold_spec_for")]
    [Description("Creates a .spec.ts skeleton next to the given source file. Detects Component/Service/Pipe/Directive and picks the right TestBed template. Fails if spec already exists unless force=true.")]
    public async Task<string> ScaffoldSpecFor(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Absolute path (or project-relative path) to the .ts source file to generate a spec for")] string source_file_path,
        [Description("Overwrite existing spec file if true (default false)")] bool force = false) =>
        await ExecuteScaffoldAsync("scaffold_spec_for", new { project_root, source_file_path, force },
            () => _scaffolder.ScaffoldSpecAsync(project_root, source_file_path, force));

    [McpServerTool(Name = "build_angular_project")]
    [Description("Runs ng build in the Angular project root and returns a filtered result (errors, warnings, summary).")]
    public async Task<string> BuildAngularProject(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Optional build configuration, e.g. production, development")] string? configuration = null) =>
        await ExecuteBuildAsync("build_angular_project", new { project_root, configuration },
            () => _runner.BuildAsync(project_root, configuration));

    [McpServerTool(Name = "test_angular_project")]
    [Description("Runs ng test --watch=false and returns a filtered result (failed tests and summary). Use include_patterns or test_name_pattern to run a subset of specs.")]
    public async Task<string> TestAngularProject(
        [Description("Absolute path to the Angular project root")] string project_root,
        [Description("Optional extra ng test flags")] string? options = null,
        [Description("Optional spec include glob patterns, e.g. [\"src/app/feature/**/*.spec.ts\"]")] string? include_patterns = null,
        [Description("Optional spec basename pattern, e.g. 'my-service' adds --include=**/my-service.spec.ts")] string? test_name_pattern = null)
    {
        // Build effective options
        var effectiveOptions = options ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(include_patterns))
        {
            List<string> globs = [];
            try { globs = JsonSerializer.Deserialize<List<string>>(include_patterns, JsonOptions.Default) ?? []; }
            catch { /* treat as single glob */ globs = [include_patterns]; }
            foreach (var glob in globs)
                effectiveOptions += $" --include={glob}";
        }

        if (!string.IsNullOrWhiteSpace(test_name_pattern))
            effectiveOptions += $" --include=**/*{test_name_pattern}*.spec.ts";

        effectiveOptions = effectiveOptions.Trim();

        return await ExecuteBuildAsync("test_angular_project", new { project_root, options, include_patterns, test_name_pattern },
            () => _runner.TestAsync(project_root, string.IsNullOrWhiteSpace(effectiveOptions) ? null : effectiveOptions));
    }

    private async Task<string> ExecuteScaffoldAsync(string toolName, object parameters, Func<Task<AngularScaffoldResult>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonOptions.Default);
        try
        {
            var result = await action();
            sw.Stop();
            var json = JsonSerializer.Serialize(new { success = result.Success, createdFiles = result.CreatedFiles, exitCode = result.ExitCode, error = result.Error }, JsonOptions.Default);
            var console = string.Join("\n", new[] { result.Stdout, result.Stderr }.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s!.Trim()));
            _history.Record(toolName, "angular", paramJson, json, console, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== {Tool} ({DurationMs}ms, success={Success}) ===", toolName, sw.ElapsedMilliseconds, result.Success);
            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record(toolName, "angular", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }

    private async Task<string> ExecuteBuildAsync(string toolName, object parameters, Func<Task<AngularBuildResult>> action)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(parameters, JsonOptions.Default);
        try
        {
            var result = await action();
            sw.Stop();
            var json = JsonSerializer.Serialize(new { success = result.Success, command = result.Command, errors = result.Errors, warnings = result.Warnings, exitCode = result.ExitCode, summary = result.Summary }, JsonOptions.Default);
            _history.Record(toolName, "angular", paramJson, json, result.ConsoleOutput, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== {Tool} ({DurationMs}ms, success={Success}) ===", toolName, sw.ElapsedMilliseconds, result.Success);
            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record(toolName, "angular", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== {Tool} failed ===", toolName);
            return errorJson;
        }
    }
}
