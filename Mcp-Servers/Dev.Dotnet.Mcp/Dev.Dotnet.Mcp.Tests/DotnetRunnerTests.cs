using Dev.Dotnet.Mcp.Services;

namespace Dev.Dotnet.Mcp.Tests;

public sealed class DotnetRunnerTests
{
    // --- ParseBuildOutput ---

    [Fact]
    public void ParseBuildOutput_success_returns_no_errors()
    {
        const string stdout = """
            Build succeeded.
                0 Warning(s)
                0 Error(s)
            Time Elapsed 00:00:01.23
            """;

        var result = DotnetRunner.ParseBuildOutput(stdout, string.Empty, 0);

        Assert.True(result.Success);
        Assert.Equal(0, result.ExitCode);
        Assert.Empty(result.Errors);
        Assert.Contains("succeeded", result.Summary, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseBuildOutput_extracts_cs_error_lines()
    {
        const string stdout = """
            src/MyClass.cs(10,5): error CS0117: 'MyClass' does not contain a definition for 'Foo' [MyProject.csproj]
            src/MyClass.cs(15,3): error CS0246: The type or namespace name 'Bar' could not be found [MyProject.csproj]
            Build FAILED.
            """;

        var result = DotnetRunner.ParseBuildOutput(stdout, string.Empty, 1);

        Assert.False(result.Success);
        Assert.Equal(2, result.Errors.Length);
        Assert.Contains(result.Errors, e => e.Contains("CS0117"));
        Assert.Contains(result.Errors, e => e.Contains("CS0246"));
        Assert.Contains("FAILED", result.Summary, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseBuildOutput_extracts_warning_lines()
    {
        const string stdout = """
            src/MyClass.cs(5,1): warning CS0618: 'OldMethod' is obsolete [MyProject.csproj]
            Build succeeded.
            """;

        var result = DotnetRunner.ParseBuildOutput(stdout, string.Empty, 0);

        Assert.True(result.Success);
        Assert.Empty(result.Errors);
        Assert.Single(result.Warnings);
        Assert.Contains("CS0618", result.Warnings[0]);
    }

    [Fact]
    public void ParseBuildOutput_deduplicates_errors()
    {
        const string stdout = """
            src/A.cs(1,1): error CS0117: same error [proj.csproj]
            src/A.cs(1,1): error CS0117: same error [proj.csproj]
            """;

        var result = DotnetRunner.ParseBuildOutput(stdout, string.Empty, 1);

        Assert.Single(result.Errors);
    }

    [Fact]
    public void ParseBuildOutput_fallback_summary_when_no_summary_line()
    {
        const string stderr = "src/A.cs(1,1): error CS0001: something [proj.csproj]";

        var result = DotnetRunner.ParseBuildOutput(string.Empty, stderr, 1);

        Assert.False(result.Success);
        Assert.Contains("failed", result.Summary, StringComparison.OrdinalIgnoreCase);
    }

    // --- ParseTestOutput ---

    [Fact]
    public void ParseTestOutput_success_parses_summary_line()
    {
        const string stdout = """
            Test run for MyTests.dll (.NETCoreApp,Version=v9.0)
            Passed! - Failed:   0, Passed:  10, Skipped:   0, Total:  10, Duration: 1 s - MyTests.dll (net9.0)
            """;

        var result = DotnetRunner.ParseTestOutput(stdout, string.Empty, 0);

        Assert.True(result.Success);
        Assert.Empty(result.Errors);
        Assert.Contains("Passed!", result.Summary);
        Assert.Contains("Passed:  10", result.Summary);
    }

    [Fact]
    public void ParseTestOutput_extracts_failed_test_names()
    {
        const string stdout = """
              Failed CalculatorTests.Add_TwoNumbers_ReturnsSum [< 1 ms]
              Failed OrderServiceTests.CreateOrder_InvalidInput_Throws [2 ms]
            Failed! - Failed:   2, Passed:   8, Skipped:   0, Total:  10, Duration: 1 s - MyTests.dll (net9.0)
            """;

        var result = DotnetRunner.ParseTestOutput(stdout, string.Empty, 1);

        Assert.False(result.Success);
        Assert.Equal(2, result.Errors.Length);
        Assert.Contains(result.Errors, t => t.Contains("CalculatorTests"));
        Assert.Contains(result.Errors, t => t.Contains("OrderServiceTests"));
        Assert.Contains("Failed!", result.Summary);
    }

    [Fact]
    public void ParseTestOutput_fallback_summary_when_no_summary_line()
    {
        var result = DotnetRunner.ParseTestOutput(string.Empty, "Build failed.", 1);

        Assert.False(result.Success);
        Assert.Contains("failed", result.Summary, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseTestOutput_all_pass_fallback()
    {
        var result = DotnetRunner.ParseTestOutput("Some custom output without summary line.", string.Empty, 0);

        Assert.True(result.Success);
        Assert.Contains("passed", result.Summary, StringComparison.OrdinalIgnoreCase);
    }
}
