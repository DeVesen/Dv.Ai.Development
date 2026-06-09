using Build.Log.Filter.Mcp.Filtering;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Tests;

public class DotnetFormatParserTests
{
    private readonly DotnetFormatParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void Clean_Output_No_Formatting_Needed()
    {
        var raw = """
            Format complete in 1234ms.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Formatted", r.Summary.Status);
        Assert.Empty(r.Warnings);
        Assert.Equal(0, r.Summary.Total);
    }

    [Fact]
    public void Files_Needing_Formatting_Detected()
    {
        var raw = """
            /src/MyApp/Program.cs(10,1): warning IDE0055: Fix formatting
            /src/MyApp/Startup.cs(25,5): warning IDE0055: Fix formatting
            Formatting complete in 500ms.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("NeedsFormatting", r.Summary.Status);
        Assert.Equal(2, r.Warnings.Count);
        Assert.Equal(2, r.Summary.Total);
        Assert.Equal("IDE0055", r.Warnings[0].Code);
        Assert.Equal("/src/MyApp/Program.cs", r.Warnings[0].File);
        Assert.Equal(10, r.Warnings[0].Line);
    }

    [Fact]
    public void Formatted_Code_File_Message_Detected()
    {
        var raw = """
            Formatted code file '/src/MyApp/Service.cs'.
            Formatted code file '/src/MyApp/Controller.cs'.
            Format complete in 200ms.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("NeedsFormatting", r.Summary.Status);
        Assert.Equal(2, r.Summary.Total);
    }

    [Fact]
    public void Would_Reformat_Triggers_NeedsFormatting()
    {
        var raw = """
            would reformat /src/MyApp/Helper.cs
            2 files need formatting
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("NeedsFormatting", r.Summary.Status);
    }

    [Fact]
    public void ToolType_Is_DotnetFormat()
    {
        Assert.Equal(ToolType.DotnetFormat, _p.ToolType);
    }
}
