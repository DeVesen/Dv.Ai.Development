using Dev.Filesystem.Mcp.Web;

namespace Dev.Filesystem.Mcp.Tests;

public sealed class ToolCallHistoryTests
{
    [Fact]
    public void Record_KeepsMax200Entries()
    {
        var history = new ToolCallHistory();
        for (var i = 0; i < 250; i++)
            history.Record("find_file", $"{{\"i\":{i}}}", $"output-{i}", 1);

        Assert.Equal(200, history.GetAll().Count);
        Assert.Equal("250", history.GetAll()[0].Id);
        Assert.Equal("51", history.GetAll()[^1].Id);
    }

    [Fact]
    public void Clear_RemovesAllEntries()
    {
        var history = new ToolCallHistory();
        history.Record("find_file", "{}", "[]", 5);
        history.Clear();
        Assert.Empty(history.GetAll());
    }
}
