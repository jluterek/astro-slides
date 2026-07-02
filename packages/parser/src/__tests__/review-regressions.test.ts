import { describe, expect, it } from "vitest";
import { extractMarpDirectives, extractMarpImages } from "../marp.js";
import { parse } from "../parse.js";
import { dirname, resolveImport } from "../paths.js";
import { splitSlides } from "../splitter.js";
import { slideTitle } from "../summary.js";

/** Regressions locked in by the pre-1.0 review (Phase 18). */

describe("splitter: fences inside HTML comments", () => {
  it("does not open a code fence from a fence-looking line inside a comment", () => {
    const slides = splitSlides("Slide 1\n<!--\n```js\n-->\n---\nSlide 2\n");
    expect(slides).toHaveLength(2);
    expect(slides[1]?.body).toContain("Slide 2");
  });
});

describe("splitter: BOM", () => {
  it("detects headmatter behind a UTF-8 BOM", () => {
    const slides = splitSlides("﻿---\ntitle: My Deck\n---\n# Hello\n");
    expect(slides[0]?.frontmatterRaw).toContain("title: My Deck");
    expect(slides[0]?.body).not.toContain("title:");
  });
});

describe("splitter: block frontmatter must be a YAML mapping", () => {
  it("keeps a leading yaml code *sample* (a list) as slide content", () => {
    const slides = splitSlides("```yaml\n- item1\n- item2\n```\n\nHow to list things.\n");
    expect(slides[0]?.frontmatterRaw).toBeNull();
    expect(slides[0]?.body).toContain("- item1");
  });
});

describe("paths: containment and separators", () => {
  it("throws when a snippet/src import escapes the project root", () => {
    expect(() => resolveImport("@/../../etc/passwd", "/proj/deck.md", "/proj")).toThrow(
      /outside the project root/,
    );
    expect(() => resolveImport("/../../../etc/passwd", "/proj/deck.md", "/proj")).toThrow();
    expect(() => resolveImport("../../secrets.txt", "/proj/decks/a.md", "/proj")).toThrow();
  });

  it("still resolves legitimate imports, including from Windows-style file paths", () => {
    expect(resolveImport("./intro.mdx", "/proj/decks/a.md", "/proj")).toBe("/proj/decks/intro.mdx");
    expect(dirname("C:\\proj\\deck.md")).toBe("C:/proj");
    expect(resolveImport("./x.md", "C:\\proj\\deck.md", "C:\\proj")).toBe("C:/proj/x.md");
  });
});

describe("marp: bg image matching", () => {
  it("leaves an image whose alt merely starts with 'bg' alone", () => {
    const { body, frontmatter } = extractMarpImages("![bg-hero](hero.png)\n");
    expect(frontmatter.background).toBeUndefined();
    expect(body).toContain("![bg-hero](hero.png)");
  });

  it("strips ALL split-background images; the first sets `background`", () => {
    const { body, frontmatter } = extractMarpImages("![bg left](a.png)\n![bg right](b.png)\n");
    expect(frontmatter.background).toBe("a.png");
    expect(body).not.toContain("b.png");
  });
});

describe("marp: directive comments vs prose notes", () => {
  it("keeps a capitalized prose comment as a note, not directives", () => {
    const { directives } = extractMarpDirectives("# S1\n\n<!-- Remember: pause here -->\n");
    expect(directives).toEqual({});
    const deck = parse("---\nmarp: true\n---\n# S1\n\n<!-- Remember: pause here -->\n");
    expect(deck.slides[0]?.notes).toContain("Remember: pause here");
  });
});

describe("summary: slideTitle ignores code fences", () => {
  it("does not pick a # comment inside a code block as the title", () => {
    const deck = parse("Some text\n\n```python\n# setup step\nx = 1\n```\n");
    const slide = deck.slides[0];
    expect(slide && slideTitle(slide)).toBeNull();
  });

  it("still finds a real heading after a code block", () => {
    const deck = parse("```js\n// x\n```\n\n## Real Title\n");
    const slide = deck.slides[0];
    expect(slide && slideTitle(slide)).toBe("Real Title");
  });
});
