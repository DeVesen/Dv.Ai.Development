using Build.Log.Filter.Filtering;
using Build.Log.Filter.Models;
using Build.Log.Filter.Streaming;

namespace Build.Log.Filter.Tests;

public class StreamFilterSessionManagerTests
{
    private static OutputFilterService BuildFilter()
    {
        var parsers = new IToolOutputParser[]
        {
            new DotnetBuildParser(), new DotnetTestParser(), new AngularBuildParser(),
            new AngularTestParser(), new JestParser(), new VitestParser(), new NodeScriptParser(),
        };
        return new OutputFilterService(parsers, new OutputNormalizer());
    }

    [Fact]
    public void Buffers_Incomplete_Line_Then_Completes()
    {
        var filter = BuildFilter();
        var limits = new FilterLimits();
        var mgr = new StreamFilterSessionManager(new SystemClock(), limits);

        var r1 = mgr.AppendAndFilter("a", ToolType.DotnetBuild, "C:\\a.cs(1,1): error CS1: one\nC:\\b", false, filter);
        Assert.Contains("CS1", r1.RawFiltered);
        Assert.DoesNotContain("CS2", r1.RawFiltered);

        var r2 = mgr.AppendAndFilter("a", ToolType.DotnetBuild, ".cs(2,2): error CS2: two\n", false, filter);
        Assert.Contains("CS2", r2.RawFiltered);
    }

    [Fact]
    public void IsFinal_Clears_Session_Next_Stream_Independent()
    {
        var filter = BuildFilter();
        var mgr = new StreamFilterSessionManager(new SystemClock(), new FilterLimits());

        var r1 = mgr.AppendAndFilter("c", ToolType.DotnetBuild, "C:\\x.cs(1,1): error CS1: boom\n", false, filter);
        Assert.Contains("CS1", r1.RawFiltered);

        var r2 = mgr.AppendAndFilter("c", ToolType.DotnetBuild, "", true, filter);
        Assert.Contains("CS1", r2.RawFiltered);

        var r3 = mgr.AppendAndFilter("c", ToolType.DotnetBuild, "Build succeeded.\n", true, filter);
        Assert.DoesNotContain("CS1", r3.RawFiltered);
        Assert.Contains("Build succeeded", r3.RawFiltered);
    }
}
