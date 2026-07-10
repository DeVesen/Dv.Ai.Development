using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ContentSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly ContentSearchService _svc = new();

    public ContentSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-content-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        File.WriteAllText(Path.Combine(_root, "File1.cs"), "public class Foo { string Bar = \"hello\"; }");
        File.WriteAllText(Path.Combine(_root, "File2.cs"), "public class Baz { }");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindByContent_WhenPatternMatches_ReturnsResultWithPositiveFilesScanned()
    {
        var result = _svc.FindByContent(_root, "hello", fileGlob: null, maxResults: 20);

        Assert.Single(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 1);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindByContent_WhenNoMatch_ReturnsEmptyResultsWithBothFilesScanned()
    {
        var result = _svc.FindByContent(_root, "xyz_definitely_not_present", fileGlob: null, maxResults: 20);

        Assert.Empty(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindByContent_WhenMaxResultsExceeded_SetsTruncatedTrueAndStopsOuterLoop()
    {
        for (var i = 0; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Extra{i}.cs"), $"match_{i} match_{i} match_{i}");

        var result = _svc.FindByContent(_root, @"match_\d", fileGlob: null, maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }
}
