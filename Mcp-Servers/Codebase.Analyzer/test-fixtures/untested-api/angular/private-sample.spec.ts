import { PrivateSample } from "./private-sample";

describe("PrivateSample", () => {
  it("reveals", () => {
    expect(new PrivateSample().reveal()).toBe(1);
  });
});
