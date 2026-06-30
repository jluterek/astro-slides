import { describe, expect, it } from "vitest";
import { detectFeatures, extractImages, mergeFeatures } from "../features.js";

const lines = (...l: string[]) => l.join("\n");

describe("detectFeatures", () => {
  it("detects inline and block KaTeX", () => {
    expect(detectFeatures("the value $x^2$ here").katex).toBe(true);
    expect(detectFeatures(lines("$$", "a = b", "$$")).katex).toBe(true);
  });

  it("does not flag a price as math", () => {
    expect(detectFeatures("it costs $5 and $10 total").katex).toBe(false);
  });

  it("detects mermaid, plantuml, monaco, twoslash, magic-move from fences", () => {
    expect(detectFeatures(lines("```mermaid", "graph TD", "```")).mermaid).toBe(true);
    expect(detectFeatures(lines("```plantuml", "@startuml", "```")).plantuml).toBe(true);
    expect(detectFeatures(lines("```ts {monaco}", "x", "```")).monaco).toBe(true);
    expect(detectFeatures(lines("```ts twoslash", "x", "```")).twoslash).toBe(true);
    expect(detectFeatures(lines("```md magic-move", "x", "```")).magicMove).toBe(true);
  });
});

describe("extractImages", () => {
  it("collects Markdown and HTML image sources", () => {
    const body = lines("![alt](./a.png)", '<img src="https://x/b.jpg" />');
    expect(extractImages(body)).toEqual(["./a.png", "https://x/b.jpg"]);
  });
});

describe("mergeFeatures", () => {
  it("ORs two feature sets", () => {
    const a = detectFeatures("```mermaid\n```");
    const b = detectFeatures("$x$");
    const merged = mergeFeatures(a, b);
    expect(merged.mermaid).toBe(true);
    expect(merged.katex).toBe(true);
  });
});
