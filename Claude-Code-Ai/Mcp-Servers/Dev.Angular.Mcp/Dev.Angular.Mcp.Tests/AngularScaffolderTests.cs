using Dev.Angular.Mcp.Services;

namespace Dev.Angular.Mcp.Tests;

public sealed class AngularScaffolderTests
{
    [Fact]
    public void BuildComponentArguments_UsesDefaultFlags()
    {
        var args = AngularScaffolder.BuildComponentArguments("hero", null, null);

        Assert.Equal("generate component hero --standalone --skip-tests", args);
    }

    [Fact]
    public void BuildComponentArguments_IncludesPath()
    {
        var args = AngularScaffolder.BuildComponentArguments("hero", "src/app/shared", null);

        Assert.Equal("generate component hero --path=src/app/shared --standalone --skip-tests", args);
    }

    [Fact]
    public void BuildComponentArguments_OptionsOverrideDefaults()
    {
        var args = AngularScaffolder.BuildComponentArguments("hero", "src/app", "--inline-style");

        Assert.Equal("generate component hero --path=src/app --inline-style", args);
        Assert.DoesNotContain("--standalone", args);
        Assert.DoesNotContain("--skip-tests", args);
    }

    [Fact]
    public void BuildServiceArguments_UsesDefaultSkipTests()
    {
        var args = AngularScaffolder.BuildServiceArguments("auth", null, null);

        Assert.Equal("generate service auth --skip-tests", args);
    }

    [Fact]
    public void BuildServiceArguments_OptionsOverrideDefaults()
    {
        var args = AngularScaffolder.BuildServiceArguments("auth", "src/app/core", "--flat");

        Assert.Equal("generate service auth --path=src/app/core --flat", args);
        Assert.DoesNotContain("--skip-tests", args);
    }

    [Fact]
    public void BuildArgumentList_SplitsQuotedOptions()
    {
        var args = AngularScaffolder.BuildArgumentList("component", "x", null, "--style \"scss\" --flat", "--skip-tests");

        Assert.Equal(["generate", "component", "x", "--style", "scss", "--flat"], args);
    }

    [Fact]
    public void ParseCreateLines_ExtractsFilePaths()
    {
        const string stdout = """
            Nothing to be done.
            CREATE src/app/hero/hero.component.ts (245 bytes)
            CREATE src/app/hero/hero.component.html (28 bytes)
            UPDATE src/app/app.module.ts (512 bytes)
            """;

        var files = AngularScaffolder.ParseCreateLines(stdout);

        Assert.Equal(2, files.Count);
        Assert.Equal("src/app/hero/hero.component.ts", files[0]);
        Assert.Equal("src/app/hero/hero.component.html", files[1]);
    }

    [Fact]
    public void ParseCreateLines_IsCaseInsensitive()
    {
        const string stdout = "create src/app/foo/foo.ts (10 bytes)";

        var files = AngularScaffolder.ParseCreateLines(stdout);

        Assert.Single(files);
        Assert.Equal("src/app/foo/foo.ts", files[0]);
    }

    [Fact]
    public void ParseCreateLines_EmptyStdout_ReturnsEmpty()
    {
        Assert.Empty(AngularScaffolder.ParseCreateLines(""));
        Assert.Empty(AngularScaffolder.ParseCreateLines("   \n  "));
    }
}
