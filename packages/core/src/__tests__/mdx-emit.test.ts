import { mkdtempSync, readdirSync, readFileSync as readFs, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "@astro-slides/parser";
import { describe, expect, it } from "vitest";
import type { LoadedDeck } from "../deck-loader.js";
import { emitSlideModules, slideModulesDir } from "../mdx-emit.js";

function loadFixtureDeck(name: string, source: string): LoadedDeck {
  return { name, file: `/virtual/${name}/slides.md`, deck: parse(source) };
}

describe("byte-stable emission (issue #61)", () => {
  it("re-emitting unchanged decks touches no files (zero watcher events)", () => {
    const root = mkdtempSync(join(tmpdir(), "as-emit-"));
    const decks = [loadFixtureDeck("talk", "# One\n\n---\n\n# Two\n")];
    emitSlideModules(root, decks);
    const dir = slideModulesDir(root);
    const before = new Map(
      readdirSync(join(dir, "talk")).map((f) => [f, statSync(join(dir, "talk", f)).mtimeMs]),
    );
    // A second emit of identical content must not rewrite anything — steady state
    // produces zero filesystem events, which is what breaks the #61 feedback loop.
    emitSlideModules(root, decks);
    for (const [f, mtime] of before) {
      expect(statSync(join(dir, "talk", f)).mtimeMs).toBe(mtime);
    }
    rmSync(root, { recursive: true, force: true });
  });

  it("removes stray files individually when slides disappear (no tree rm-rf)", () => {
    const root = mkdtempSync(join(tmpdir(), "as-emit-"));
    emitSlideModules(root, [loadFixtureDeck("talk", "# One\n\n---\n\n# Two\n")]);
    const dir = join(slideModulesDir(root), "talk");
    expect(readdirSync(dir).sort()).toEqual(["1.default.mdx", "2.default.mdx"]);
    emitSlideModules(root, [loadFixtureDeck("talk", "# Only\n")]);
    expect(readdirSync(dir)).toEqual(["1.default.mdx"]);
    rmSync(root, { recursive: true, force: true });
  });

  it("changed content is rewritten (stability never serves stale bytes)", () => {
    const root = mkdtempSync(join(tmpdir(), "as-emit-"));
    emitSlideModules(root, [loadFixtureDeck("talk", "# One\n")]);
    emitSlideModules(root, [loadFixtureDeck("talk", "# One edited\n")]);
    const file = join(slideModulesDir(root), "talk", "1.default.mdx");
    expect(readFs(file, "utf8")).toContain("edited");
    rmSync(root, { recursive: true, force: true });
  });
});
