import { describe, expect, it } from "vitest";
import { parse } from "../parse.js";
import { slideTitle, summarizeDeck } from "../summary.js";

const lines = (...l: string[]) => l.join("\n");

describe("summarizeDeck", () => {
  it("uses the headmatter title and counts slides", () => {
    const deck = parse(lines("---", "title: Talk", "---", "# A", "---", "## B"));
    const summary = summarizeDeck(deck);
    expect(summary.title).toBe("Talk");
    expect(summary.slideCount).toBe(2);
    expect(summary.slides[0]?.title).toBe("A");
  });

  it("falls back to the first slide heading when no headmatter title", () => {
    const deck = parse(lines("# Hello World", "---", "# Two"));
    expect(summarizeDeck(deck).title).toBe("Hello World");
  });
});

describe("slideTitle", () => {
  it("returns the first heading or null", () => {
    const deck = parse(lines("# Heading", "---", "no heading here"));
    expect(slideTitle(deck.slides[0] as never)).toBe("Heading");
    expect(slideTitle(deck.slides[1] as never)).toBeNull();
  });
});
