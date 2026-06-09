using System.Text.Json;
using Dev.Dotnet.Mcp.Models;
using Dev.Dotnet.Mcp.Services;

namespace Dev.Dotnet.Mcp.Tests;

public sealed class DirectoryTemplateServiceTests
{
    [Fact]
    public void Create_creates_directories_and_files()
    {
        var basePath = Path.Combine(Path.GetTempPath(), "dev-dotnet-mcp-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new DirectoryTemplateService();
            var result = service.Create(
                basePath,
                """["src/Domain", "src/Application/Services.cs", "README.md"]""");

            Assert.True(result.Success);
            Assert.Null(result.Error);
            Assert.NotEmpty(result.CreatedDirs);
            Assert.Contains(result.CreatedFiles, f => f.EndsWith("README.md", StringComparison.OrdinalIgnoreCase));
            Assert.True(Directory.Exists(Path.Combine(basePath, "src", "Domain")));
            Assert.True(File.Exists(Path.Combine(basePath, "README.md")));
        }
        finally
        {
            if (Directory.Exists(basePath))
                Directory.Delete(basePath, recursive: true);
        }
    }

    [Fact]
    public void Create_rejects_traversal()
    {
        var basePath = Path.Combine(Path.GetTempPath(), "dev-dotnet-mcp-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(basePath);
        try
        {
            var service = new DirectoryTemplateService();
            var result = service.Create(basePath, """["../escape"]""");

            Assert.False(result.Success);
            Assert.Contains("traversal", result.Error, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.Delete(basePath, recursive: true);
        }
    }

    [Fact]
    public void Create_rejects_invalid_json()
    {
        var service = new DirectoryTemplateService();
        var result = service.Create(Path.GetTempPath(), "{not-an-array}");

        Assert.False(result.Success);
        Assert.Contains("Invalid paths_json", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void DirectoryStructureResult_serializes_camelCase_json()
    {
        var result = new DirectoryStructureResult
        {
            Success = true,
            CreatedDirs = ["a"],
            CreatedFiles = ["b.txt"],
        };

        var json = JsonSerializer.Serialize(result, JsonDefaults.Options);

        Assert.Contains("\"createdDirs\"", json);
        Assert.Contains("\"createdFiles\"", json);
        Assert.Contains("\"success\"", json);
    }
}
