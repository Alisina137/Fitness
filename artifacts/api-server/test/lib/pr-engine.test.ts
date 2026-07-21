import { describe, it, expect } from "vitest";
import { calculateImprovement } from "../../src/lib/pr-engine.js";

describe("calculateImprovement", () => {
  it("returns 0 when the previous value is 0 (avoids divide-by-zero)", () => {
    expect(calculateImprovement(0, 100)).toBe(0);
  });

  it("computes a positive percentage improvement", () => {
    // (110 - 100) / 100 = 10%
    expect(calculateImprovement(100, 110)).toBe(10);
  });

  it("computes a negative percentage for a regression", () => {
    expect(calculateImprovement(100, 90)).toBe(-10);
  });

  it("rounds to two decimal places", () => {
    // (101 - 100) / 100 * 100 = 1
    expect(calculateImprovement(3, 4)).toBe(33.33);
  });

  it("returns 0 when values are equal", () => {
    expect(calculateImprovement(50, 50)).toBe(0);
  });
});
