import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deckNameFromFile, discoverDeckFiles, loadAllDecks } from "../deck-loader.js";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "as-deck-"));
  writeFileSync(join(root, "slides.md"), "---\ntitle: T\n---\n# One\n---\n# Two");
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("deckNameFromFile", () => {
  it("derives the name from a content/decks path or the basename", () => {
    expect(deckNameFromFile("/p", "/p/content/decks/intro/slides.md")).toBe("intro");
    expect(deckNameFromFile("/p", "/p/slides.md")).toBe("slides");
  });
});

describe("discoverDeckFiles / loadAllDecks", () => {
  it("finds and parses the root deck", () => {
    expect(discoverDeckFiles(root)).toHaveLength(1);
    const decks = loadAllDecks(root);
    expect(decks[0]?.name).toBe("slides");
    expect(decks[0]?.deck.slides).toHaveLength(2);
    expect(decks[0]?.deck.headmatter.title).toBe("T");
  });

  it("honors explicit deck paths", () => {
    expect(discoverDeckFiles(root, ["slides.md"])).toEqual([join(root, "slides.md")]);
  });
});
