using Dev.Filesystem.Mcp.Services;

namespace Dev.Filesystem.Mcp.Tests;

public sealed class GlobSearchServiceTests
{
    [Fact]
    public void FindFile_MatchesByFileName()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-glob"));
        Directory.CreateDirectory(root);
        var nested = Path.Combine(root, "src");
        Directory.CreateDirectory(nested);
        var file = Path.Combine(nested, "UserService.cs");
        File.WriteAllText(file, "class UserService { }");

        try
        {
            var service = new GlobSearchService();
            var results = service.FindFile(root, "UserService.cs", 20);
            Assert.Single(results);
            Assert.Equal(file, results[0].Path);
            Assert.Equal("src/UserService.cs", results[0].Relative);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
