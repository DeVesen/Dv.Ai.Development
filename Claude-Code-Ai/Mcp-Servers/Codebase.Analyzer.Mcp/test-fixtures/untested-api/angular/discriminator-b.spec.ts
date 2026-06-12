import { DiscriminatorB } from "./discriminator-b";

// Exercises the shared member name — but only for DiscriminatorB. The sibling
// class name is deliberately NOT mentioned here, so the import gate cannot link
// this spec (and its reference) to the sibling class.
describe("DiscriminatorB", () => {
  it("computes", () => {
    expect(new DiscriminatorB().compute()).toBe(2);
  });
});
