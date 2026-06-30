import { describe, expect, it } from "vitest";
import { extractMarpDirectives } from "../marp.js";

const lines = (...l: string[]) => l.join("\n");

describe("extractMarpDirectives", () => {
  it("pulls a single-line directive out of the body", () => {
    const { body, directives } = extractMarpDirectives(lines("<!-- _class: lead -->", "# Slide"));
    expect(directives).toEqual({ class: "lead" });
    expect(body).toBe("# Slide");
  });

  it("parses a multi-line directive comment", () => {
    const { directives } = extractMarpDirectives(
      lines("<!--", "_class: lead", "paginate: true", "-->", "# S"),
    );
    expect(directives).toEqual({ class: "lead", paginate: true });
  });

  it("maps backgroundColor → background and coerces values", () => {
    const { directives } = extractMarpDirectives("<!-- backgroundColor: black -->");
    expect(directives).toEqual({ background: "black" });
  });

  it("leaves prose speaker-note comments untouched", () => {
    const input = lines("# Slide", "<!-- this is a real note, not directives -->");
    const { body, directives } = extractMarpDirectives(input);
    expect(directives).toEqual({});
    expect(body).toBe(input);
  });
});
