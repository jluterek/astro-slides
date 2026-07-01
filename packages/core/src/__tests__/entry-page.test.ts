import { describe, expect, it } from "vitest";
import { renderEntryPage } from "../server/entry-page.js";

describe("renderEntryPage", () => {
  it("embeds the deck, WS path, and total in the page config", () => {
    const html = renderEntryPage({ deck: "talk", wsPath: "/__astro-slides/sync", total: 12 });
    expect(html).toContain("laser pad");
    expect(html).toContain("/__astro-slides/sync");
    // The config JSON drives the client script.
    expect(html).toMatch(/"deck":"talk"/);
    expect(html).toMatch(/"total":12/);
    expect(html).toMatch(/"token":""/);
  });

  it("carries a token when the gateway requires one", () => {
    const html = renderEntryPage({ deck: "d", wsPath: "/s", total: 1, token: "abc123" });
    expect(html).toMatch(/"token":"abc123"/);
  });

  it("escapes the deck name in the title", () => {
    const html = renderEntryPage({ deck: "<img src=x>", wsPath: "/s", total: 1 });
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;img src=x&gt;");
  });
});
