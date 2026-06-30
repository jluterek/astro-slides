import { describe, expect, it } from "vitest";
import { extractRegion, inlineSnippets, inlineSnippetsAsync } from "../snippets.js";

const lines = (...l: string[]) => l.join("\n");

const FILES: Record<string, string> = {
  "/proj/snippets/auth.ts": lines("export const a = 1;", "export const b = 2;"),
  "/proj/snippets/region.ts": lines(
    "before",
    "// #region core",
    "const x = 1;",
    "// #endregion core",
    "after",
  ),
};
const read = (p: string): string => {
  const f = FILES[p];
  if (f === undefined) throw new Error(`missing file ${p}`);
  return f;
};
const FROM = "/proj/slides.md";
const ROOT = "/proj";

describe("inlineSnippets", () => {
  it("inlines a whole file as a fenced block with inferred language", () => {
    const out = inlineSnippets("<<< @/snippets/auth.ts", FROM, ROOT, read);
    expect(out).toBe(lines("```ts", "export const a = 1;", "export const b = 2;", "```"));
  });

  it("inlines only the requested region", () => {
    const out = inlineSnippets("<<< @/snippets/region.ts#core", FROM, ROOT, read);
    expect(out).toBe(lines("```ts", "const x = 1;", "```"));
  });

  it("forwards trailing meta to the fence", () => {
    const out = inlineSnippets("<<< @/snippets/auth.ts {twoslash}", FROM, ROOT, read);
    expect(out.split("\n")[0]).toBe("```ts {twoslash}");
  });

  it("does not touch `<<<` inside a code fence", () => {
    const body = lines("```md", "<<< @/snippets/auth.ts", "```");
    expect(inlineSnippets(body, FROM, ROOT, read)).toBe(body);
  });

  it("matches the async variant", async () => {
    const sync = inlineSnippets("<<< @/snippets/auth.ts", FROM, ROOT, read);
    const asyncOut = await inlineSnippetsAsync("<<< @/snippets/auth.ts", FROM, ROOT, async (p) =>
      read(p),
    );
    expect(asyncOut).toBe(sync);
  });
});

describe("extractRegion", () => {
  it("slices a named region and dedents it", () => {
    const src = lines("// #region x", "  indented", "    more", "// #endregion x");
    expect(extractRegion(src, "x")).toBe(lines("indented", "  more"));
  });

  it("throws when the region is missing", () => {
    expect(() => extractRegion("nothing here", "x")).toThrow(/not found/);
  });
});
