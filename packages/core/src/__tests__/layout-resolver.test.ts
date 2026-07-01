import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  builtinLayoutsDir,
  missingLayouts,
  resolveLayouts,
  userLayoutsDir,
} from "../layout-resolver.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "as-layouts-"));
  writeFileSync(join(dir, "cover.astro"), "<div>custom cover</div>");
  writeFileSync(join(dir, "mine.astro"), "<div>custom</div>");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("resolveLayouts", () => {
  it("resolves all 21 built-ins with no overrides", () => {
    const resolved = resolveLayouts();
    expect(missingLayouts(resolved)).toEqual([]);
    expect(resolved.cover).toBe(join(builtinLayoutsDir(), "cover.astro"));
  });

  it("lets a user layout override the same-named built-in", () => {
    const resolved = resolveLayouts([dir]);
    expect(resolved.cover).toBe(join(dir, "cover.astro"));
    // Non-overridden layouts still point at the built-in folder.
    expect(resolved.default).toBe(join(builtinLayoutsDir(), "default.astro"));
  });

  it("adds user-only layouts to the map", () => {
    const resolved = resolveLayouts([dir]);
    expect(resolved.mine).toBe(join(dir, "mine.astro"));
  });

  it("applies later override dirs over earlier ones", () => {
    const higher = mkdtempSync(join(tmpdir(), "as-layouts-hi-"));
    writeFileSync(join(higher, "cover.astro"), "<div>higher</div>");
    const resolved = resolveLayouts([dir, higher]);
    expect(resolved.cover).toBe(join(higher, "cover.astro"));
    rmSync(higher, { recursive: true, force: true });
  });
});

describe("userLayoutsDir", () => {
  it("is the project's layouts folder", () => {
    expect(userLayoutsDir("/proj")).toBe(join("/proj", "layouts"));
  });
});
