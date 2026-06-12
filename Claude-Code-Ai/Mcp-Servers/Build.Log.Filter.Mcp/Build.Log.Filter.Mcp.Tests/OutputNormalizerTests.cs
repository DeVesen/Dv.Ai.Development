using Build.Log.Filter.Mcp.Filtering;

namespace Build.Log.Filter.Mcp.Tests;

public class OutputNormalizerTests
{
    private readonly OutputNormalizer _n = new();

    [Fact]
    public void StripAnsi_And_NormalizeLineEndings()
    {
        var raw = "line1\x1b[31mred\x1b[0m\r\nline2";
        var s = _n.Normalize(raw);
        Assert.Equal("line1red\nline2", s);
    }
}
