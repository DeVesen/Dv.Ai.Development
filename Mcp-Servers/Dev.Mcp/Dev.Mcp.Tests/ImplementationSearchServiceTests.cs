using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ImplementationSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly ImplementationSearchService _svc = new();

    public ImplementationSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-impl-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        File.WriteAllText(Path.Combine(_root, "ImplA.cs"), "public class ImplA : IMyService { }");
        File.WriteAllText(Path.Combine(_root, "ImplB.cs"), "public class ImplB : IMyService { }");
        File.WriteAllText(Path.Combine(_root, "Unrelated.cs"), "public class Unrelated { }");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindImplementations_WhenImplementationsExist_ReturnsThemWithFilesScanned()
    {
        var result = _svc.FindImplementations(_root, "IMyService", "csharp", maxResults: 20);

        Assert.Equal(2, result.Results.Count);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindImplementations_WhenMaxResultsHit_SetsTruncatedTrue()
    {
        for (var i = 2; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Impl{i}.cs"), $"public class Impl{i} : IMyService {{ }}");

        var result = _svc.FindImplementations(_root, "IMyService", "csharp", maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }

    [Fact]
    public void FindImplementations_WhenCSharpPhaseTruncated_TypeScriptPhaseIsSkipped()
    {
        for (var i = 2; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Impl{i}.cs"), $"public class Impl{i} : IMyService {{ }}");
        File.WriteAllText(Path.Combine(_root, "ImplTs.ts"),
            "export class ImplTs implements IMyService { }");

        var result = _svc.FindImplementations(_root, "IMyService", "auto", maxResults: 2);

        Assert.True(result.Meta.Truncated);
        Assert.DoesNotContain(result.Results, r => r.File.EndsWith(".ts", StringComparison.OrdinalIgnoreCase));
    }
}
