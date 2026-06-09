using Dev.Angular.Mcp.Services;
using Dev.Angular.Mcp.Tools;
using Dev.Angular.Mcp.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(consoleLogOptions =>
{
    consoleLogOptions.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton<AngularScaffolder>();
builder.Services.AddSingleton<ToolCallHistory>();
builder.Services.AddHostedService<LogWebServer>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<AngularTools>(AngularTools.JsonOptions);

await builder.Build().RunAsync();
