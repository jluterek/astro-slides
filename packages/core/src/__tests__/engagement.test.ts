import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REACTION_EMOJI, renderAudiencePage } from "../server/audience-page.js";
import {
  audienceAllowed,
  engagementFile,
  loadEngagement,
  saveEngagement,
} from "../server/engagement.js";

describe("audienceAllowed (server-side role scoping)", () => {
  it("permits only vote / qa/ask / react / hello", () => {
    expect(audienceAllowed(JSON.stringify({ type: "vote", poll: "p", client: "c", option: 0 })));
    for (const type of ["vote", "qa/ask", "react", "hello"]) {
      expect(audienceAllowed(JSON.stringify({ type }))).toBe(true);
    }
  });

  it("drops navigation, drawing, and state injection from audience clients", () => {
    for (const type of [
      "goto",
      "blackout",
      "draw",
      "draw/clear",
      "laser",
      "state",
      "qa/moderate",
      "poll/close",
      "poll/open",
      "timer/start",
    ]) {
      expect(audienceAllowed(JSON.stringify({ type }))).toBe(false);
    }
  });

  it("drops garbage that isn't JSON or has no string type", () => {
    expect(audienceAllowed("not json")).toBe(false);
    expect(audienceAllowed(JSON.stringify({ type: 7 }))).toBe(false);
    expect(audienceAllowed(JSON.stringify({}))).toBe(false);
  });
});

describe("engagement persistence", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "as-eng-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("round-trips a snapshot and sanitizes the deck name", () => {
    const snap = {
      polls: { p1: { votes: { c1: 0, c2: 1 }, closed: true } },
      questions: [{ id: "q1", text: "Why?", at: 1, status: "new" }],
    };
    expect(saveEngagement(root, "my/deck", snap)).toBe(true);
    expect(engagementFile(root, "my/deck")).not.toContain("my/deck");
    expect(loadEngagement(root, "my/deck")).toEqual(snap);
  });

  it("returns empty for a missing or corrupt file", () => {
    expect(loadEngagement(root, "nope")).toEqual({ polls: {}, questions: [] });
  });
});

describe("audience page", () => {
  it("renders self-contained HTML with the audience role baked into the WS query", () => {
    const html = renderAudiencePage({ deck: "talk", wsPath: "/__astro-slides/sync" });
    expect(html).toContain("role=audience");
    expect(html).toContain("as-client-id");
    for (const emoji of REACTION_EMOJI) expect(html).toContain(emoji);
  });

  it("escapes a hostile deck name", () => {
    const html = renderAudiencePage({ deck: "<script>x</script>", wsPath: "/s" });
    expect(html).not.toContain("<script>x</script>");
  });
});
