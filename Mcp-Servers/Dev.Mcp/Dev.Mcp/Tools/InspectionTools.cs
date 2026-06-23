using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;
using Dev.Mcp.Services;
using Dev.Mcp.Web;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

namespace Dev.Mcp.Tools;

public sealed class InspectionTools
{
    private readonly InspectionRunner _runner;
    private readonly ToolCallHistory _history;
    private readonly ILogger<InspectionTools> _logger;

    public InspectionTools(InspectionRunner runner, ToolCallHistory history, ILogger<InspectionTools> logger)
    {
        _runner = runner; _history = history; _logger = logger;
    }

    [McpServerTool(Name = "run_inspectcode")]
    [Description("Runs JetBrains jb inspectcode on a .NET solution and returns token-optimized static analysis findings. Requires jb CLI (dotnet tool install -g JetBrains.ReSharper.GlobalTools) and a prior successful build (uses --no-build). Returns errors, warnings, and suggestions each with file/line/rule/msg.")]
    public async Task<string> RunInspectCode(
        [Description("Absolute Windows path to the .sln or .slnx solution file")] string solution_path)
    {
        var sw = Stopwatch.StartNew();
        var paramJson = JsonSerializer.Serialize(new { solution_path }, JsonOptions.Default);
        try
        {
            var result = await _runner.RunInspectCodeAsync(solution_path);
            sw.Stop();
            var json = JsonSerializer.Serialize(result, JsonOptions.Default);
            _history.Record("run_inspectcode", "dotnet", paramJson, json, result.ConsoleOutput, sw.ElapsedMilliseconds);
            _logger.LogInformation("=== run_inspectcode ({DurationMs}ms, success={Success}) ===", sw.ElapsedMilliseconds, result.Success);
            return json;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorJson = JsonOptions.Error(ex.Message);
            _history.Record("run_inspectcode", "dotnet", paramJson, errorJson, string.Empty, sw.ElapsedMilliseconds);
            _logger.LogError(ex, "=== run_inspectcode failed ===");
            return errorJson;
        }
    }
}
