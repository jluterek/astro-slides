import { describe, expect, it } from "vitest";
import { parse, parseAsync } from "../parse.js";

const lines = (...l: string[]) => l.join("\n");

const DECK = lines(
  "---",
  "title: My Deck",
  "theme: cosmic",
  "---",
  "# Cover",
  "<!-- note one -->",
  "---",
  "## Second",
  "$$x^2$$",
  "---",
  "layout: center",
  "---",
  "## Third",
);

describe("parse", () => {
  it("produces a typed deck with headmatter, slides, and aggregated features", () => {
    const deck = parse(DECK, { filepath: "/p/slides.md" });
    expect(deck.headmatter.title).toBe("My Deck");
    expect(deck.headmatter.theme).toBe("cosmic");
    expect(deck.slides).toHaveLength(3);
    expect(deck.features.katex).toBe(true);
  });

  it("resolves layouts (cover for slide 1, default otherwise, frontmatter override)", () => {
    const deck = parse(DECK);
    expect(deck.slides.map((s) => s.layout)).toEqual(["cover", "default", "center"]);
  });

  it("numbers slides and extracts notes", () => {
    const deck = parse(DECK);
    expect(deck.slides.map((s) => s.no)).toEqual([1, 2, 3]);
    expect(deck.slides[0]?.notes).toBe("note one");
    expect(deck.slides[0]?.content).toBe("# Cover");
    expect(deck.slides[1]?.notes).toBeNull();
  });

  it("gives every slide a stable revision hash", () => {
    const a = parse(DECK);
    const b = parse(DECK);
    expect(a.slides[0]?.revision).toBe(b.slides[0]?.revision);
    expect(a.slides[0]?.revision).not.toBe(a.slides[1]?.revision);
  });

  it("returns an empty deck for blank source", () => {
    expect(parse("   ").slides).toHaveLength(0);
  });

  it("resolves src: and snippet imports through an injected fs", () => {
    const FILES: Record<string, string> = {
      "/p/code.ts": "const x = 1;",
      "/p/intro.md": "# Imported",
    };
    const src = lines(
      "---",
      "title: T",
      "---",
      "# Main",
      "<<< @/code.ts",
      "---",
      "src: ./intro.md",
      "---",
    );
    const deck = parse(src, {
      filepath: "/p/main.md",
      fs: { readFileSync: (p) => FILES[p] as string },
    });
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]?.content).toContain("const x = 1;");
    expect(deck.slides[1]?.content).toBe("# Imported");
  });

  it("parses Marp directives when marp mode is on", () => {
    const src = lines("---", "marp: true", "---", "# Slide", "<!-- _class: lead -->");
    const deck = parse(src);
    expect((deck.slides[0]?.frontmatter as Record<string, unknown>).class).toBe("lead");
  });
});

describe("parseAsync", () => {
  it("matches the sync parser", async () => {
    const sync = parse(DECK);
    const async = await parseAsync(DECK);
    expect(async.slides.map((s) => s.revision)).toEqual(sync.slides.map((s) => s.revision));
  });
});
