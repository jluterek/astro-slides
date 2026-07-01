import { describe, expect, it } from "vitest";
import { computeScale } from "../scaling.js";

const design = { width: 1920, height: 1080 };

describe("computeScale", () => {
  it("fits width-constrained viewports", () => {
    expect(computeScale({ width: 960, height: 1000 }, design)).toBeCloseTo(0.5);
  });

  it("fits height-constrained viewports", () => {
    expect(computeScale({ width: 1920, height: 540 }, design)).toBeCloseTo(0.5);
  });

  it("returns 1 for degenerate sizes", () => {
    expect(computeScale({ width: 0, height: 0 }, design)).toBe(1);
    expect(computeScale({ width: 100, height: 100 }, { width: 0, height: 0 })).toBe(1);
  });
});
