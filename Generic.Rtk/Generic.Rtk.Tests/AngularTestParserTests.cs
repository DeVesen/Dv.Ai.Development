using Generic.Rtk.Filtering;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class AngularTestParserTests
{
    private readonly AngularTestParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void JestStyle_Success_Summary_Only()
    {
        var raw = """
            PASS src/app/app.spec.ts
            Test Suites: 1 passed, 1 total
            Tests:       2 passed, 2 total
            Time:        1.2 s
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Passed", r.Summary.Status);
        Assert.DoesNotContain("PASS src", r.RawFiltered);
    }

    [Fact]
    public void Failure_Keeps_Spec_And_Atleast_One_Error()
    {
        var raw = """
            FAIL src/app/bad.spec.ts
            ● bad › should work

            expect(received).toBe(expected)

              4 |   expect(1).toBe(2);
            at Object.<anonymous> (bad.spec.ts:4:15)

            Test Suites: 1 failed, 1 total
            Tests:       1 failed, 1 total
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.NotEmpty(r.Errors);
    }
}
