import { describe, expect, it } from "vitest";
import {
  mergeRawFrontmatter,
  parseHeadmatter,
  parseSlideFrontmatter,
  parseYaml,
} from "../frontmatter.js";

describe("parseYaml", () => {
  it("returns {} for null/empty", () => {
    expect(parseYaml(null)).toEqual({});
    expect(parseYaml("   ")).toEqual({});
  });

  it("parses a mapping", () => {
    expect(parseYaml("a: 1\nb: two")).toEqual({ a: 1, b: "two" });
  });

  it("throws on a non-mapping", () => {
    expect(() => parseYaml("- a\n- b")).toThrow(/mapping/);
  });
});

describe("parseHeadmatter", () => {
  it("applies deck-level defaults", () => {
    const h = parseHeadmatter({});
    expect(h.theme).toBe("starter");
    expect(h.aspectRatio).toBe("16:9");
    expect(h.transition).toBe("fade");
    expect(h.presenter).toBe(true);
    expect(h.colorSchema).toBe("auto");
    expect(h.canvasWidth).toBe(1920);
  });

  it("keeps explicit values and passes through unknown keys", () => {
    const h = parseHeadmatter({ theme: "cosmic", customField: 7 });
    expect(h.theme).toBe("cosmic");
    expect((h as Record<string, unknown>).customField).toBe(7);
  });
});

describe("parseSlideFrontmatter", () => {
  it("applies slide-level defaults", () => {
    const f = parseSlideFrontmatter({});
    expect(f.hide).toBe(false);
    expect(f.zoom).toBe(1);
    expect(f.clicksStart).toBe(0);
    expect(f.exportAs).toBe("editable");
    expect(f.layout).toBeUndefined();
  });

  it("preserves layout-specific (loose) fields", () => {
    const f = parseSlideFrontmatter({ layout: "two-cols", leftClass: "pr-4" });
    expect(f.layout).toBe("two-cols");
    expect((f as Record<string, unknown>).leftClass).toBe("pr-4");
  });
});

describe("mergeRawFrontmatter", () => {
  it("lets the override win, shallowly", () => {
    expect(mergeRawFrontmatter({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });
});
