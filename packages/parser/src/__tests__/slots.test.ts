import { describe, expect, it } from "vitest";
import { parse } from "../index.js";
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

describe("::read:: slot (issue #45)", () => {
  it("captures read prose as a named slot, with trailing speaker notes still extracted", () => {
    const deck = parse(
      "---\ntitle: T\n---\n\n# Slide\n\nBody.\n\n::read::\n\nCompanion prose with a [link](https://x.test).\n\n<!-- private delivery cue -->\n",
    );
    const slide = deck.slides[0];
    expect(slide?.slots.read).toContain("Companion prose");
    expect(slide?.slots.default).toContain("Body.");
    expect(slide?.slots.default).not.toContain("Companion prose");
    expect(slide?.notes).toBe("private delivery cue");
    expect(slide?.slots.read).not.toContain("private delivery cue");
  });
});
