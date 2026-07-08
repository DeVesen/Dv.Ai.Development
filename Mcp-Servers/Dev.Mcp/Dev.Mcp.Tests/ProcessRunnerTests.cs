using System.Diagnostics;
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ProcessRunnerTests
{
    [Fact]
    public async Task RunAsync_PassingScript_ReportsExitCodeZero()
    {
        using var fx = new NpmScriptFixture();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run pass", fx.Dir, timeoutSeconds: 60);

        Assert.False(result.TimedOut);
        Assert.Equal(0, result.ExitCode);
    }

    [Fact]
    public async Task RunAsync_FailingScript_ReportsExitCodeOne()
    {
        using var fx = new NpmScriptFixture();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run fail", fx.Dir, timeoutSeconds: 60);

        Assert.False(result.TimedOut);
        Assert.Equal(1, result.ExitCode);
    }

    [Fact]
    public async Task RunAsync_PassingScriptWithLingeringChild_ReturnsExitZeroWithoutWaitingForChild()
    {
        using var fx = new NpmScriptFixture();
        var sw = Stopwatch.StartNew();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run lingerpass", fx.Dir, timeoutSeconds: 60);
        sw.Stop();

        Assert.False(result.TimedOut);
        Assert.Equal(0, result.ExitCode);
        // Must return well before the 25s lingering child dies (proves exit code
        // is decoupled from stream drain). Generous ceiling for npm startup + grace.
        Assert.True(sw.Elapsed < TimeSpan.FromSeconds(20), $"took {sw.Elapsed}");
    }
}
