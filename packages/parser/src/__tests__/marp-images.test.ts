import { describe, expect, it } from "vitest";
import { extractMarpImages } from "../marp.js";
import { parse } from "../parse.js";

describe("extractMarpImages", () => {
  it("turns a `![bg](url)` into a background and strips it from the body", () => {
    const { body, frontmatter } = extractMarpImages("![bg](/hero.png)\n\n# Title\n");
    expect(frontmatter.background).toBe("/hero.png");
    expect(body).not.toContain("![bg]");
    expect(body).toContain("# Title");
  });

  it("accepts a size keyword on a bg image", () => {
    const { frontmatter } = extractMarpImages("![bg cover](https://x/y.jpg)\n");
    expect(frontmatter.background).toBe("https://x/y.jpg");
  });

  it("rewrites `![w:200 h:120](url)` to a sized <img>", () => {
    const { body } = extractMarpImages("![w:200 h:120](/pic.png)");
    expect(body).toContain('<img src="/pic.png"');
    expect(body).toContain('width="200"');
    expect(body).toContain('height="120"');
  });

  it("rewrites a width-only sized image", () => {
    const { body } = extractMarpImages("![w:300](/p.png)");
    expect(body).toContain('width="300"');
    expect(body).not.toContain("height=");
  });

  it("leaves an ordinary image untouched", () => {
    const src = "![a cat](/cat.png)";
    expect(extractMarpImages(src).body).toBe(src);
  });
});

describe("Marp mode wires image shorthand through the parser", () => {
  it("sets the slide background from `![bg]` when marp:true", () => {
    const deck = parse("---\nmarp: true\n---\n\n![bg](/hero.png)\n\n# Hello\n");
    const slide = deck.slides[0];
    expect(slide?.frontmatter.background).toBe("/hero.png");
    expect(slide?.content).not.toContain("![bg]");
  });

  it("does NOT apply Marp image shorthand when marp is off", () => {
    const deck = parse("---\ntitle: t\n---\n\n![bg](/hero.png)\n");
    // Without marp mode the bg image stays literal content, no background set.
    expect(deck.slides[0]?.frontmatter.background).toBeUndefined();
    expect(deck.slides[0]?.content).toContain("![bg]");
  });
});
