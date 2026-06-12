import { UpwardWidget } from "./child/upward.widget";

// Spec in the PARENT directory of the source file — only reachable via the
// upward spec walk, not an adjacent lookup.
describe("UpwardWidget", () => {
  it("renders", () => {
    expect(new UpwardWidget().render()).toBe("x");
  });
});
