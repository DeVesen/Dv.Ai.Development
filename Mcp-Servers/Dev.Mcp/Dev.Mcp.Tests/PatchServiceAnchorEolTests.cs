using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class PatchServiceAnchorEolTests : IDisposable
{
    private readonly string _dir;
    private readonly PatchService _patch = new();

    public PatchServiceAnchorEolTests()
    {
        _dir = Path.Combine(Path.GetTempPath(), "devmcp-patch-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_dir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_dir, recursive: true); } catch { }
    }

    private string WriteBytes(string name, string exactContent)
    {
        var p = Path.Combine(_dir, name);
        File.WriteAllText(p, exactContent); // written verbatim; no EOL translation
        return p;
    }

    [Fact]
    public void MultiLineAnchor_OnCrlfFile_MatchesAndKeepsCrlf()
    {
        var path = WriteBytes("crlf.txt", "foo\r\nbar\r\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\r\nBAR\r\nbaz\r\n", File.ReadAllText(path));
    }

    [Fact]
    public void MultiLineAnchor_OnLfFile_MatchesAndKeepsLf()
    {
        var path = WriteBytes("lf.txt", "foo\nbar\nbaz\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\nBAR\nbaz\n", File.ReadAllText(path));
    }

    [Fact]
    public void MultiLineAnchor_OnMixedEolFile_UsesDominantAndLeavesUnrelatedLineUntouched()
    {
        // 3x CRLF vs 1x lone LF -> dominant is CRLF; the lone-LF "keep" line is unrelated and must stay LF.
        var path = WriteBytes("mixed.txt", "foo\r\nbar\r\nkeep\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\r\nBAR\r\nkeep\nbaz\r\n", File.ReadAllText(path));
    }

    [Fact]
    public void SingleLineAnchor_OnCrlfFile_StillWorks()
    {
        var path = WriteBytes("single.txt", "foo\r\nbar\r\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "bar", "BAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("foo\r\nBAR\r\nbaz\r\n", File.ReadAllText(path));
    }
}
