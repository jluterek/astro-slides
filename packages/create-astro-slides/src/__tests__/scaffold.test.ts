import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isDirEmpty,
  packageName,
  readFlag,
  scaffold,
  titleFromName,
  writeScaffold,
} from "../main.js";

describe("readFlag", () => {
  it("reads --flag=value and --flag value forms", () => {
    expect(readFlag(["a", "--theme=cosmic"], "theme")).toBe("cosmic");
    expect(readFlag(["a", "--theme", "starter"], "theme")).toBe("starter");
    expect(readFlag(["a"], "theme")).toBeUndefined();
  });
});

describe("titleFromName", () => {
  it("humanizes a directory name", () => {
    expect(titleFromName("my-talk")).toBe("My Talk");
    expect(titleFromName("q3_review")).toBe("Q3 Review");
    expect(titleFromName("decks/intro")).toBe("Intro");
    expect(titleFromName("")).toBe("My Deck");
  });
});

describe("packageName", () => {
  it("produces a safe npm name", () => {
    expect(packageName("My Talk")).toBe("my-talk");
    expect(packageName("decks/Q3 Review!")).toBe("q3-review");
  });
});

describe("scaffold", () => {
  it("renders a runnable project with the chosen theme", () => {
    const files = scaffold({ name: "my-talk", theme: "cosmic" });
    expect([...files.keys()].sort()).toEqual([
      ".gitignore",
      "README.md",
      "astro.config.mjs",
      "package.json",
      "slides.mdx",
    ]);

    const pkg = JSON.parse(files.get("package.json") ?? "{}");
    expect(pkg.name).toBe("my-talk");
    expect(pkg.scripts.dev).toBe("astro-slides dev");
    expect(pkg.dependencies["@astro-slides/cli"]).toBeDefined();

    const slides = files.get("slides.mdx") ?? "";
    expect(slides).toContain("theme: cosmic");
    expect(slides).toContain("# My Talk");

    expect(files.get("astro.config.mjs")).toContain("astroSlides()");
  });

  it("uses the starter theme when chosen", () => {
    const slides = scaffold({ name: "d", theme: "starter" }).get("slides.mdx") ?? "";
    expect(slides).toContain("theme: starter");
  });
});

describe("writeScaffold + isDirEmpty", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it("writes every file to disk and reports emptiness", () => {
    const root = mkdtempSync(join(tmpdir(), "cas-"));
    dirs.push(root);
    const target = join(root, "proj");
    expect(isDirEmpty(target)).toBe(true);

    const files = scaffold({ name: "proj", theme: "cosmic" });
    writeScaffold(target, files);

    expect(isDirEmpty(target)).toBe(false);
    expect(readFileSync(join(target, "package.json"), "utf8")).toContain("proj");
    expect(readFileSync(join(target, "slides.mdx"), "utf8")).toContain("theme: cosmic");
  });
});
