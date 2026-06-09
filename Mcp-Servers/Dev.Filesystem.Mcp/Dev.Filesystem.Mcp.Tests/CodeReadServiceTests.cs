using Dev.Filesystem.Mcp.Json;
using Dev.Filesystem.Mcp.Services;

namespace Dev.Filesystem.Mcp.Tests;

public sealed class CodeReadServiceTests
{
    [Fact]
    public void ReadClassSummary_ParsesCsharpClass()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-cs"));
        Directory.CreateDirectory(root);
        var file = Path.Combine(root, "Sample.cs");
        File.WriteAllText(file, """
            namespace Demo;

            public class AnimalBase { }

            public class Dog : AnimalBase, IPet
            {
                public string Name { get; set; } = "";
                public void Bark() { }
            }

            public interface IPet { }
            """);

        try
        {
            var service = new CodeReadService();
            var summary = service.ReadClassSummary(file, "Dog");
            Assert.Equal("Dog", summary.ClassName);
            Assert.Equal("AnimalBase", summary.BaseClass);
            Assert.Contains("IPet", summary.Interfaces);
            Assert.Single(summary.Methods);
            Assert.Single(summary.Properties);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void ReadMethod_ReturnsCsharpMethodBody()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-method"));
        Directory.CreateDirectory(root);
        var file = Path.Combine(root, "Calc.cs");
        File.WriteAllText(file, """
            public static class Calc
            {
                public static int Add(int a, int b) => a + b;
            }
            """);

        try
        {
            var service = new CodeReadService();
            var result = service.ReadMethod(file, "Add", null);
            Assert.Contains("Add(int a, int b)", result.Signature);
            Assert.Contains("=>", result.Body);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void ReadSignaturesOnly_ReturnsPublicMembersOnly()
    {
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "fs-mcp-sig"));
        Directory.CreateDirectory(root);
        var file = Path.Combine(root, "Svc.cs");
        File.WriteAllText(file, """
            public class Svc
            {
                public void PublicMethod() { }
                private void PrivateMethod() { }
            }
            """);

        try
        {
            var service = new CodeReadService();
            var signatures = service.ReadSignaturesOnly(file, includePrivate: false);
            Assert.Single(signatures);
            Assert.Contains("PublicMethod", signatures[0].Signature);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void JsonResultFormatter_Error_UsesCamelCase()
    {
        var json = JsonResultFormatter.Error("test");
        Assert.Equal("{\"error\":\"test\"}", json);
    }
}
