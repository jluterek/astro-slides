import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "@astro-slides/parser";
import { describe, expect, it } from "vitest";
import {
  addSlide,
  deleteSlide,
  fromBlocks,
  makeBlock,
  setFrontmatter,
  slideCount,
  splitBlock,
  toBlocks,
  updateSlide,
} from "../write-engine.js";

// A small representative deck: headmatter + 3 slides (plain, yaml-frontmatter, plain).
const DECK = `---
title: Test Deck
---

# One

First slide.

---
layout: section
---

## Two

---

## Three

- a
- b
`;

const count = (s: string) => parse(s).slides.length;

describe("toBlocks / fromBlocks", () => {
  it("round-trips a deck source verbatim", () => {
    const blocks = toBlocks(DECK);
    expect(blocks).toHaveLength(3);
    expect(fromBlocks(blocks)).toBe(DECK);
  });

  it("round-trips the real minimal example deck", () => {
    const file = fileURLToPath(new URL("../../../../examples/minimal/slides.md", import.meta.url));
    const src = readFileSync(file, "utf8");
    expect(fromBlocks(toBlocks(src))).toBe(src);
    expect(slideCount(src)).toBe(count(src));
  });

  it("returns no blocks for an empty source", () => {
    expect(toBlocks("")).toEqual([]);
    expect(toBlocks("   \n  ")).toEqual([]);
  });
});

describe("splitBlock", () => {
  it("separates yaml frontmatter from body", () => {
    const { frontmatter, body } = splitBlock("---\nlayout: section\n---\n\n## Two\n");
    expect(frontmatter).toEqual({ layout: "section" });
    expect(body).toBe("## Two");
  });
  it("strips a bare leading separator on a plain block", () => {
    expect(splitBlock("---\n\n## Three\n").body).toBe("## Three");
    expect(splitBlock("---\n\n## Three\n").frontmatter).toEqual({});
  });
});

describe("makeBlock", () => {
  it("emits frontmatter + body when frontmatter is present", () => {
    expect(makeBlock("# Hi", { layout: "cover" })).toBe("---\nlayout: cover\n---\n\n# Hi\n");
  });
  it("emits body only when frontmatter is empty", () => {
    expect(makeBlock("# Hi")).toBe("# Hi\n");
    expect(makeBlock("# Hi", {})).toBe("# Hi\n");
  });
});

describe("addSlide", () => {
  it("appends a slide by default", () => {
    const { source, no } = addSlide(DECK, { content: "## Four\n\nnew" });
    expect(no).toBe(4);
    expect(count(source)).toBe(4);
    expect(parse(source).slides[3]?.content).toContain("Four");
  });

  it("inserts before a 1-based position with frontmatter", () => {
    const { source, no } = addSlide(DECK, {
      content: "## Inserted",
      frontmatter: { layout: "center" },
      at: 2,
    });
    expect(no).toBe(2);
    expect(count(source)).toBe(4);
    expect(parse(source).slides[1]?.frontmatter.layout).toBe("center");
    expect(parse(source).slides[1]?.content).toContain("Inserted");
  });

  it("keeps untouched slides byte-identical when appending", () => {
    const { source } = addSlide(DECK, { content: "## Four" });
    expect(source.startsWith(DECK.trimEnd())).toBe(true);
  });
});

describe("updateSlide", () => {
  it("replaces a slide's body, preserving its frontmatter", () => {
    const out = updateSlide(DECK, 2, { content: "## Two (edited)" });
    expect(count(out)).toBe(3);
    expect(parse(out).slides[1]?.content).toContain("edited");
    expect(parse(out).slides[1]?.frontmatter.layout).toBe("section");
  });

  it("merges frontmatter shallowly", () => {
    const out = updateSlide(DECK, 2, { frontmatter: { class: "dark" } });
    const fm = parse(out).slides[1]?.frontmatter;
    expect(fm?.layout).toBe("section");
    expect(fm?.class).toBe("dark");
  });

  it("throws for an out-of-range slide", () => {
    expect(() => updateSlide(DECK, 9, { content: "x" })).toThrow(/out of range/);
  });
});

describe("deleteSlide", () => {
  it("removes a middle slide", () => {
    const out = deleteSlide(DECK, 2);
    expect(count(out)).toBe(2);
    expect(out).not.toContain("layout: section");
  });

  it("removes the first slide without leaving a stray empty slide", () => {
    const out = deleteSlide(DECK, 1);
    // The promoted slide keeps its frontmatter (so it may open with a `---`), but there
    // must be no phantom empty slide — the count and first-slide content prove that.
    expect(count(out)).toBe(2);
    expect(parse(out).slides[0]?.content).toContain("Two");
    expect(parse(out).slides[0]?.frontmatter.layout).toBe("section");
  });

  it("removes the first slide cleanly when it has no frontmatter", () => {
    const plain = "# One\n\nfirst\n\n---\n\n# Two\n\nsecond\n";
    const out = deleteSlide(plain, 1);
    expect(count(out)).toBe(1);
    expect(out.startsWith("---")).toBe(false);
    expect(parse(out).slides[0]?.content).toContain("Two");
  });
});

describe("setFrontmatter", () => {
  it("merges into deck headmatter (slide 1) when no slide given", () => {
    const out = setFrontmatter(DECK, { theme: "cosmic" });
    const hm = parse(out).headmatter as Record<string, unknown>;
    expect(hm.theme).toBe("cosmic");
    expect(hm.title).toBe("Test Deck");
  });
});

describe("pre-1.0 review regressions", () => {
  it("keeps untouched slides byte-identical in a CRLF deck", () => {
    const crlf =
      "---\r\ntitle: T\r\n---\r\n\r\n# One\r\n\r\n---\r\n\r\n# Two\r\n\r\n---\r\n\r\n# Three\r\n";
    const out = updateSlide(crlf, 2, { content: "# Two (edited)" });
    // Slides 1 and 3 keep their CRLF line endings verbatim.
    expect(out).toContain("title: T\r\n");
    expect(out).toContain("# Three\r\n");
    expect(out).toContain("# Two (edited)");
  });

  it("does not slice code-fence `---` content out as frontmatter", () => {
    const block = "# Slide\n\n```\nfront\n---\nback\n---\nend\n```\n";
    const { frontmatter, body } = splitBlock(block);
    expect(frontmatter).toEqual({});
    expect(body).toContain("front");
    expect(body).toContain("end");
  });

  it("frontmatter-only update preserves a fence containing separators", () => {
    const deck = "---\ntitle: T\n---\n\n# One\n\n---\n\n# Two\n\n```\na\n---\nb\n```\n";
    const out = updateSlide(deck, 2, { frontmatter: { layout: "center" } });
    expect(out).toContain("a\n---\nb");
    expect(parse(out).slides).toHaveLength(2);
  });
});
