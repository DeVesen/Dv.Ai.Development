// Discriminating fixture (per-class scoping must be falsifiable):
// `compute` is NEVER referenced from THIS class's spec, but the same word
// `compute` appears in DiscriminatorB's spec. With the real import gate the
// member check is scoped to specs that import DiscriminatorA only, so
// `DiscriminatorA.compute` MUST be reported as "no_reference_found". A rollback
// to global (cross-class) member matching would wrongly treat it as referenced
// (false negative) and turn the harness red.
export class DiscriminatorA {
  compute(): number {
    return 1;
  }

  // Referenced from discriminator-a.spec.ts → keeps the class "tested".
  keep(): number {
    return 0;
  }
}
