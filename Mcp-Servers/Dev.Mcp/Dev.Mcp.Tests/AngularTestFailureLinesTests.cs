using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// A test run that fails before any test executes must surface its real cause,
// not the Node warnings that precede it on stderr.
public sealed class AngularTestFailureLinesTests
{
    private const string MissingBuilder = "Error: Could not find the '@angular/build:unit-test' builder's node package.";

    private static readonly string WarningsThenCause = string.Join("\n",
        "(node:1234) MaxListenersExceededWarning: Possible EventEmitter memory leak detected.",
        "(Use `node --trace-warnings ...` to show where the warning was created)",
        "The builder '@angular-devkit/build-angular:karma' is deprecated.",
        MissingBuilder);

    public static TheoryData<string> Parsers => new() { "karma", "jest", "vitest" };

    private static Models.AngularBuildResult Parse(string parser, string stdout, string stderr, int exitCode) => parser switch
    {
        "karma" => AngularRunner.ParseTestOutput(stdout, stderr, exitCode),
        "jest" => AngularRunner.ParseJestOutput(stdout, stderr, exitCode),
        _ => AngularRunner.ParseVitestOutput(stdout, stderr, exitCode),
    };

    [Theory]
    [MemberData(nameof(Parsers))]
    public void Parse_StartFailsAfterNodeWarnings_ErrorsNameTheCause(string parser)
    {
        var result = Parse(parser, "", WarningsThenCause, 1);

        Assert.Equal([MissingBuilder], result.Errors);
    }

    [Theory]
    [MemberData(nameof(Parsers))]
    public void Parse_StartFailsAfterNodeWarnings_WarningsListedSeparately(string parser)
    {
        var result = Parse(parser, "", WarningsThenCause, 1);

        Assert.Contains(result.Warnings, line => line.Contains("MaxListenersExceededWarning"));
        Assert.DoesNotContain(result.Warnings, line => line.Contains("Could not find"));
    }

    [Theory]
    [MemberData(nameof(Parsers))]
    public void Parse_CauseOnStdout_IsFoundToo(string parser)
    {
        var result = Parse(parser, MissingBuilder, "(node:1) DeprecationWarning: old api", 1);

        Assert.Equal([MissingBuilder], result.Errors);
    }

    [Theory]
    [MemberData(nameof(Parsers))]
    public void Parse_NoErrorLikeLine_FallsBackToLastLinesWithoutWarnings(string parser)
    {
        var result = Parse(parser, "", "(node:1) DeprecationWarning: old api\nsomething went sideways\nexit", 1);

        Assert.Equal(["something went sideways", "exit"], result.Errors);
    }
}
