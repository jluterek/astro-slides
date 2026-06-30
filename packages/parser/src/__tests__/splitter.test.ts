import { describe, expect, it } from "vitest";
import { advanceComment, splitSlides } from "../splitter.js";

const lines = (...l: string[]) => l.join("\n");

describe("splitSlides", () => {
  it("separates headmatter from a single slide", () => {
    const slides = splitSlides(lines("---", "theme: x", "---", "# Hello"));
    expect(slides).toHaveLength(1);
    expect(slides[0]?.frontmatterRaw).toBe("theme: x");
    expect(slides[0]?.frontmatterStyle).toBe("yaml");
    expect(slides[0]?.body).toBe("# Hello");
  });

  it("splits multiple slides on `---`", () => {
    const slides = splitSlides(lines("# One", "---", "# Two", "---", "# Three"));
    expect(slides.map((s) => s.body)).toEqual(["# One", "# Two", "# Three"]);
    expect(slides.every((s) => s.frontmatterRaw === null)).toBe(true);
  });

  it("reads a slide's own frontmatter after a separator", () => {
    const slides = splitSlides(
      lines("---", "theme: x", "---", "# One", "---", "layout: center", "---", "# Two"),
    );
    expect(slides).toHaveLength(2);
    expect(slides[0]?.frontmatterRaw).toBe("theme: x");
    expect(slides[1]?.frontmatterRaw).toBe("layout: center");
    expect(slides[1]?.body).toBe("# Two");
  });

  it("does not split on `---` inside fenced code", () => {
    const slides = splitSlides(
      lines("# S", "```ts", "const a = 1", "---", "const b = 2", "```", "after"),
    );
    expect(slides).toHaveLength(1);
    expect(slides[0]?.body).toContain("const b = 2");
  });

  it("does not split on `---` inside an HTML comment", () => {
    const slides = splitSlides(lines("# S", "<!--", "---", "-->", "end"));
    expect(slides).toHaveLength(1);
  });

  it("starts with content when there is no headmatter", () => {
    const slides = splitSlides(lines("# First", "---", "# Second"));
    expect(slides[0]?.frontmatterRaw).toBeNull();
    expect(slides).toHaveLength(2);
  });

  it("supports block (```yaml) frontmatter", () => {
    const slides = splitSlides(lines("```yaml", "layout: center", "```", "# Body"));
    expect(slides[0]?.frontmatterStyle).toBe("block");
    expect(slides[0]?.frontmatterRaw).toBe("layout: center");
    expect(slides[0]?.body).toBe("# Body");
  });

  it("treats a tilde fence the same as a backtick fence", () => {
    const slides = splitSlides(lines("# S", "~~~", "---", "~~~"));
    expect(slides).toHaveLength(1);
  });
});

describe("advanceComment", () => {
  it("tracks open/close across a line", () => {
    expect(advanceComment("text <!-- open", false)).toBe(true);
    expect(advanceComment("close --> text", true)).toBe(false);
    expect(advanceComment("<!-- inline -->", false)).toBe(false);
    expect(advanceComment("no comment", false)).toBe(false);
  });
});
