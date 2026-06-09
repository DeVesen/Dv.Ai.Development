using Build.Log.Filter.Filtering;
using Build.Log.Filter.Models;
using Build.Log.Filter.Streaming;
using Build.Log.Filter.Tools;
using Build.Log.Filter.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(consoleLogOptions =>
{
    consoleLogOptions.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton(_ => new FilterLimits());
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<OutputNormalizer>();
builder.Services.AddSingleton<IToolOutputParser, DotnetBuildParser>();
builder.Services.AddSingleton<IToolOutputParser, DotnetTestParser>();
builder.Services.AddSingleton<IToolOutputParser, DotnetRestoreParser>();
builder.Services.AddSingleton<IToolOutputParser, DotnetFormatParser>();
builder.Services.AddSingleton<IToolOutputParser, AngularBuildParser>();
builder.Services.AddSingleton<IToolOutputParser, AngularTestParser>();
builder.Services.AddSingleton<IToolOutputParser, JestParser>();
builder.Services.AddSingleton<IToolOutputParser, VitestParser>();
builder.Services.AddSingleton<IToolOutputParser, NodeScriptParser>();
builder.Services.AddSingleton<OutputFilterService>();
builder.Services.AddSingleton<StreamFilterSessionManager>();
builder.Services.AddSingleton<FilterCallHistory>();
builder.Services.AddHostedService<BufferWebServer>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<OutputFilterTools>(FilterResultFormatter.JsonOptions);

await builder.Build().RunAsync();
