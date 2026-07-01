import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  drawingFileName,
  drawingKeyFromFile,
  drawingsDir,
  loadDrawings,
  saveDrawing,
} from "../drawing/persistence.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "as-draw-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("drawing file naming", () => {
  it("round-trips a slide-step key through the file name", () => {
    expect(drawingFileName("3:1")).toBe("3-1.svg");
    expect(drawingKeyFromFile("3-1.svg")).toBe("3:1");
    expect(drawingFileName("bad")).toBeNull();
    expect(drawingKeyFromFile("notes.txt")).toBeNull();
  });
});

describe("saveDrawing / loadDrawings", () => {
  it("persists and reloads a deck's annotations", () => {
    saveDrawing(root, "talk", "1:0", "<path d='a'/>");
    saveDrawing(root, "talk", "2:1", "<path d='b'/>");
    expect(loadDrawings(root, "talk")).toEqual({
      "1:0": "<path d='a'/>",
      "2:1": "<path d='b'/>",
    });
    expect(existsSync(join(drawingsDir(root, "talk"), "1-0.svg"))).toBe(true);
  });

  it("deletes the file when the SVG is empty (an erased slide)", () => {
    saveDrawing(root, "talk", "1:0", "<path/>");
    saveDrawing(root, "talk", "1:0", "   ");
    expect(loadDrawings(root, "talk")).toEqual({});
  });

  it("namespaces by deck and returns {} for an unknown deck", () => {
    saveDrawing(root, "a", "1:0", "<x/>");
    expect(loadDrawings(root, "b")).toEqual({});
  });

  it("rejects a malformed key", () => {
    expect(saveDrawing(root, "talk", "oops", "<x/>")).toBe(false);
  });
});
