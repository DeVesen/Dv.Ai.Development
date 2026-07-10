using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class GlobSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly GlobSearchService _svc = new();

    public GlobSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-glob-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_root, "src", "deep", "nested"));
        File.WriteAllText(Path.Combine(_root, "src", "deep", "nested", "Target.cs"), "// target");
        File.WriteAllText(Path.Combine(_root, "src", "Other.ts"), "// other");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindFile_WhenFileExists_ReturnsResultWithPositiveFilesScanned()
    {
        var result = _svc.FindFile(_root, "Target.cs", maxResults: 20);

        Assert.Single(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 1);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindFile_WhenNoMatch_ReturnsEmptyResultsWithFilesScannedAboveZero()
    {
        var result = _svc.FindFile(_root, "DoesNotExist.xyz", maxResults: 20);

        Assert.Empty(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindFile_WhenMaxResultsExceeded_SetsTruncatedTrueWithHint()
    {
        for (var i = 0; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"File{i}.cs"), string.Empty);

        var result = _svc.FindFile(_root, "*.cs", maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }
}
