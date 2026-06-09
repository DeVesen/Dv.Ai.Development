using Xunit;

namespace BeFileMode.Tests;

// Lives in a sibling *.Tests project; reached from Calculator.cs only via the
// upward .sln solution root (FindSolutionRoot). The "Calc.Tests" folder name
// must NOT cause the source file to be misclassified as a test (file-name-only
// IsTestFile check).
public class CalculatorTests
{
    [Fact]
    public void Multiplies()
    {
        var calc = new Calculator();
        Assert.Equal(6, calc.Multiply(2, 3));
    }
}
