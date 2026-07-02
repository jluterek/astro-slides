import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDeckServer } from "../server.js";

const DECK = `---
title: E2E Deck
theme: starter
---

# Intro

Hello.

---
layout: section
---

## Middle

<!-- speaker note here -->

---

## End

- a
- b
`;

/** Read the JSON payload a tool returned in its text content block. */
// biome-ignore lint/suspicious/noExplicitAny: MCP tool result content is a broad union.
function payload(result: any): any {
  const text = result.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

describe("MCP server end-to-end (in-process client)", () => {
  let root: string;
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), "as-mcp-"));
    writeFileSync(join(root, "slides.md"), DECK);
    server = createDeckServer({ root, readOnly: false });
    client = new Client({ name: "test", version: "0.0.0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), client.connect(a)]);
  });

  afterEach(async () => {
    await client.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("exposes the read, write, navigate, and export tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    for (const t of [
      "list_decks",
      "list_slides",
      "get_slide",
      "get_speaker_notes",
      "list_layouts",
      "list_themes",
      "add_slide",
      "update_slide",
      "delete_slide",
      "set_frontmatter",
      "set_theme",
      "goto_slide",
      "next_slide",
      "prev_slide",
      "set_step",
      "export_pdf",
      "export_png",
      "export_pptx",
      "export_md",
      "screenshot_slide",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("lists decks and slides with parsed detail", async () => {
    const decks = payload(await client.callTool({ name: "list_decks", arguments: {} })).decks;
    expect(decks).toHaveLength(1);
    expect(decks[0].deck).toBe("slides");
    expect(decks[0].slideCount).toBe(3);

    const slides = payload(
      await client.callTool({ name: "list_slides", arguments: { deck: "slides" } }),
    ).slides;
    expect(slides.map((s: { layout: string }) => s.layout)).toEqual([
      "cover",
      "section",
      "default",
    ]);

    const notes = payload(
      await client.callTool({ name: "get_speaker_notes", arguments: { deck: "slides", no: 2 } }),
    ).notes;
    expect(notes).toContain("speaker note");
  });

  it("runs a write sequence and persists to disk (add → update → delete)", async () => {
    const added = payload(
      await client.callTool({
        name: "add_slide",
        arguments: {
          deck: "slides",
          content: "## Added\n\nfresh",
          frontmatter: { layout: "center" },
        },
      }),
    );
    expect(added.slide.no).toBe(4);

    const updated = payload(
      await client.callTool({
        name: "update_slide",
        arguments: { deck: "slides", no: 1, content: "# Intro (edited)" },
      }),
    );
    expect(updated.slide.title).toContain("edited");

    // The file on disk reflects both edits.
    const onDisk = readFileSync(join(root, "slides.md"), "utf8");
    expect(onDisk).toContain("Intro (edited)");
    expect(onDisk).toContain("## Added");

    const slidesNow = payload(
      await client.callTool({ name: "list_slides", arguments: { deck: "slides" } }),
    ).slides;
    expect(slidesNow).toHaveLength(4);
    expect(slidesNow[3].layout).toBe("center");

    const del = payload(
      await client.callTool({ name: "delete_slide", arguments: { deck: "slides", no: 4 } }),
    );
    expect(del.ok).toBe(true);
    expect(del.slideCount).toBe(3);
  });

  it("set_theme rewrites the headmatter", async () => {
    await client.callTool({ name: "set_theme", arguments: { deck: "slides", theme: "cosmic" } });
    expect(readFileSync(join(root, "slides.md"), "utf8")).toContain("theme: cosmic");
  });

  it("returns a tool error for an unknown deck", async () => {
    const res = await client.callTool({ name: "list_slides", arguments: { deck: "nope" } });
    // biome-ignore lint/suspicious/noExplicitAny: reading the isError flag off the result.
    expect((res as any).isError).toBe(true);
  });

  it("omits write AND export tools in read-only mode (exports write files too)", async () => {
    const ro = createDeckServer({ root, readOnly: true });
    const roClient = new Client({ name: "ro", version: "0.0.0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([ro.connect(b), roClient.connect(a)]);
    const names = (await roClient.listTools()).tools.map((t) => t.name);
    expect(names).not.toContain("add_slide");
    expect(names).not.toContain("export_md");
    expect(names).not.toContain("export_pdf");
    expect(names).not.toContain("screenshot_slide");
    expect(names).toContain("list_slides");
    await roClient.close();
  });

  it("rejects an output path that escapes the project root", async () => {
    for (const output of ["../evil.md", "/tmp/evil.md"]) {
      const res = await client.callTool({
        name: "export_md",
        arguments: { deck: "slides", output },
      });
      // biome-ignore lint/suspicious/noExplicitAny: reading the isError flag off the result.
      expect((res as any).isError).toBe(true);
    }
  });
});
