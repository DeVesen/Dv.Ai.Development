namespace BeFileMode;

public class Calculator
{
    // Referenced from the sibling Calc.Tests project → must NOT appear.
    public int Multiply(int a, int b) => a * b;

    // Never referenced from any test file → reason "no_reference_found".
    public int Divide(int a, int b) => a / b;
}
