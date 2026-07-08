using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// Locks the contract that success is strictly the child's exit code, for each
// Angular runner parser (build + Karma test + Jest test).
public sealed class AngularParserMappingTests
{
    [Fact]
    public void ParseBuildOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseBuildOutput("", "", 0).Success);

    [Fact]
    public void ParseBuildOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseBuildOutput("", "", 1).Success);

    [Fact]
    public void ParseTestOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseTestOutput("", "", 0).Success);

    [Fact]
    public void ParseTestOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseTestOutput("", "", 1).Success);

    [Fact]
    public void ParseJestOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseJestOutput("", "", 0).Success);

    [Fact]
    public void ParseJestOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseJestOutput("", "", 1).Success);
}
