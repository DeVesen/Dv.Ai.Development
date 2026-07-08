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

    [Fact]
    public async Task RunAsync_LingeringChild_IsReapedNotLeaked()
    {
        // The Job Object teardown that reaps a detached/orphaned grandchild is
        // Windows-only; on other OSes Process.Kill(tree) can't reach the orphan.
        if (!OperatingSystem.IsWindows()) return;

        using var fx = new NpmScriptFixture();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run reapmark", fx.Dir, timeoutSeconds: 60);
        Assert.Equal(0, result.ExitCode);

        // The orphaned grandchild would write its marker 4s after spawn. RunAsync
        // reaps the whole job before returning, so the marker must never appear.
        // Wait comfortably past that 4s deadline to prove the child was killed.
        await Task.Delay(TimeSpan.FromSeconds(6));
        Assert.False(File.Exists(fx.MarkerPath),
            "orphaned grandchild survived the Job Object reap and wrote its marker");
    }
}
