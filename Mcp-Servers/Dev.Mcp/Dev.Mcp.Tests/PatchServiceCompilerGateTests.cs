using System.Diagnostics;
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

/// <summary>
/// Regression tests for the apply_text_patch tsc compiler gate routed through
/// ProcessRunner. Each spawns a real batch/shell wrapper via full-path resolution;
/// the pre-fix bare-name launch cannot find it, so every test fails before the fix
/// (gate reports Ran=false) and passes after.
/// </summary>
public sealed class PatchServiceCompilerGateTests
{
    [Fact]
    public async Task TsCompilerGate_PassingTscThroughResolvedCmd_GateRunsAndPatchSucceeds()
    {
        using var fx = new TscGateFixture(TscOutcome.Pass);
        var patch = new PatchService();

        var result = await patch.ApplyAnchorPatchAsync(fx.TsFile, "41", "42",
            runCompilerGate: true, dryRun: false, rollbackOnError: true);

        Assert.NotNull(result.CompilerGate);
        Assert.True(result.CompilerGate!.Ran, "compiler gate did not run — tsc.cmd was not resolved");
        Assert.Equal(0, result.CompilerGate.ErrorCount);
        Assert.True(result.Success, result.Error);
        Assert.Contains("42", File.ReadAllText(fx.TsFile));
    }

    [Fact]
    public async Task TsCompilerGate_FailingTscThroughResolvedCmd_ReportsErrorsAndRollsBack()
    {
        using var fx = new TscGateFixture(TscOutcome.Fail);
        var patch = new PatchService();
        var original = File.ReadAllText(fx.TsFile);

        var result = await patch.ApplyAnchorPatchAsync(fx.TsFile, "41", "42",
            runCompilerGate: true, dryRun: false, rollbackOnError: true);

        Assert.NotNull(result.CompilerGate);
        Assert.True(result.CompilerGate!.Ran, "compiler gate did not run — tsc.cmd was not resolved");
        Assert.True(result.CompilerGate.ErrorCount >= 1, "expected the TS error to be parsed");
        Assert.False(result.Success);
        Assert.Equal(original, File.ReadAllText(fx.TsFile)); // rolled back on gate failure
    }

    [Fact]
    public async Task TsCompilerGate_LingeringChildHoldsPipe_ReturnsPromptlyWithRealExit()
    {
        using var fx = new TscGateFixture(TscOutcome.LingerPass);
        var patch = new PatchService();

        var sw = Stopwatch.StartNew();
        var result = await patch.ApplyAnchorPatchAsync(fx.TsFile, "41", "42",
            runCompilerGate: true, dryRun: false, rollbackOnError: true);
        sw.Stop();

        Assert.NotNull(result.CompilerGate);
        Assert.True(result.CompilerGate!.Ran, "compiler gate did not run — tsc.cmd was not resolved");
        Assert.Equal(0, result.CompilerGate.ErrorCount);
        Assert.True(result.Success, result.Error);
        // Real exit code (0) captured despite a child holding the pipe for 25s: the
        // gate must return well before that, proving exit is decoupled from drain.
        Assert.True(sw.Elapsed < TimeSpan.FromSeconds(20), $"gate took {sw.Elapsed}");
    }
}
