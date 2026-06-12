namespace SampleApp;

// Discriminating fixture (per-class scoping must be falsifiable):
// `Compute` is NEVER referenced from DiscriminatorATests, but the same word
// `Compute` appears in DiscriminatorBTests. Because the member check is scoped to
// the test files associated with THIS class only, `DiscriminatorA.Compute` MUST
// be reported as "no_reference_found". A rollback to global (cross-class) member
// matching would wrongly treat it as referenced (false negative) → harness red.
//
// The two `Compute` overloads also exercise member dedup: a single
// `DiscriminatorA.Compute` finding must be emitted, not one per overload.
public class DiscriminatorA
{
    public int Compute() => 1;
    public int Compute(int seed) => seed;

    // Referenced from DiscriminatorATests → keeps the class "tested".
    public int Keep() => 0;
}
