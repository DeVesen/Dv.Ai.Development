import { DiscriminatorA } from "./discriminator-a";

// Imports DiscriminatorA but exercises only the kept method — the untested
// member name is deliberately NOT mentioned here (not even in a comment), so the
// only place that name appears is DiscriminatorB's spec.
describe("DiscriminatorA", () => {
  it("keeps", () => {
    expect(new DiscriminatorA().keep()).toBe(0);
  });
});
