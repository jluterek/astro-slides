import { describe, expect, it } from "vitest";
import { injectClickMarkers, renderNotes } from "../notes.js";

describe("injectClickMarkers", () => {
  it("numbers bare [click] markers in order", () => {
    const out = injectClickMarkers("a [click] b [click] c");
    expect(out).toContain('data-click="1"');
    expect(out).toContain('data-click="2"');
  });
  it("honors explicit [click:N] and continues numbering after it", () => {
    const out = injectClickMarkers("[click:3] then [click]");
    expect(out).toContain('data-click="3"');
    expect(out).toContain('data-click="4"');
  });
  it("leaves text without markers untouched", () => {
    expect(injectClickMarkers("no markers here")).toBe("no markers here");
  });
});

describe("renderNotes", () => {
  it("renders markdown with click markers to HTML", () => {
    const html = renderNotes("Reveal **first** [click], then done.");
    expect(html).toContain("<strong>first</strong>");
    expect(html).toContain('class="as-note-click" data-click="1"');
  });
  it("returns an empty string for empty / null notes", () => {
    expect(renderNotes(null)).toBe("");
    expect(renderNotes("   ")).toBe("");
  });
});
