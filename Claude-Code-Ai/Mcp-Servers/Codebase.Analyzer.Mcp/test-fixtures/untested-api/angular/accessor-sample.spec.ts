import { AccessorSample } from "./accessor-sample";

describe("AccessorSample", () => {
  it("reads the label", () => {
    expect(new AccessorSample().label).toBe("x");
  });
});
