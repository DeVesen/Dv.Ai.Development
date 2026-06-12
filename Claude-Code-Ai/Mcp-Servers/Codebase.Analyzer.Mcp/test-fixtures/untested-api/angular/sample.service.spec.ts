import { SampleService } from "./sample.service";

describe("SampleService", () => {
  it("returns the value", () => {
    const service = new SampleService();
    expect(service.getValue()).toBe(42);
  });
});
