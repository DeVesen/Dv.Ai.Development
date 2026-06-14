using Dev.Dotnet.Mcp.Services;

namespace Dev.Dotnet.Mcp.Tests;

public sealed class DotnetScaffolderTests
{
    [Fact]
    public void BuildNewCommand_includes_template_name_and_output()
    {
        var args = DotnetScaffolder.BuildNewCommand("classlib", "MyLib", @"C:\out\MyLib");

        Assert.Contains("new classlib", args);
        Assert.Contains("--name MyLib", args);
        Assert.Contains("-o", args);
        Assert.Contains(@"C:\out\MyLib", args);
    }

    [Fact]
    public void BuildNewCommand_quotes_paths_with_spaces()
    {
        var args = DotnetScaffolder.BuildNewCommand("webapi", "My Api", @"C:\out\My Api");

        Assert.Contains("--name \"My Api\"", args);
        Assert.Contains("-o \"C:\\out\\My Api\"", args);
    }

    [Fact]
    public void BuildSlnAddCommand_quotes_paths_with_spaces()
    {
        var args = DotnetScaffolder.BuildSlnAddCommand(
            @"C:\repo\My Solution.sln",
            @"C:\repo\src\My Project\My Project.csproj");

        Assert.StartsWith("sln ", args);
        Assert.Contains("add", args);
        Assert.Contains("\"C:\\repo\\My Solution.sln\"", args);
        Assert.Contains("\"C:\\repo\\src\\My Project\\My Project.csproj\"", args);
    }

    [Fact]
    public void BuildNewSlnCommand_includes_name_and_output()
    {
        var args = DotnetScaffolder.BuildNewSlnCommand("MySolution", @"C:\repo");

        Assert.Contains("new sln", args);
        Assert.Contains("--name MySolution", args);
        Assert.Contains("-o", args);
        Assert.Contains(@"C:\repo", args);
    }

    [Fact]
    public void BuildNewSlnCommand_quotes_paths_with_spaces()
    {
        var args = DotnetScaffolder.BuildNewSlnCommand("My Solution", @"C:\My Repo");

        Assert.Contains("--name \"My Solution\"", args);
        Assert.Contains("-o \"C:\\My Repo\"", args);
    }
}
