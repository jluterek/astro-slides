import { parse } from "@astro-slides/parser";
import { describe, expect, it } from "vitest";
import type { LoadedDeck } from "../deck-loader.js";
import {
  buildSlideRecords,
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

describe("buildSlideRecords", () => {
  it("builds render-ready records with resolved layouts", () => {
    const records = buildSlideRecords([loaded("---\ntitle: T\n---\n# Hello\n\ntext\n---\n## Two")]);
    expect(records).toHaveLength(2);
    expect(records[0]?.html).toContain("<h1>Hello</h1>");
    expect(records[0]?.deck).toBe("slides");
    expect(records[0]?.no).toBe(1);
    expect(records[0]?.layout).toBe("cover");
    expect(records[1]?.layout).toBe("default");
  });

  it("skips hidden slides", () => {
    const records = buildSlideRecords([loaded("# A\n---\nhide: true\n---\n# B")]);
    expect(records).toHaveLength(1);
    expect(records[0]?.html).toContain("<h1>A</h1>");
  });
});

describe("virtual module sources", () => {
  const records = buildSlideRecords([loaded("---\ntitle: My\n---\n# Hello")]);

  it("slides module exports a loadable manifest", () => {
    const src = slidesModuleSource(records);
    expect(src).toContain("export const slides =");
    expect(src).toContain("export default slides");
    expect(src).toContain("<h1>Hello</h1>");
  });

  it("configs module exports configs + deckConfig", () => {
    const src = configsModuleSource([loaded("---\ntitle: My\n---\n# H")]);
    expect(src).toContain("export const configs");
    expect(src).toContain("export const deckConfig");
    expect(src).toContain('"title":"My"');
  });

  it("titles module exports its array", () => {
    expect(titlesModuleSource(records)).toContain("export const titles");
  });

  it("layouts module imports resolved components into a name->component map", () => {
    const src = layoutsModuleSource({
      cover: "/abs/cover.astro",
      "two-cols": "/abs/two-cols.astro",
    });
    expect(src).toContain('import layout_0 from "/abs/cover.astro";');
    expect(src).toContain('"cover": layout_0');
    expect(src).toContain('"two-cols": layout_1');
    expect(src).toContain("export default layouts");
  });
});
