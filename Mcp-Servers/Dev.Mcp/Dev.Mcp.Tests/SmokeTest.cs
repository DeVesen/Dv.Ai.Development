using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class SmokeTest
{
    [Fact]
    public void Harness_CanReferenceMainProject()
    {
        Assert.NotNull(new PatchService());
    }
}
