import { describe, expect, it } from "vitest";
import { type ExpandContext, expandImports } from "../imports.js";
import { splitSlides } from "../splitter.js";

const lines = (...l: string[]) => l.join("\n");

function ctxFor(filepath: string, root: string): ExpandContext {
  return { filepath, root, maxDepth: 20, stack: new Set([filepath]) };
}

describe("expandImports", () => {
  it("inlines an imported file and merges importer frontmatter over the first slide", () => {
    const FILES: Record<string, string> = {
      "/p/child.md": lines("---", "layout: center", "title: child", "---", "# Child"),
    };
    const read = (p: string): string => FILES[p] as string;
    const entry = splitSlides(lines("# Parent", "---", "src: ./child.md", "title: over", "---"));

    const resolved = expandImports(entry, ctxFor("/p/main.md", "/p"), read);

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.body).toBe("# Parent");
    expect(resolved[1]?.body).toBe("# Child");
    expect(resolved[1]?.source).toBe("/p/child.md");
    // importer's `title: over` overrides the child's `title: child`; src is dropped.
    expect(resolved[1]?.rawFm).toMatchObject({ layout: "center", title: "over" });
    expect(resolved[1]?.rawFm.src).toBeUndefined();
  });

  it("resolves imports recursively", () => {
    const FILES: Record<string, string> = {
      "/p/a.md": lines("---", "src: ./b.md", "---"),
      "/p/b.md": "# Grandchild",
    };
    const read = (p: string): string => FILES[p] as string;
    const entry = splitSlides(lines("---", "src: ./a.md", "---"));

    const resolved = expandImports(entry, ctxFor("/p/main.md", "/p"), read);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.body).toBe("# Grandchild");
  });

  it("throws on a circular import", () => {
    const FILES: Record<string, string> = {
      "/p/b.md": lines("---", "src: ./a.md", "---"),
    };
    const read = (p: string): string => FILES[p] as string;
    const entry = splitSlides(lines("---", "src: ./b.md", "---"));

    expect(() => expandImports(entry, ctxFor("/p/a.md", "/p"), read)).toThrow(/[Cc]ircular/);
  });
});
