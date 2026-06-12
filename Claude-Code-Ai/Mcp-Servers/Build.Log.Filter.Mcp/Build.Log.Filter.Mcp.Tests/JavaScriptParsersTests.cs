using Build.Log.Filter.Mcp.Filtering;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Tests;

public class JavaScriptParsersTests
{
    private readonly FilterLimits _limits = new();

    [Fact]
    public void Jest_Success_Drops_Pass_And_Console()
    {
        var p = new JestParser();
        var raw = """
            PASS ./a.test.js
              console.log
                hello

            Test Suites: 1 passed, 1 total
            Tests:       1 passed, 1 total
            Time:        0.5 s
            """;
        var r = p.Parse(raw, _limits);
        Assert.Equal("Passed", r.Summary.Status);
        Assert.DoesNotContain("console.log", r.RawFiltered);
        Assert.DoesNotContain("PASS ./a", r.RawFiltered);
    }

    [Fact]
    public void Vitest_Failure_Recognized()
    {
        var p = new VitestParser();
        var raw = """
             × should add 1 + 2 2ms
             → expected 2 to be 3
            FAIL src/math.test.ts > should add
            Test Files  1 failed (1)
             Tests  1 failed (1)
            Duration  120ms
            """;
        var r = p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Contains("FAIL", r.RawFiltered);
    }

    [Fact]
    public void Node_Keeps_Uncaught_And_Stack()
    {
        var p = new NodeScriptParser();
        var raw = """
            normal stdout noise here
            Error: boom
                at Object.<anonymous> (/app/index.js:2:9)
            """;
        var r = p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Contains("at Object", r.Errors[0].StackTrace ?? "");
        Assert.DoesNotContain("normal stdout", r.RawFiltered);
    }
}
