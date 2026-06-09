using Dev.Filesystem.Mcp.Json;
using Dev.Filesystem.Mcp.Services;
using Dev.Filesystem.Mcp.Tools;
using Dev.Filesystem.Mcp.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(consoleLogOptions =>
{
    consoleLogOptions.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton<GlobSearchService>();
builder.Services.AddSingleton<ContentSearchService>();
builder.Services.AddSingleton<ImplementationSearchService>();
builder.Services.AddSingleton<CodeReadService>();
builder.Services.AddSingleton<ToolCallHistory>();
builder.Services.AddHostedService<LogWebServer>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<FilesystemTools>(JsonResultFormatter.JsonOptions);

await builder.Build().RunAsync();
