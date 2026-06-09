using Build.Log.Filter.Mcp.Filtering;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Tests;

public class OutputFilterServiceTests
{
    [Fact]
    public void Raw_Over_MaxLength_Returns_Error_Result()
    {
        var svc = new OutputFilterService(
            [new DotnetBuildParser()],
            new OutputNormalizer());
        var limits = new FilterLimits(MaxRawLength: 4);
        var r = svc.Filter("12345", ToolType.DotnetBuild, limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Contains("MaxRawLength", r.Errors[0].Message);
    }
}
