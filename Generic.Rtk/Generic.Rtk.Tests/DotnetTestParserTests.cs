using Generic.Rtk.Filtering;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class DotnetTestParserTests
{
    private readonly DotnetTestParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void All_Passed_Only_Summary_Raw()
    {
        var raw = """
            Starting test execution, please wait...
            A total of 1 test files matched the specified pattern.
            Passed!  - Failed:     0, Passed:     3, Skipped:     0, Total:     3, Duration: 12 ms
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Passed", r.Summary.Status);
        Assert.Empty(r.Errors);
        Assert.DoesNotContain("Starting test execution", r.RawFiltered);
        Assert.Contains("Passed!", r.RawFiltered);
    }

    [Fact]
    public void Failure_Includes_Stack_And_No_Passing_Noise()
    {
        var raw = """
            [xUnit.net 00:00:00.15]     MyTests.UnitTest1.Fails [FAIL]
            [xUnit.net 00:00:00.15]       Assert.Equal() Failure
            [xUnit.net 00:00:00.15]       Stack Trace:
            [xUnit.net 00:00:00.15]         at MyTests.UnitTest1.Fails() in C:\app\UnitTest1.cs:line 9
            Failed!  - Failed:     1, Passed:     2, Skipped:     0, Total:     3, Duration: 120 ms
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.NotEmpty(r.Errors);
        Assert.Contains("at MyTests", r.Errors[0].StackTrace ?? "");
        Assert.DoesNotContain("Passed ", r.RawFiltered);
    }
}
