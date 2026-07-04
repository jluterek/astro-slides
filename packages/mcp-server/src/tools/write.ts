import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parse, summarizeDeck, summarizeSlide } from "@astro-slides/parser";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { guard, ok, type ServerContext } from "../context.js";
import { deckNameFromFile, resolveDeckFile } from "../deck-loader.js";
import { addSlide, deleteSlide, setFrontmatter, slideCount, updateSlide } from "../write-engine.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;
const frontmatterArg = z
  .record(z.string(), z.unknown())
  .describe(
    "Frontmatter key/values, merged shallowly into existing. Set a key to null to remove it.",
  );

/**
 * Single-writer queue. Every mutation runs to completion before the next starts, so two
 * connected clients can't interleave a read-modify-write on the same file (last-write-wins
 * within a serialized chain). File writes are whole-file (atomic to watchers) so Astro/Vite
 * HMR sees a coherent deck.
 */
function makeQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}

// ONE queue per process, not per McpServer: the Streamable HTTP transport builds a fresh
// server (and would build a fresh queue) per request, which un-serializes concurrent
// writes from two clients — a lost-update race on the deck file.
const enqueue = makeQueue();

export function registerWriteTools(server: McpServer, ctx: ServerContext): void {
  /**
   * Write tools slice this file's literal slide blocks, but the read tools expand
   * `src:` imports — when an importer block fans out into several slides the two
   * numberings diverge, and an agent that reads slide N then writes slide N would
   * silently edit the wrong slide. Refuse loudly instead.
   */
  function assertNumbersAlign(deckId: string, file: string, source: string): void {
    const literal = slideCount(source);
    const expanded = parse(source, {
      filepath: file,
      root: ctx.root,
      fs: { readFileSync: (p) => readFileSync(p, "utf8") },
    }).slides.length;
    if (literal !== expanded) {
      throw new Error(
        `Deck "${deckId}" uses src: imports — its ${literal} source block(s) expand to ` +
          `${expanded} slides, so slide numbers from the read tools do not map onto this ` +
          `file's blocks. Writes are disabled for this deck to prevent editing the wrong ` +
          `slide; edit the imported source file directly instead.`,
      );
    }
  }

  /** Read → transform source → write back, then return a fresh summary. */
  async function mutate(deckId: string, transform: (src: string) => string) {
    return enqueue(async () => {
      const file = resolveDeckFile(ctx.root, deckId);
      const before = await readFile(file, "utf8");
      assertNumbersAlign(deckId, file, before);
      const after = transform(before);
      await writeFile(file, after, "utf8");
      const deck = parse(after, { filepath: file });
      return { name: deckNameFromFile(ctx.root, file), deck };
    });
  }

  server.registerTool(
    "add_slide",
    {
      title: "Add slide",
      description:
        "Insert a new slide. Appends by default; `at` inserts before that 1-based position.",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        content: z.string().describe("Slide body as Markdown/MDX."),
        frontmatter: frontmatterArg.optional(),
        at: z.number().int().positive().optional().describe("1-based position to insert before."),
      },
      annotations: WRITE,
    },
    ({ deck, content, frontmatter, at }) =>
      guard(async () => {
        let newNo = 0;
        const { name, deck: parsed } = await mutate(deck, (src) => {
          const r = addSlide(src, {
            content,
            ...(frontmatter ? { frontmatter } : {}),
            ...(at != null ? { at } : {}),
          });
          newNo = r.no;
          return r.source;
        });
        const slide = parsed.slides.find((s) => s.no === newNo);
        return ok({ deck: name, slide: slide ? summarizeSlide(slide) : { no: newNo } });
      }),
  );

  server.registerTool(
    "update_slide",
    {
      title: "Update slide",
      description: "Replace a slide's body and/or merge its frontmatter (1-based).",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        no: z.number().int().positive().describe("1-based slide number."),
        content: z.string().optional().describe("New Markdown/MDX body."),
        frontmatter: frontmatterArg.optional(),
      },
      annotations: WRITE,
    },
    ({ deck, no, content, frontmatter }) =>
      guard(async () => {
        const { name, deck: parsed } = await mutate(deck, (src) =>
          updateSlide(src, no, {
            ...(content != null ? { content } : {}),
            ...(frontmatter ? { frontmatter } : {}),
          }),
        );
        const slide = parsed.slides.find((s) => s.no === no);
        return ok({ deck: name, slide: slide ? summarizeSlide(slide) : { no } });
      }),
  );

  server.registerTool(
    "delete_slide",
    {
      title: "Delete slide",
      description: "Delete a slide by its 1-based number.",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        no: z.number().int().positive().describe("1-based slide number."),
      },
      annotations: { ...WRITE, destructiveHint: true },
    },
    ({ deck, no }) =>
      guard(async () => {
        const { name, deck: parsed } = await mutate(deck, (src) => deleteSlide(src, no));
        return ok({ ok: true, deck: name, slideCount: parsed.slides.length });
      }),
  );

  server.registerTool(
    "set_frontmatter",
    {
      title: "Set frontmatter",
      description:
        "Merge frontmatter into a slide (with `no`) or the deck headmatter (without `no`).",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        no: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("1-based slide; omit for deck headmatter."),
        frontmatter: frontmatterArg,
      },
      annotations: WRITE,
    },
    ({ deck, no, frontmatter }) =>
      guard(async () => {
        const { name, deck: parsed } = await mutate(deck, (src) =>
          setFrontmatter(src, frontmatter, no),
        );
        return ok({ deck: name, ...summarizeDeck(parsed) });
      }),
  );

  server.registerTool(
    "set_theme",
    {
      title: "Set theme",
      description: "Set the deck's theme (headmatter `theme` field).",
      inputSchema: {
        deck: z.string().describe("Deck id."),
        theme: z.string().describe("Theme name (from list_themes)."),
      },
      annotations: WRITE,
    },
    ({ deck, theme }) =>
      guard(async () => {
        const { name, deck: parsed } = await mutate(deck, (src) => setFrontmatter(src, { theme }));
        return ok({ deck: name, ...summarizeDeck(parsed) });
      }),
  );
}
