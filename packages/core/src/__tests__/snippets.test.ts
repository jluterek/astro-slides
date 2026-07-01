import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractRegion, remarkSnippets, resolveSnippetPath } from "../code/snippets.js";

interface Node {
  type: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  children?: Node[];
}

const SAMPLE = [
  "export interface G { name: string }",
  "// #region greet",
  "export function greet(g: G) {",
  '  return "hi " + g.name;',
  "}",
  "// #endregion greet",
  "greet({ name: 'x' });",
].join("\n");

describe("extractRegion", () => {
  it("returns the whole file (trimmed) when no region is named", () => {
    expect(extractRegion("a\nb\n\n", null)).toBe("a\nb");
  });

  it("extracts a named region and dedents it, excluding the markers", () => {
    expect(extractRegion(SAMPLE, "greet")).toBe(
      'export function greet(g: G) {\n  return "hi " + g.name;\n}',
    );
  });

  it("falls back to the whole file for an unknown region", () => {
    expect(extractRegion("only one line", "nope")).toBe("only one line");
  });
});

describe("resolveSnippetPath", () => {
  it("maps `@/` to the project root", () => {
    expect(resolveSnippetPath("/proj", "@/src/a.ts")).toBe("/proj/src/a.ts");
  });
  it("passes absolute paths through", () => {
    expect(resolveSnippetPath("/proj", "/abs/a.ts")).toBe("/abs/a.ts");
  });
});

describe("remarkSnippets", () => {
  it("replaces a `<<<` paragraph with a code node loaded from disk (region + lang)", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-snip-"));
    writeFileSync(join(dir, "greet.ts"), SAMPLE);

    const seen: string[] = [];
    // MDX splits `{ts} {1}` into text + expression children — mirror that shape.
    const para: Node = {
      type: "paragraph",
      children: [
        { type: "text", value: "<<< @/greet.ts#greet " },
        { type: "mdxTextExpression", value: "ts" },
        { type: "text", value: " " },
        { type: "mdxTextExpression", value: "1" },
      ],
    };
    const tree: Node = { type: "root", children: [para] };

    remarkSnippets({ root: dir, onFile: (f) => seen.push(f) })(tree);

    expect(para.type).toBe("code");
    expect(para.lang).toBe("ts"); // {ts} override
    expect(para.meta).toBe("{1}"); // line-highlight meta survives
    expect(para.value).toContain("export function greet");
    expect(para.value).not.toContain("#region");
    expect(seen).toEqual([join(dir, "greet.ts")]);
  });

  it("emits a not-found placeholder for a missing file", () => {
    const para: Node = {
      type: "paragraph",
      children: [{ type: "text", value: "<<< @/missing.ts" }],
    };
    const tree: Node = { type: "root", children: [para] };
    remarkSnippets({ root: "/nope" })(tree);
    expect(para.type).toBe("code");
    expect(para.value).toContain("snippet not found");
  });

  it("leaves ordinary paragraphs untouched", () => {
    const para: Node = { type: "paragraph", children: [{ type: "text", value: "hello world" }] };
    const tree: Node = { type: "root", children: [para] };
    remarkSnippets({ root: "/x" })(tree);
    expect(para.type).toBe("paragraph");
  });
});
