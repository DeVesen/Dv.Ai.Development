using Xunit;

namespace SampleApp.Tests;

public class SampleCalculatorTests
{
    [Fact]
    public void Add_ReturnsSum()
    {
        var calc = new SampleCalculator();
        Assert.Equal(5, calc.Add(2, 3));
    }
}
