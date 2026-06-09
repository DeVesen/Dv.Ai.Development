namespace SampleApp;

// Sibling class whose test exercises a member also named `Compute`. The "decoy"
// half of the discriminating pair (see DiscriminatorA.cs).
public class DiscriminatorB
{
    public int Compute() => 2;
}
