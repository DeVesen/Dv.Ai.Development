using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Dev.Mcp.Web;

public sealed class LogWebServer : IHostedService, IAsyncDisposable
{
    private readonly ToolCallHistory _history;
    private readonly ILogger<LogWebServer> _logger;
    private WebApplication? _app;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public LogWebServer(ToolCallHistory history, ILogger<LogWebServer> logger)
    {
        _history = history;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var basePort = int.TryParse(Environment.GetEnvironmentVariable("LOG_VIEWER_PORT"), out var p) && p is > 0 and <= 65535
            ? p : 5050;

        Exception? lastEx = null;
        for (var port = basePort; port <= basePort + 9; port++)
        {
            WebApplication? candidate = null;
            try
            {
                var builder = WebApplication.CreateSlimBuilder();
                builder.WebHost.UseUrls($"http://localhost:{port}");
                builder.Logging.ClearProviders();
                candidate = builder.Build();

                candidate.MapGet("/", () => Results.Content(LogHtmlTemplate.GetHtml(), "text/html; charset=utf-8"));
                candidate.MapGet("/api/calls", () => Results.Json(_history.GetAll(), JsonOpts));
                candidate.MapDelete("/api/calls", () => { _history.Clear(); return Results.NoContent(); });
                candidate.MapDelete("/api/calls/{id}", (string id) => { _history.Remove(id); return Results.NoContent(); });

                await candidate.StartAsync(cancellationToken);
                _app = candidate;
                _logger.LogInformation("Dev.Mcp log viewer: http://localhost:{Port}/", port);
                return;
            }
            catch (Exception ex)
            {
                lastEx = ex;
                if (candidate is not null) await candidate.DisposeAsync();
                _logger.LogDebug("Port {Port} busy, trying next", port);
            }
        }

        _logger.LogError(lastEx, "Log viewer could not start on ports {From}-{To} — continuing without it", basePort, basePort + 9);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_app is not null)
            await _app.StopAsync(cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (_app is not null)
            await _app.DisposeAsync();
    }
}
