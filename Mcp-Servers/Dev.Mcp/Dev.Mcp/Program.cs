using Dev.Mcp.Services;
using Dev.Mcp.Tools;
using Dev.Mcp.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

// Write crash log next to the exe so crashes are diagnosable without a debugger.
static void WriteCrashLog(object exceptionObject)
{
    try
    {
        var dir = AppContext.BaseDirectory;
        var file = Path.Combine(dir, "crash.log");
        var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {exceptionObject}{Environment.NewLine}";
        File.AppendAllText(file, line);
    }
    catch { /* never throw from a crash handler */ }
}

AppDomain.CurrentDomain.UnhandledException += (_, e) => WriteCrashLog(e.ExceptionObject);
TaskScheduler.UnobservedTaskException += (_, e) => { WriteCrashLog(e.Exception); e.SetObserved(); };

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

try
{
    await builder.Build().RunAsync();
}
catch (Exception ex)
{
    WriteCrashLog(ex);
    throw;
}
