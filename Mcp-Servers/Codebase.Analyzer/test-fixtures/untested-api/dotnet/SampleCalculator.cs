namespace SampleApp;

public class SampleCalculator
{
    // Referenced from SampleCalculatorTests → must NOT appear as untested.
    public int Add(int a, int b) => a + b;

    // Never referenced from any test file → must appear with reason "no_reference_found".
    public int Subtract(int a, int b) => a - b;
}
