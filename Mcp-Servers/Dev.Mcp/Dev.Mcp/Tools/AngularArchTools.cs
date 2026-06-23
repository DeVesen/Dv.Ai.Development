using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;
using Dev.Mcp.Services;
using Dev.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Mcp.Tools;

public sealed class AngularArchTools
{
    private readonly AngularArchRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<AngularArchTools> _logger;

    public AngularArchTools(AngularArchRunner runner, ToolCallHistory history, ILogger<AngularArchTools> logger)
    {
        _runner = runner; _history = history; _logger = logger;
    }

    [McpServerTool(Name = "analyze_angular_architecture")]
    [Description("Static TypeScript-AST analysis of an Angular project for three architecture rules: (1) *ApiService classes must live under src/app/core/api/ (placement), (2) classes under core/api/ may only inject HttpClient — no Router, Store, or other services (naming contract), (3) classes under features/<name>/services/ must not inject HttpClient directly (use an ApiService instead). No build required. Detects both constructor injection and functional inject() calls. Returns misplaced[], httpInFeatureService[], namingViolations[], and a summary.")]
    public Task<string> AnalyzeAngularArchitecture(
        [Description("Absolute Windows path to the Angular project root (directory containing angular.json)")] string project_path)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(new { project_path }, JsonOptions.Default);
        try
        {
            var result = _runner.Analyze(project_path);
            sw.Stop();
            var json = JsonSerializer.Serialize(result, JsonOptions.Default);
            _history.Record("analyze_angular_architecture", "angular", paramJson, json, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== analyze_angular_architecture ({DurationMs}ms, files={Files}, violations={Violations}) ===",
                sw.ElapsedMilliseconds, result.Summary.FilesScanned, result.Summary.Violations);
            return Task.FromResult(json);
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record("analyze_angular_architecture", "angular", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== analyze_angular_architecture failed ===");
            return Task.FromResult(errorJson);
        }
    }
}
