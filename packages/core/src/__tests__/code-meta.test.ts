import { describe, expect, it } from "vitest";
import { isMagicMoveMeta, parseCodeMeta, parseLineRanges } from "../code/meta.js";

describe("parseLineRanges", () => {
  it("expands single lines and ranges", () => {
    expect(parseLineRanges("1,3-5")).toEqual([1, 3, 4, 5]);
  });
  it("dedupes, sorts, and tolerates whitespace / reversed ranges", () => {
    expect(parseLineRanges(" 5-3 , 1 ,1 ")).toEqual([1, 3, 4, 5]);
  });
  it("ignores malformed parts", () => {
    expect(parseLineRanges("2,abc,4-")).toEqual([2]);
  });
});

describe("parseCodeMeta", () => {
  it("reads a static highlight spec", () => {
    const m = parseCodeMeta("{1,3-4}");
    expect(m.highlightLines).toEqual([1, 3, 4]);
    expect(m.clickSteps).toBeNull();
  });

  it("reads click steps split on `|` (including `all`)", () => {
    const m = parseCodeMeta("{1|2-3|all}");
    expect(m.clickSteps).toEqual([[1], [2, 3], "all"]);
    expect(m.highlightLines).toEqual([]);
  });

  it("parses flags and key=value options", () => {
    const m = parseCodeMeta('twoslash line-numbers title="demo.ts" maxHeight=12em');
    expect(m.twoslash).toBe(true);
    expect(m.lineNumbers).toBe(true);
    expect(m.title).toBe("demo.ts");
    expect(m.maxHeight).toBe("12em");
  });

  it("defaults everything off for empty meta", () => {
    const m = parseCodeMeta("");
    expect(m).toMatchObject({
      highlightLines: [],
      clickSteps: null,
      twoslash: false,
      lineNumbers: false,
    });
  });
});

describe("isMagicMoveMeta", () => {
  it("detects magic-move and magic flags", () => {
    expect(isMagicMoveMeta("magic-move")).toBe(true);
    expect(isMagicMoveMeta("magic")).toBe(true);
    expect(isMagicMoveMeta("{1,2}")).toBe(false);
  });
});
