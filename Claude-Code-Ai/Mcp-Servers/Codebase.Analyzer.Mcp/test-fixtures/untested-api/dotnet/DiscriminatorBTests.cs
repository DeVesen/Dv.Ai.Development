using Xunit;

namespace SampleApp.Tests;

// Exercises Compute — but only for DiscriminatorB. The sibling class name is
// deliberately NOT mentioned here, so per-class word-boundary association cannot
// link this test (and its Compute reference) to the sibling class.
public class DiscriminatorBTests
{
    [Fact]
    public void Computes()
    {
        var b = new DiscriminatorB();
        Assert.Equal(2, b.Compute());
    }
}
