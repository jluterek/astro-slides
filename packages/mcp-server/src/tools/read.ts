import { summarizeDeck, summarizeSlide } from "@astro-slides/parser";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { guard, ok, type ServerContext } from "../context.js";
import { discoverDeckFiles, loadDeck, resolveDeckFile } from "../deck-loader.js";
import { listLayouts, listThemes } from "../discovery.js";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export function registerReadTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_decks",
    {
      title: "List decks",
      description:
        "List every deck in the project with its title, slide count, and slide summaries.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () =>
      guard(() => {
        const decks = discoverDeckFiles(ctx.root).map((file) => {
          const { name, deck } = loadDeck(ctx.root, file);
          return { deck: name, ...summarizeDeck(deck) };
        });
        return ok({ decks });
      }),
  );

  server.registerTool(
    "list_slides",
    {
      title: "List slides",
      description: "List a deck's slides as summaries (number, title, layout, click steps).",
      inputSchema: { deck: z.string().describe("Deck id (from list_decks).") },
      annotations: READ_ONLY,
    },
    ({ deck }) =>
      guard(() => {
        const { deck: parsed } = loadDeck(ctx.root, resolveDeckFile(ctx.root, deck));
        return ok({ slides: parsed.slides.map(summarizeSlide) });
      }),
  );

  server.registerTool(
    "get_slide",
    {
      title: "Get slide",
      description:
        "Get one slide's full detail: frontmatter, MDX content, speaker notes, layout, and click steps.",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        no: z.number().int().positive().describe("1-based slide number."),
      },
      annotations: READ_ONLY,
    },
    ({ deck, no }) =>
      guard(() => {
        const { deck: parsed } = loadDeck(ctx.root, resolveDeckFile(ctx.root, deck));
        const slide = parsed.slides.find((s) => s.no === no);
        if (!slide)
          throw new Error(
            `Slide ${no} not found in deck "${deck}" (deck has ${parsed.slides.length} slides).`,
          );
        return ok({ slide });
      }),
  );

  server.registerTool(
    "get_speaker_notes",
    {
      title: "Get speaker notes",
      description: "Get a slide's speaker notes (Markdown), or empty when it has none.",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        no: z.number().int().positive().describe("1-based slide number."),
      },
      annotations: READ_ONLY,
    },
    ({ deck, no }) =>
      guard(() => {
        const { deck: parsed } = loadDeck(ctx.root, resolveDeckFile(ctx.root, deck));
        const slide = parsed.slides.find((s) => s.no === no);
        if (!slide)
          throw new Error(
            `Slide ${no} not found in deck "${deck}" (deck has ${parsed.slides.length} slides).`,
          );
        return ok({ notes: slide.notes ?? "" });
      }),
  );

  server.registerTool(
    "list_layouts",
    {
      title: "List layouts",
      description: "List available slide layouts (built-in plus any project overrides).",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => guard(() => ok({ layouts: listLayouts(ctx.root) })),
  );

  server.registerTool(
    "list_themes",
    {
      title: "List themes",
      description: "List available themes (built-in plus any project `themes/` folders).",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => guard(() => ok({ themes: listThemes(ctx.root) })),
  );
}
