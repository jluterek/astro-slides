import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_THEMES, discoverUserThemes, unknownThemeNames } from "../theme-resolver.js";
import { userThemesModuleSource } from "../virtual.js";

describe("user theme discovery (issue #49)", () => {
  it("finds <root>/themes/<name>/theme.css and ignores strays", () => {
    const root = mkdtempSync(join(tmpdir(), "as-theme-"));
    mkdirSync(join(root, "themes", "sphere"), { recursive: true });
    writeFileSync(join(root, "themes", "sphere", "theme.css"), "[data-theme='sphere']{}");
    mkdirSync(join(root, "themes", "empty-folder"), { recursive: true }); // no css
    writeFileSync(join(root, "themes", "readme.md"), "not a theme");
    const found = discoverUserThemes(root);
    expect(found.map((t) => t.name)).toEqual(["sphere"]);
    expect(found[0]?.css.endsWith("theme.css")).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("returns empty without a themes dir", () => {
    const root = mkdtempSync(join(tmpdir(), "as-theme-"));
    expect(discoverUserThemes(root)).toEqual([]);
    rmSync(root, { recursive: true, force: true });
  });

  it("flags theme names that resolve nowhere (the silent-fallback warning)", () => {
    const user = [{ name: "sphere", css: "/x/theme.css" }];
    expect(unknownThemeNames(["cosmic", "sphere", "mystery", ""], user)).toEqual(["mystery"]);
    expect(BUNDLED_THEMES.has("starter")).toBe(true);
  });

  it("emits one CSS import per discovered theme", () => {
    expect(userThemesModuleSource([])).toContain("export default null");
    const src = userThemesModuleSource(["/a/theme.css", "/b/theme.css"]);
    expect(src).toContain('import "/a/theme.css";');
    expect(src).toContain('import "/b/theme.css";');
  });
});
