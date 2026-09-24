using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// Locks what ParseBuildOutput hands back to the MCP caller on a failed build: the caller
// never sees the raw console, so every failure must carry actionable lines in Errors.
public sealed class DotnetBuildParserTests
{
    private const string NuGetRestoreError =
        @"C:\src\App\App.csproj : error NU1101: Unable to find package Foo.Bar. No packages exist with this id in source(s): nuget.org [C:\src\App\App.sln]";

    private const string MsBuildError = "MSBUILD : error MSB1009: Project file does not exist.";

    private const string NuGetRestoreWarning =
        @"C:\src\App\App.csproj : warning NU1603: App depends on Foo (>= 1.0.0) but Foo 1.0.0 was not found. [C:\src\App\App.sln]";

    [Fact]
    public void ParseBuildOutput_NuGetRestoreError_IsReportedInErrors()
    {
        var result = DotnetRunner.ParseBuildOutput($"Determining projects to restore...\n{NuGetRestoreError}\n\nBuild FAILED.\n", "", 1);

        Assert.Contains(NuGetRestoreError, result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_MsBuildErrorWithoutFileLocation_IsReportedInErrors()
    {
        var result = DotnetRunner.ParseBuildOutput(MsBuildError + "\n", "", 1);

        Assert.Equal([MsBuildError], result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_NuGetRestoreWarning_IsReportedInWarnings()
    {
        var result = DotnetRunner.ParseBuildOutput(NuGetRestoreWarning + "\n", "", 0);

        Assert.Equal([NuGetRestoreWarning], result.Warnings);
    }

    [Fact]
    public void ParseBuildOutput_FailureWithoutRecognizedErrorLines_ReturnsLastOutputLines()
    {
        var stdout = string.Join("\n", Enumerable.Range(1, 15).Select(i => $"line {i}"));

        var result = DotnetRunner.ParseBuildOutput(stdout, "", 1);

        Assert.Equal(Enumerable.Range(6, 10).Select(i => $"line {i}"), result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_FailureWithoutRecognizedErrorLines_SummaryDoesNotPointToConsole()
    {
        var result = DotnetRunner.ParseBuildOutput("something unexpected\n", "", 1);

        Assert.DoesNotContain("Console output", result.Summary);
    }

    [Fact]
    public void ParseBuildOutput_Success_ReturnsNoErrors()
    {
        var result = DotnetRunner.ParseBuildOutput("Build succeeded.\n    0 Warning(s)\n    0 Error(s)\n", "", 0);

        Assert.Empty(result.Errors);
    }
}
