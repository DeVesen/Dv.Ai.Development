// Sibling class whose spec exercises a member also named `compute`. This is the
// "decoy" half of the discriminating pair (see discriminator-a.ts).
export class DiscriminatorB {
  compute(): number {
    return 2;
  }
}
