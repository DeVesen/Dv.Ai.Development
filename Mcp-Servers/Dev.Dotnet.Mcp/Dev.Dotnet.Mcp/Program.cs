using Dev.Dotnet.Mcp.Models;
using Dev.Dotnet.Mcp.Services;
using Dev.Dotnet.Mcp.Tools;
using Dev.Dotnet.Mcp.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(consoleLogOptions =>
{
    consoleLogOptions.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton<DotnetScaffolder>();
builder.Services.AddSingleton<DirectoryTemplateService>();
builder.Services.AddSingleton<ToolCallHistory>();
builder.Services.AddHostedService<LogWebServer>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<DotnetTools>(JsonDefaults.Options);

await builder.Build().RunAsync();
