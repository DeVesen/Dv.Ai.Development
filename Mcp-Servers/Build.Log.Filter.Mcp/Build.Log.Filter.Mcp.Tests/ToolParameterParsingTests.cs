using Build.Log.Filter.Mcp;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Tests;

public class ToolParameterParsingTests
{
    [Fact]
    public void Parses_ToolType_CaseInsensitive()
    {
        Assert.True(ToolParameterParsing.TryParseToolType("dotnetbuild", out var t, out _));
        Assert.Equal(ToolType.DotnetBuild, t);
    }
}
