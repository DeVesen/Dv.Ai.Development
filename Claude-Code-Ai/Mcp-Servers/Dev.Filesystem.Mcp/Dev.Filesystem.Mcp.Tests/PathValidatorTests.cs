using Dev.Filesystem.Mcp.Services;

namespace Dev.Filesystem.Mcp.Tests;

public sealed class PathValidatorTests
{
    [Fact]
    public void TryValidateUnderRoot_AllowsPathInsideRoot()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-root"));
        Directory.CreateDirectory(root);
        var child = Path.Combine(root, "src", "Foo.cs");
        Directory.CreateDirectory(Path.GetDirectoryName(child)!);

        try
        {
            Assert.True(PathValidator.TryValidateUnderRoot(child, root, out var normalized, out var error));
            Assert.Null(error);
            Assert.StartsWith(root, normalized, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void TryValidateUnderRoot_BlocksTraversal()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-root2"));
        Directory.CreateDirectory(root);

        try
        {
            var outside = Path.GetFullPath(Path.Combine(root, "..", "outside.cs"));
            Assert.False(PathValidator.TryValidateUnderRoot(outside, root, out _, out var error));
            Assert.Contains("traversal", error, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void TryValidateRoot_RequiresExistingDirectory()
    {
        var missing = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Assert.False(PathValidator.TryValidateRoot(missing, out _, out var error));
        Assert.Contains("not found", error, StringComparison.OrdinalIgnoreCase);
    }
}
