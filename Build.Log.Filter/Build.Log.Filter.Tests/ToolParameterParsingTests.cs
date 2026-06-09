using Build.Log.Filter;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Tests;

public class ToolParameterParsingTests
{
    [Fact]
    public void Parses_ToolType_CaseInsensitive()
    {
        Assert.True(ToolParameterParsing.TryParseToolType("dotnetbuild", out var t, out _));
        Assert.Equal(ToolType.DotnetBuild, t);
    }
}
