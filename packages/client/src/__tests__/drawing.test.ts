import { describe, expect, it } from "vitest";
import { normalizePointer } from "../drawing/laser.js";

describe("normalizePointer", () => {
  const box = { left: 100, top: 50, width: 400, height: 200 };

  it("normalizes a pointer inside the box to 0..1", () => {
    expect(normalizePointer(300, 150, box)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizePointer(100, 50, box)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(500, 250, box)).toEqual({ x: 1, y: 1 });
  });

  it("returns null outside the box", () => {
    expect(normalizePointer(99, 150, box)).toBeNull();
    expect(normalizePointer(300, 260, box)).toBeNull();
  });

  it("returns null for a zero-size box", () => {
    expect(normalizePointer(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});
