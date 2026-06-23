using Dev.Mcp.Services;
using Dev.Mcp.Tools;
using Dev.Mcp.Web;
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
builder.Services.AddSingleton<InspectionRunner>();

// Angular services
builder.Services.AddSingleton<AngularScaffolder>();
builder.Services.AddSingleton<AngularRunner>();
builder.Services.AddSingleton<LintRunner>();
builder.Services.AddSingleton<AngularArchRunner>();

// New extended services (P0/P1/P2)
builder.Services.AddSingleton<PatchService>();
builder.Services.AddSingleton<GitService>();
builder.Services.AddSingleton<SliceTestTargetsService>();
builder.Services.AddSingleton<ImpactAnalysisService>();
builder.Services.AddSingleton<AngularDiscoveryService>();
builder.Services.AddSingleton<DotnetDiscoveryService>();
builder.Services.AddSingleton<FileOperationsService>();

// Shared log viewer
builder.Services.AddSingleton<ToolCallHistory>();
builder.Services.AddHostedService<LogWebServer>();

// MCP via stdio — Claude Code / Claude Desktop starts this process as child
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<FilesystemTools>()
    .WithTools<DotnetTools>()
    .WithTools<AngularTools>()
    .WithTools<ExtendedFilesystemTools>()
    .WithTools<GitAndTestTools>()
    .WithTools<InspectionTools>()
    .WithTools<LintTools>()
    .WithTools<AngularArchTools>();

await builder.Build().RunAsync();
