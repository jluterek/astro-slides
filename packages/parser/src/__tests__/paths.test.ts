import { describe, expect, it } from "vitest";
import { dirname, langFromPath, normalizePath, resolveImport } from "../paths.js";

describe("normalizePath", () => {
  it("collapses . and ..", () => {
    expect(normalizePath("/a/b/../c")).toBe("/a/c");
    expect(normalizePath("a/./b")).toBe("a/b");
    expect(normalizePath("/a/b/../../c")).toBe("/c");
  });
});

describe("dirname", () => {
  it("returns the directory portion", () => {
    expect(dirname("/a/b/c.md")).toBe("/a/b");
    expect(dirname("file.md")).toBe(".");
    expect(dirname("/file.md")).toBe("/");
  });
});

describe("resolveImport", () => {
  it("resolves @/ and / against root, others against the file", () => {
    expect(resolveImport("@/snippets/a.ts", "/proj/deck/slides.md", "/proj")).toBe(
      "/proj/snippets/a.ts",
    );
    expect(resolveImport("/x/a.ts", "/proj/deck/slides.md", "/proj")).toBe("/proj/x/a.ts");
    expect(resolveImport("./a.ts", "/proj/deck/slides.md", "/proj")).toBe("/proj/deck/a.ts");
    expect(resolveImport("../shared/a.ts", "/proj/deck/slides.md", "/proj")).toBe(
      "/proj/shared/a.ts",
    );
  });
});

describe("langFromPath", () => {
  it("maps extensions to fence languages", () => {
    expect(langFromPath("a.ts")).toBe("ts");
    expect(langFromPath("a.py")).toBe("python");
    expect(langFromPath("a.unknownext")).toBe("unknownext");
  });
});
