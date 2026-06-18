using Dev.WindowsService.Mcp.Services;
using Dev.WindowsService.Mcp.Tools;
using Dev.WindowsService.Mcp.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

// Filesystem services
builder.Services.AddSingleton<AllowedDirectoriesService>();
builder.Services.AddSingleton<GlobSearchService>();
builder.Services.AddSingleton<ContentSearchService>();
builder.Services.AddSingleton<ImplementationSearchService>();
builder.Services.AddSingleton<CodeReadService>();

// Dotnet services
builder.Services.AddSingleton<DotnetScaffolder>();
builder.Services.AddSingleton<DirectoryTemplateService>();
builder.Services.AddSingleton<DotnetRunner>();

// Angular services
builder.Services.AddSingleton<AngularScaffolder>();
builder.Services.AddSingleton<AngularRunner>();

// Shared log viewer
builder.Services.AddSingleton<ToolCallHistory>();
builder.Services.AddHostedService<LogWebServer>();

// MCP via stdio — Claude Code / Claude Desktop starts this process as child
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<FilesystemTools>()
    .WithTools<DotnetTools>()
    .WithTools<AngularTools>();

await builder.Build().RunAsync();
