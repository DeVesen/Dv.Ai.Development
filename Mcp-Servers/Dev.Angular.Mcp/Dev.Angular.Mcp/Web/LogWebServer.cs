using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Dev.Angular.Mcp.Web;

public sealed class LogWebServer : IHostedService, IDisposable
{
    private readonly ToolCallHistory _history;
    private readonly ILogger<LogWebServer> _logger;
    private readonly HttpListener _listener = new();
    private CancellationTokenSource? _cts;
    private Task _listenTask = Task.CompletedTask;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
    };

    public LogWebServer(ToolCallHistory history, ILogger<LogWebServer> logger)
    {
        _history = history;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var port = int.TryParse(Environment.GetEnvironmentVariable("LOG_VIEWER_PORT"), out var p) && p is > 0 and <= 65535
            ? p : 8092;

        try
        {
            _listener.Prefixes.Add($"http://+:{port}/");
            _listener.Start();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Log viewer could not start on port {Port} — continuing without it", port);
            return Task.CompletedTask;
        }

        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _listenTask = RunAsync(_cts.Token);
        _logger.LogInformation("dev-angular-mcp log viewer: http://localhost:{Port}/", port);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_cts is null) return;
        await _cts.CancelAsync();
        _listener.Stop();
        try { await _listenTask.WaitAsync(cancellationToken); } catch { /* shutting down */ }
    }

    public void Dispose()
    {
        _cts?.Dispose();
        _listener.Close();
    }

    private async Task RunAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            HttpListenerContext ctx;
            try { ctx = await _listener.GetContextAsync(); }
            catch (HttpListenerException) when (token.IsCancellationRequested) { break; }
            catch (ObjectDisposedException) when (token.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogWarning(ex, "HttpListener error"); continue; }

            _ = Task.Run(() => HandleAsync(ctx, token), token)
                .ContinueWith(t => _logger.LogWarning(t.Exception, "Unhandled error in HTTP handler"),
                    TaskContinuationOptions.OnlyOnFaulted);
        }
    }

    private async Task HandleAsync(HttpListenerContext ctx, CancellationToken token)
    {
        var req = ctx.Request;
        var resp = ctx.Response;
        try
        {
            var path = req.Url?.AbsolutePath.TrimEnd('/') ?? string.Empty;
            if (path == string.Empty) path = "/";

            if (req.HttpMethod == "GET" && path == "/")
            {
                await WriteAsync(resp, 200, "text/html; charset=utf-8", LogHtmlTemplate.GetHtml(), token);
            }
            else if (req.HttpMethod == "GET" && path == "/api/calls")
            {
                var json = JsonSerializer.Serialize(_history.GetAll(), JsonOptions);
                await WriteAsync(resp, 200, "application/json", json, token);
            }
            else if (req.HttpMethod == "DELETE" && path == "/api/calls")
            {
                _history.Clear();
                resp.StatusCode = 204;
                resp.Close();
            }
            else if (req.HttpMethod == "DELETE" && path.StartsWith("/api/calls/"))
            {
                var id = path["/api/calls/".Length..];
                _history.Remove(id);
                resp.StatusCode = 204;
                resp.Close();
            }
            else
            {
                await WriteAsync(resp, 404, "text/plain", "Not Found", token);
            }
        }
        catch (Exception ex) when (!token.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Error handling HTTP request");
            try { resp.StatusCode = 500; resp.Close(); } catch { /* ignore */ }
        }
    }

    private static async Task WriteAsync(
        HttpListenerResponse resp, int status, string contentType, string body,
        CancellationToken token)
    {
        var bytes = Encoding.UTF8.GetBytes(body);
        resp.StatusCode = status;
        resp.ContentType = contentType;
        resp.ContentLength64 = bytes.Length;
        resp.Headers["Cache-Control"] = "no-store";
        await resp.OutputStream.WriteAsync(bytes, token);
        resp.Close();
    }
}
