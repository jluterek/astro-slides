import { describe, expect, it } from "vitest";
import { extractNotes } from "../notes.js";

const lines = (...l: string[]) => l.join("\n");

describe("extractNotes", () => {
  it("extracts a trailing HTML comment as notes", () => {
    const { body, notes } = extractNotes(lines("# Slide", "", "<!-- speaker note -->"));
    expect(notes).toBe("speaker note");
    expect(body).toBe("# Slide");
  });

  it("returns null when the comment is not trailing", () => {
    const { body, notes } = extractNotes(lines("<!-- not a note -->", "# Slide"));
    expect(notes).toBeNull();
    expect(body).toContain("# Slide");
  });

  it("returns null when there is no comment", () => {
    expect(extractNotes("# Slide").notes).toBeNull();
  });

  it("takes the last comment when several are present", () => {
    const { notes } = extractNotes(lines("<!-- early -->", "# Slide", "<!-- the note -->"));
    expect(notes).toBe("the note");
  });

  it("treats an empty trailing comment as no notes", () => {
    expect(extractNotes(lines("# Slide", "<!-- -->")).notes).toBeNull();
  });
});
