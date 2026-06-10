using Dev.Angular.Mcp.Services;

namespace Dev.Angular.Mcp.Tests;

public sealed class AngularRunnerTests
{
    // --- ParseBuildOutput ---

    [Fact]
    public void ParseBuildOutput_success_returns_no_errors()
    {
        const string stdout = """
            ✔ Building...
            Initial chunk files | Names         | Raw size
            main.js             | main          | 123 kB
            Build at: 2024-01-01T00:00:00.000Z - Hash: abc123
            """;

        var result = AngularRunner.ParseBuildOutput(stdout, string.Empty, 0);

        Assert.True(result.Success);
        Assert.Equal(0, result.ExitCode);
        Assert.Empty(result.Errors);
        Assert.Contains("successful", result.Summary, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseBuildOutput_extracts_typescript_error_lines()
    {
        const string stderr = """
            src/app/app.component.ts:5:10 - error TS2345: Argument of type 'number' is not assignable.
            src/app/foo.ts:12:3 - error TS2304: Cannot find name 'bar'.
            """;

        var result = AngularRunner.ParseBuildOutput(string.Empty, stderr, 1);

        Assert.False(result.Success);
        Assert.Equal(2, result.Errors.Length);
        Assert.Contains(result.Errors, e => e.Contains("TS2345"));
        Assert.Contains(result.Errors, e => e.Contains("TS2304"));
    }

    [Fact]
    public void ParseBuildOutput_extracts_webpack_error_lines()
    {
        const string stdout = """
            ERROR in src/app/app.component.ts
            Module build failed: SyntaxError: Unexpected token
            WARNING in src/app/lazy.module.ts
            """;

        var result = AngularRunner.ParseBuildOutput(stdout, string.Empty, 1);

        Assert.False(result.Success);
        Assert.Single(result.Errors);
        Assert.Single(result.Warnings);
    }

    [Fact]
    public void ParseBuildOutput_strips_ansi_codes()
    {
        var stderr = "\x1B[31merror TS2304: Cannot find name 'x'.\x1B[0m";

        var result = AngularRunner.ParseBuildOutput(string.Empty, stderr, 1);

        Assert.True(result.Errors.Length > 0);
        Assert.DoesNotContain("\x1B", result.Errors[0]);
    }

    [Fact]
    public void ParseBuildOutput_deduplicates_errors()
    {
        const string stderr = """
            error TS2304: Cannot find name 'x'.
            error TS2304: Cannot find name 'x'.
            """;

        var result = AngularRunner.ParseBuildOutput(string.Empty, stderr, 1);

        Assert.Single(result.Errors);
    }

    // --- ParseTestOutput ---

    [Fact]
    public void ParseTestOutput_success_returns_no_failed_tests()
    {
        const string stdout = "Executed 10 of 10 SUCCESS (0.456 secs / 0.423 secs)";

        var result = AngularRunner.ParseTestOutput(stdout, string.Empty, 0);

        Assert.True(result.Success);
        Assert.Empty(result.Errors);
        Assert.Contains("Executed 10 of 10", result.Summary);
    }

    [Fact]
    public void ParseTestOutput_extracts_failed_test_names()
    {
        const string stdout = """
            FAILED MyComponent should render title
            FAILED AuthService should return user
            Executed 5 of 5 (2 FAILED) (0.789 secs / 0.756 secs)
            """;

        var result = AngularRunner.ParseTestOutput(stdout, string.Empty, 1);

        Assert.False(result.Success);
        Assert.Equal(2, result.Errors.Length);
        Assert.Contains(result.Errors, t => t.Contains("MyComponent"));
        Assert.Contains(result.Errors, t => t.Contains("AuthService"));
        Assert.Contains("FAILED", result.Summary);
    }

    [Fact]
    public void ParseTestOutput_fallback_summary_when_no_karma_line()
    {
        var result = AngularRunner.ParseTestOutput(string.Empty, "some error", 1);

        Assert.False(result.Success);
        Assert.Contains("failed", result.Summary, StringComparison.OrdinalIgnoreCase);
    }
}
