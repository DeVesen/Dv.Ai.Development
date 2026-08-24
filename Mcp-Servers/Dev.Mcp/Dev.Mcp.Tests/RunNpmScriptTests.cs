using Dev.Mcp.Tools;

namespace Dev.Mcp.Tests;

public sealed class RunNpmScriptTests
{
    [Fact]
    public async Task RunNpmInternalAsync_PassingScript_ReportsSuccess()
    {
        using var fx = new NpmScriptFixture();
        var result = await AngularTools.RunNpmInternalAsync(fx.Dir, "pass", null);

        Assert.True(result.Success, $"exitCode={result.ExitCode} summary={result.Summary}");
        Assert.Equal(0, result.ExitCode);
    }

    [Fact]
    public async Task RunNpmInternalAsync_FailingScript_ReportsFailure()
    {
        using var fx = new NpmScriptFixture();
        var result = await AngularTools.RunNpmInternalAsync(fx.Dir, "fail", null);

        Assert.False(result.Success);
        Assert.Equal(1, result.ExitCode);
    }

    [Fact]
    public async Task RunNpmInternalAsync_Ci_UsesNpmCiCommand()
    {
        using var fx = new NpmScriptFixture();
        var result = await AngularTools.RunNpmInternalAsync(fx.Dir, "ci", null);

        Assert.Equal("npm ci", result.Command);
    }
}
