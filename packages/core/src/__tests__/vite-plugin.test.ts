import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VIRTUAL_IDS } from "../virtual.js";
import { astroSlidesVitePlugin } from "../vite-plugin.js";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "as-vp-"));
  writeFileSync(join(root, "slides.md"), "# Hello\n\nworld");
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("astroSlidesVitePlugin", () => {
  it("resolves virtual ids and loads their source", () => {
    const plugin = astroSlidesVitePlugin({ root });
    const resolveId = plugin.resolveId as unknown as (id: string) => string | null;
    const load = plugin.load as unknown as (id: string) => string | null;

    expect(resolveId(VIRTUAL_IDS.slides)).toBe("\0@astro-slides/slides");
    expect(resolveId("unrelated-module")).toBeNull();

    const src = load(`\0${VIRTUAL_IDS.slides}`);
    expect(src).toContain("export const slides");
    expect(src).toContain("<h1>Hello</h1>");
  });

  it("resolves all four virtual modules", () => {
    const plugin = astroSlidesVitePlugin({ root });
    const resolveId = plugin.resolveId as unknown as (id: string) => string | null;
    for (const id of Object.values(VIRTUAL_IDS)) {
      expect(resolveId(id)).toBe(`\0${id}`);
    }
  });
});
