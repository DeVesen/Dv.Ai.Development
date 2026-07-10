using Dev.Mcp.Models;

namespace Dev.Mcp.Tests;

public sealed class SearchMetaTests
{
    [Fact]
    public void Build_WhenNotTruncated_ReturnsNoneReasonAndNullHint()
    {
        var meta = SearchMeta.Build(truncated: false, filesScanned: 42, maxResults: 20);

        Assert.False(meta.Truncated);
        Assert.Equal("none", meta.Reason);
        Assert.Equal(42, meta.FilesScanned);
        Assert.Null(meta.Hint);
    }

    [Fact]
    public void Build_WhenTruncated_ReturnsMaxResultsReasonAndHintContainingLimit()
    {
        var meta = SearchMeta.Build(truncated: true, filesScanned: 312, maxResults: 20);

        Assert.True(meta.Truncated);
        Assert.Equal("max_results_reached", meta.Reason);
        Assert.Equal(312, meta.FilesScanned);
        Assert.NotNull(meta.Hint);
        Assert.Contains("20", meta.Hint);
    }
}
