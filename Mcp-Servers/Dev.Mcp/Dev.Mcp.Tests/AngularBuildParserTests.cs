using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// Locks what ParseBuildOutput hands back to the MCP caller on a failed ng build: the caller
// never sees the raw console, so errors must say where they are and never come back empty.
public sealed class AngularBuildParserTests
{
    private const string EsbuildTsError =
        "✘ [ERROR] TS2339: Property 'foo' does not exist on type 'AppComponent'. [plugin angular-compiler]\n" +
        "\n" +
        "    src/app/app.component.ts:10:9:\n" +
        "      10 │     this.foo();\n" +
        "         ╵          ~~~\n";

    private const string EsbuildTemplateError =
        "✘ [ERROR] NG8002: Can't bind to 'ngModel' since it isn't a known property of 'input'. [plugin angular-compiler]\n" +
        "\n" +
        "    src/app/app.component.html:3:7:\n" +
        "      3 │ <input [(ngModel)]=\"name\">\n" +
        "        ╵        ~~~~~~~~~~~~~~~~~~~\n";

    [Fact]
    public void ParseBuildOutput_EsbuildError_IncludesFileLocation()
    {
        var result = AngularRunner.ParseBuildOutput(EsbuildTsError, "", 1);

        var error = Assert.Single(result.Errors);
        Assert.StartsWith("src/app/app.component.ts:10:9:", error);
        Assert.Contains("TS2339: Property 'foo' does not exist", error);
    }

    [Fact]
    public void ParseBuildOutput_SameMessageInTwoFiles_ReportsBoth()
    {
        var second = EsbuildTsError.Replace("app.component.ts:10:9", "other.component.ts:4:2");

        var result = AngularRunner.ParseBuildOutput(EsbuildTsError + "\n" + second, "", 1);

        Assert.Equal(2, result.Errors.Length);
    }

    [Fact]
    public void ParseBuildOutput_EsbuildTemplateError_IncludesFileLocation()
    {
        var result = AngularRunner.ParseBuildOutput("", EsbuildTemplateError, 1);

        Assert.StartsWith("src/app/app.component.html:3:7:", Assert.Single(result.Errors));
    }

    [Fact]
    public void ParseBuildOutput_TscStyleErrorWithInlineLocation_IsKeptAsIs()
    {
        const string line = "src/app/app.component.ts:10:9 - error TS2339: Property 'foo' does not exist on type 'AppComponent'.";

        var result = AngularRunner.ParseBuildOutput(line + "\n", "", 1);

        Assert.Equal([line], result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_FailureWithoutRecognizedErrorLines_ReturnsLastOutputLines()
    {
        var stdout = string.Join("\n", Enumerable.Range(1, 15).Select(i => $"line {i}"));

        var result = AngularRunner.ParseBuildOutput(stdout, "", 1);

        Assert.Equal(Enumerable.Range(6, 10).Select(i => $"line {i}"), result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_FailureWithoutRecognizedErrorLines_SummaryDoesNotPointToConsole()
    {
        var result = AngularRunner.ParseBuildOutput("something unexpected\n", "", 1);

        Assert.DoesNotContain("Console output", result.Summary);
    }
}
