import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  discoverDecks,
  discoverRoutePrefix,
  listFiles,
  padNo,
  parseRange,
  printUrl,
  slideFileName,
  slideUrl,
  zipDirectory,
} from "../main.js";

describe("parseRange", () => {
  it("expands single, comma, and dash forms; sorts + dedupes", () => {
    expect(parseRange("1,3-5,3", 10)).toEqual([1, 3, 4, 5]);
    expect(parseRange("5-3", 10)).toEqual([3, 4, 5]); // reversed range
  });
  it("returns every slide for an empty spec", () => {
    expect(parseRange(undefined, 3)).toEqual([1, 2, 3]);
    expect(parseRange("", 2)).toEqual([1, 2]);
  });
  it("drops out-of-bounds numbers", () => {
    expect(parseRange("0,2,99", 3)).toEqual([2]);
  });
});

describe("url + naming helpers", () => {
  it("builds print and embed slide URLs", () => {
    expect(printUrl("http://h:4321/", "talk")).toBe("http://h:4321/print/talk");
    expect(slideUrl("http://h:4321", "talk", 3)).toBe("http://h:4321/talk/3?embed=1");
    expect(slideUrl("http://h:4321", "talk", 3, 2)).toContain("step=2");
  });
  it("zero-pads and names per-slide files (with optional click step)", () => {
    expect(padNo(3, 120)).toBe("003");
    expect(slideFileName("talk", 3, 20, "png")).toBe("talk-03.png");
    expect(slideFileName("talk", 3, 20, "png", 2)).toBe("talk-03.2.png");
  });
});

describe("bundle (listFiles + zipDirectory)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "as-bundle-"));
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "index.html"), "<html></html>");
    writeFileSync(join(dir, "sub", "a.css"), "body{}");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("lists files recursively as sorted POSIX paths", () => {
    expect(listFiles(dir)).toEqual(["index.html", "sub/a.css"]);
  });

  it("zips every file into a loadable archive", async () => {
    const buf = await zipDirectory(dir);
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).sort()).toContain("sub/a.css");
    expect(await zip.file("index.html")?.async("string")).toBe("<html></html>");
  });
});

describe("discoverDecks", () => {
  let dist: string;
  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), "as-dist-"));
    // print/<deck>/index.html marks a deck; <deck>/<n>/index.html are the slides.
    mkdirSync(join(dist, "print", "talk"), { recursive: true });
    writeFileSync(join(dist, "print", "talk", "index.html"), "");
    for (const n of [1, 2]) {
      mkdirSync(join(dist, "talk", String(n)), { recursive: true });
      writeFileSync(
        join(dist, "talk", String(n), "index.html"),
        `<section data-slide-no="${n}" data-title="Title ${n}"></section>`,
      );
    }
  });
  afterEach(() => rmSync(dist, { recursive: true, force: true }));

  it("finds decks, slide totals, and titles from the built output", () => {
    expect(discoverDecks(dist)).toEqual([
      { deck: "talk", total: 2, titles: ["Title 1", "Title 2"] },
    ]);
  });

  it("returns nothing when there is no print output", () => {
    expect(discoverDecks(mkdtempSync(join(tmpdir(), "as-empty-")))).toEqual([]);
  });
});

describe("discoverRoutePrefix", () => {
  it("returns '' when print/ sits at the dist root", () => {
    const dist = mkdtempSync(join(tmpdir(), "as-pfx-"));
    mkdirSync(join(dist, "print", "talk"), { recursive: true });
    expect(discoverRoutePrefix(dist)).toBe("");
    rmSync(dist, { recursive: true, force: true });
  });

  it("finds decks namespaced under an integration prefix (issue #39)", () => {
    const dist = mkdtempSync(join(tmpdir(), "as-pfx-"));
    mkdirSync(join(dist, "slides", "print", "talk"), { recursive: true });
    mkdirSync(join(dist, "blog", "post"), { recursive: true }); // host content ignored
    expect(discoverRoutePrefix(dist)).toBe("/slides");
    rmSync(dist, { recursive: true, force: true });
  });

  it("returns '' when no print marker exists at all", () => {
    const dist = mkdtempSync(join(tmpdir(), "as-pfx-"));
    mkdirSync(join(dist, "about"), { recursive: true });
    expect(discoverRoutePrefix(dist)).toBe("");
    rmSync(dist, { recursive: true, force: true });
  });
});
