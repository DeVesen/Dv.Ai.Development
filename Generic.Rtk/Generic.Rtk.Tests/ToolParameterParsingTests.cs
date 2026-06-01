using Generic.Rtk;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class ToolParameterParsingTests
{
    [Fact]
    public void Parses_ToolType_CaseInsensitive()
    {
        Assert.True(ToolParameterParsing.TryParseToolType("dotnetbuild", out var t, out _));
        Assert.Equal(ToolType.DotnetBuild, t);
    }
}
