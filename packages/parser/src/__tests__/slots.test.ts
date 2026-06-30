import { describe, expect, it } from "vitest";
import { hasSlots, parseSlots } from "../slots.js";

const lines = (...l: string[]) => l.join("\n");

describe("parseSlots", () => {
  it("puts everything in `default` when there are no markers", () => {
    const slots = parseSlots(lines("# Title", "body"));
    expect(Object.keys(slots)).toEqual(["default"]);
    expect(slots.default).toBe("# Title\nbody");
  });

  it("splits content by `::name::` markers", () => {
    const slots = parseSlots(lines("left content", "::right::", "right content"));
    expect(slots.default).toBe("left content");
    expect(slots.right).toBe("right content");
  });

  it("supports multiple named slots", () => {
    const slots = parseSlots(lines("d", "::a::", "aa", "::b::", "bb"));
    expect(slots).toMatchObject({ default: "d", a: "aa", b: "bb" });
  });

  it("ignores `::name::` inside a code fence", () => {
    const slots = parseSlots(lines("```", "::right::", "```"));
    expect(Object.keys(slots)).toEqual(["default"]);
  });

  it("hasSlots reflects presence of named slots", () => {
    expect(hasSlots(lines("a", "::b::", "c"))).toBe(true);
    expect(hasSlots("plain")).toBe(false);
  });
});
