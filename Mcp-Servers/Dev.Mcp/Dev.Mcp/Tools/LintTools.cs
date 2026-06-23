using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;
using Dev.Mcp.Services;
using Dev.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Mcp.Tools;

public sealed class LintTools
{
    private readonly LintRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<LintTools> _logger;

    public LintTools(LintRunner runner, ToolCallHistory history, ILogger<LintTools> logger)
    {
        _runner = runner; _history = history; _logger = logger;
    }

    [McpServerTool(Name = "lint_angular_project")]
    [Description("Runs ng lint --format=json on an Angular project and returns token-optimized ESLint findings. Requires @angular-eslint configured in angular.json (run ng add @angular-eslint for setup). eslint-plugin-boundaries runs automatically when configured in the project ESLint config. Returns errors and warnings each with file/line/rule/msg.")]
    public async Task<string> LintAngularProject(
        [Description("Absolute Windows path to the Angular project root (directory containing angular.json)")] string project_path)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(new { project_path }, JsonOptions.Default);
        try
        {
            var result = await _runner.LintAsync(project_path);
            sw.Stop();
            var json = JsonSerializer.Serialize(result, JsonOptions.Default);
            _history.Record("lint_angular_project", "angular", paramJson, json, result.ConsoleOutput, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== lint_angular_project ({DurationMs}ms, success={Success}) ===", sw.ElapsedMilliseconds, result.Success);
            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record("lint_angular_project", "angular", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== lint_angular_project failed ===");
            return errorJson;
        }
    }
}
