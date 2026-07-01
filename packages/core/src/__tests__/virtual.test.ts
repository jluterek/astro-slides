import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "@astro-slides/parser";
import { afterAll, describe, expect, it } from "vitest";
import type { LoadedDeck } from "../deck-loader.js";
import { emitSlideModules, type SlideModuleMeta } from "../mdx-emit.js";
import {
  configsModuleSource,
  layoutsModuleSource,
  slidesModuleSource,
  titlesModuleSource,
} from "../virtual.js";

const loaded = (source: string): LoadedDeck => ({
  name: "slides",
  file: "/x/slides.md",
  deck: parse(source, { filepath: "/x/slides.md" }),
});

const dirs: string[] = [];
const tempRoot = (): string => {
  const d = mkdtempSync(join(tmpdir(), "as-emit-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("emitSlideModules", () => {
  it("writes per-slot .mdx files and returns metadata", () => {
    const root = tempRoot();
    const metas = emitSlideModules(root, [
      loaded("---\ntitle: T\n---\n# Hello\n\ntext\n---\n## Two"),
    ]);
    expect(metas).toHaveLength(2);
    expect(metas[0]?.layout).toBe("cover");
    expect(metas[1]?.layout).toBe("default");
    const file = metas[0]?.slotFiles.default;
    expect(file).toContain(".astro-slides");
    expect(readFileSync(file as string, "utf8")).toContain("# Hello");
  });

  it("emits named slots and skips hidden slides", () => {
    const root = tempRoot();
    const metas = emitSlideModules(root, [
      loaded(
        "A\n---\nlayout: two-cols\n---\nleft\n\n::right::\n\nright col\n---\nhide: true\n---\n# H",
      ),
    ]);
    expect(metas).toHaveLength(2); // hidden slide dropped
    expect(Object.keys(metas[1]?.slotFiles ?? {}).sort()).toEqual(["default", "right"]);
  });
});

describe("slidesModuleSource", () => {
  const meta: SlideModuleMeta = {
    deck: "slides",
    no: 1,
    index: 0,
    layout: "cover",
    title: "T",
    notes: null,
    class: null,
    background: null,
    frontmatter: {},
    slotFiles: { default: "/abs/1.default.mdx", right: "/abs/1.right.mdx" },
  };

  it("imports slot modules and sums their totalClicks exports", () => {
    const src = slidesModuleSource([meta]);
    expect(src).toContain('import S_0_0, * as N_0_0 from "/abs/1.default.mdx";');
    expect(src).toContain('import S_0_1, * as N_0_1 from "/abs/1.right.mdx";');
    expect(src).toContain('"default": S_0_0');
    expect(src).toContain('"right": S_0_1');
    expect(src).toContain("totalClicks: (N_0_0.totalClicks || 0) + (N_0_1.totalClicks || 0)");
    expect(src).toContain("export const slides");
    expect(src).toContain("export default slides");
  });

  it("lets frontmatter `clicks` override the computed total", () => {
    const src = slidesModuleSource([{ ...meta, frontmatter: { clicks: 3 } }]);
    expect(src).toContain("totalClicks: 3,");
    expect(src).not.toContain("N_0_0.totalClicks || 0) +");
  });
});

describe("other virtual modules", () => {
  it("configs module exports configs + deckConfig", () => {
    const src = configsModuleSource([loaded("---\ntitle: My\n---\n# H")]);
    expect(src).toContain("export const configs");
    expect(src).toContain("export const deckConfig");
    expect(src).toContain('"title":"My"');
  });

  it("titles module exports its array", () => {
    const root = tempRoot();
    const metas = emitSlideModules(root, [loaded("---\ntitle: My\n---\n# Hello")]);
    expect(titlesModuleSource(metas)).toContain("export const titles");
  });

  it("layouts module imports resolved components into a name->component map", () => {
    const src = layoutsModuleSource({
      cover: "/abs/cover.astro",
      "two-cols": "/abs/two-cols.astro",
    });
    expect(src).toContain('import layout_0 from "/abs/cover.astro";');
    expect(src).toContain('"cover": layout_0');
    expect(src).toContain('"two-cols": layout_1');
  });
});
