using Xunit;

namespace SampleApp.Tests;

// Stem "MiscIntegrationTest" does not match WordBoundaryTarget[Tests|Test|Spec].
// Class association is established only via a word-boundary code reference.
public class MiscIntegrationTest
{
    [Fact]
    public void RunsTarget()
    {
        var t = new WordBoundaryTarget();
        Assert.Equal(1, t.Execute());
    }
}
