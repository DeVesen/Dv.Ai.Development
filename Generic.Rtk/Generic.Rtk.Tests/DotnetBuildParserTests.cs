using Generic.Rtk.Filtering;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class DotnetBuildParserTests
{
    private readonly DotnetBuildParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void Build_Succeeded_NoDiagnostics_SummaryOnly()
    {
        var raw = """
            Build succeeded.
                0 Warning(s)
                0 Error(s)

            Time Elapsed 00:00:03.12
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Empty(r.Errors);
        Assert.Contains("Build succeeded", r.RawFiltered);
    }

    [Fact]
    public void Build_With_MsBuild_Error_Parses_File_Line()
    {
        var raw = """
            C:\app\Program.cs(10,5): error CS0246: The type or namespace name 'X' could not be found
            Build FAILED.

                1 Error(s)
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Single(r.Errors);
        Assert.Equal("CS0246", r.Errors[0].Code);
        Assert.Equal(10, r.Errors[0].Line);
        Assert.Equal(5, r.Errors[0].Column);
        Assert.Equal(@"C:\app\Program.cs", r.Errors[0].File);
        Assert.Equal("Failed", r.Summary.Status);
    }

    [Fact]
    public void Stream_Prefix_Stripped_From_File_Name()
    {
        var raw = """
            3>ExceptionMiddleware.cs(15,32): Error CS1002 : ; expected
            3>------- Finished building project: LAC.GatewayService. Succeeded: False. Errors: 1. Warnings: 0
            Build completed in 00:00:06.993
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Single(r.Errors);
        Assert.Equal("CS1002", r.Errors[0].Code);
        Assert.Equal("ExceptionMiddleware.cs", r.Errors[0].File);
        Assert.Equal(15, r.Errors[0].Line);
        Assert.Equal(32, r.Errors[0].Column);
        Assert.DoesNotContain("3>", r.Errors[0].File);
    }

    [Fact]
    public void Rider_Build_Output_Parsed_Correctly()
    {
        var raw = """
            CONSOLE: MSBuild version 18.3.0 for .NET
            CONSOLE: Build started 11.05.2026 17:45:32 Uhr.
            3>------- Started building project: LAC.GatewayService
            C:\Program Files\dotnet\sdk\10.0.200\Roslyn\bincore\csc.exe /noconfig /unsafe- /checked-
            3>ExceptionMiddleware.cs(15,32): Error CS1002 : ; expected
            3>------- Finished building project: LAC.GatewayService. Succeeded: False. Errors: 1. Warnings: 0
            Build completed in 00:00:06.993
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Equal(1, r.Summary.Errors);
        Assert.Equal(0, r.Summary.Warnings);
        Assert.Single(r.Errors);
        Assert.Equal("ExceptionMiddleware.cs", r.Errors[0].File);
        Assert.DoesNotContain("csc.exe", r.RawFiltered);
        Assert.DoesNotContain("MSBuild version", r.RawFiltered);
        Assert.Contains("CS1002", r.RawFiltered);
    }

    [Fact]
    public void Rider_Succeeded_True_Detected_As_Success()
    {
        var raw = """
            CONSOLE: MSBuild version 18.3.0 for .NET
            1>------- Finished building project: MyProject. Succeeded: True. Errors: 0. Warnings: 0
            Build completed in 00:00:02.500
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Empty(r.Errors);
        Assert.Equal(0, r.Summary.Errors);
        Assert.Equal(0, r.Summary.Warnings);
    }
}
