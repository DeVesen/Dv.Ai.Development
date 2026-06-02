using System.Net;
using System.Text;
using System.Text.Json;
using Generic.Rtk.Streaming;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Generic.Rtk.Web;

public sealed class BufferWebServer : IHostedService, IDisposable
{
    private readonly FilterCallHistory _history;
    private readonly ILogger<BufferWebServer> _logger;
    private readonly HttpListener _listener = new();
    private CancellationTokenSource _cts = new();
    private Task _listenTask = Task.CompletedTask;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public BufferWebServer(FilterCallHistory history, ILogger<BufferWebServer> logger)
    {
        _history = history;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var port = int.TryParse(Environment.GetEnvironmentVariable("BUFFER_WEB_PORT"), out var p) ? p : 8089;
        _listener.Prefixes.Add($"http://+:{port}/");
        _listener.Start();
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _listenTask = RunAsync(_cts.Token);
        _logger.LogInformation("Buffer web UI: http://localhost:{Port}/", port);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        await _cts.CancelAsync();
        _listener.Stop();
        try { await _listenTask.WaitAsync(cancellationToken); } catch { /* shutting down */ }
    }

    public void Dispose()
    {
        _cts.Dispose();
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

            _ = Task.Run(() => HandleAsync(ctx, token), token);
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
                await WriteAsync(resp, 200, "text/html; charset=utf-8", BufferHtmlTemplate.GetHtml(), token);
            }
            else if (req.HttpMethod == "GET" && path == "/api/buffer")
            {
                var json = JsonSerializer.Serialize(_history.GetAll(), JsonOptions);
                await WriteAsync(resp, 200, "application/json", json, token);
            }
            else if (req.HttpMethod == "DELETE" && path == "/api/buffer")
            {
                _history.Clear();
                resp.StatusCode = 204;
                resp.Close();
            }
            else if (req.HttpMethod == "DELETE" && path.StartsWith("/api/buffer/"))
            {
                var id = path["/api/buffer/".Length..];
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
