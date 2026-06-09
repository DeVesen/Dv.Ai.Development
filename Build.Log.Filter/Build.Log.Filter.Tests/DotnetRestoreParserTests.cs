using Build.Log.Filter.Filtering;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Tests;

public class DotnetRestoreParserTests
{
    private readonly DotnetRestoreParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void Successful_Restore_NoWarnings()
    {
        var raw = """
            Restored /src/MyApp/MyApp.csproj (in 1.23 s).
            Restore succeeded.
            Time Elapsed 00:00:01.23
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Empty(r.Errors);
        Assert.Empty(r.Warnings);
        Assert.Equal(1, r.Summary.Total);
        Assert.Equal("00:00:01.23", r.Summary.Duration);
    }

    [Fact]
    public void NuGet_Error_NU1101_Detected()
    {
        var raw = """
            /src/MyApp/MyApp.csproj : error NU1101 : Unable to find package NonExistent.Package. No packages exist with this id in source(s): nuget.org
            Restore failed.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Single(r.Errors);
        Assert.Equal("NU1101", r.Errors[0].Code);
        Assert.Contains("Unable to find package", r.Errors[0].Message);
        Assert.Equal("/src/MyApp/MyApp.csproj", r.Errors[0].File);
    }

    [Fact]
    public void NuGet_Warning_Detected()
    {
        var raw = """
            /src/MyApp/MyApp.csproj : warning NU1903 : Package 'System.Text.Json' 6.0.0 has a known high severity vulnerability
            Restored /src/MyApp/MyApp.csproj (in 2.5 s).
            Restore succeeded.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Empty(r.Errors);
        Assert.Single(r.Warnings);
        Assert.Equal("NU1903", r.Warnings[0].Code);
    }

    [Fact]
    public void Multiple_Projects_Restored()
    {
        var raw = """
            Restored /src/App1/App1.csproj (in 0.5 s).
            Restored /src/App2/App2.csproj (in 0.8 s).
            Restored /src/App3/App3.csproj (in 1.1 s).
            Restore succeeded.
            Time Elapsed 00:00:02.00
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Equal(3, r.Summary.Total);
    }

    [Fact]
    public void NothingToDo_Detected()
    {
        var raw = """
            Nothing to do. None of the projects specified contain packages to restore.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Equal(0, r.Summary.Total);
    }

    [Fact]
    public void ToolType_Is_DotnetRestore()
    {
        Assert.Equal(ToolType.DotnetRestore, _p.ToolType);
    }
}
