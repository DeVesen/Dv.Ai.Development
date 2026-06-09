using Xunit;

namespace SampleApp.Tests;

// Exercises only the kept method — the untested member name is deliberately NOT
// mentioned here (not even in a comment); it appears only in DiscriminatorB's test.
public class DiscriminatorATests
{
    [Fact]
    public void Keeps()
    {
        var a = new DiscriminatorA();
        Assert.Equal(0, a.Keep());
    }
}
