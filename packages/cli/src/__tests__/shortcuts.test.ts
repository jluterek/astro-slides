import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { editorCommand, findDeckSource, openCommand } from "../main.js";

describe("openCommand", () => {
  it("uses the platform default opener", () => {
    expect(openCommand("darwin", "http://x")).toEqual({ cmd: "open", args: ["http://x"] });
    expect(openCommand("win32", "http://x")).toEqual({
      cmd: "cmd",
      args: ["/c", "start", "", "http://x"],
    });
    expect(openCommand("linux", "http://x")).toEqual({ cmd: "xdg-open", args: ["http://x"] });
  });
});

describe("editorCommand", () => {
  it("prefers $VISUAL, falls back to $EDITOR, and splits flags", () => {
    expect(editorCommand({ VISUAL: "code -w", EDITOR: "vim" }, "f.mdx")).toEqual({
      cmd: "code",
      args: ["-w", "f.mdx"],
    });
    expect(editorCommand({ EDITOR: "vim" }, "f.mdx")).toEqual({ cmd: "vim", args: ["f.mdx"] });
  });

  it("returns null when no editor is configured", () => {
    expect(editorCommand({}, "f.mdx")).toBeNull();
  });
});

describe("findDeckSource", () => {
  const dirs: string[] = [];
  const tmp = (): string => {
    const d = mkdtempSync(join(tmpdir(), "as-deck-"));
    dirs.push(d);
    return d;
  };
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it("prefers a root slides file", () => {
    const root = tmp();
    writeFileSync(join(root, "slides.md"), "# hi");
    expect(findDeckSource(root)).toBe(join(root, "slides.md"));
  });

  it("falls back to the first content deck", () => {
    const root = tmp();
    const deck = join(root, "content", "decks", "talk");
    mkdirSync(deck, { recursive: true });
    writeFileSync(join(deck, "slides.mdx"), "# hi");
    expect(findDeckSource(root)).toBe(join(deck, "slides.mdx"));
  });

  it("returns the root when no deck source is found", () => {
    const root = tmp();
    expect(findDeckSource(root)).toBe(root);
  });
});
