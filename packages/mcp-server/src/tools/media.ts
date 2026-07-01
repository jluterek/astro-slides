import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { guard, ok, type ServerContext } from "../context.js";
import { loadDeck, resolveDeckFile } from "../deck-loader.js";

const run = promisify(execFile);

export interface ExportArgOptions {
  root: string;
  format: "pdf" | "png" | "pptx";
  output?: string;
  range?: string;
  withClicks?: boolean;
  perSlide?: boolean;
  rasterize?: boolean;
}

/** Build the `astro-slides export` CLI arguments (pure, unit-tested). */
export function buildExportArgs(opts: ExportArgOptions): string[] {
  const args = ["export", opts.root, "--format", opts.format];
  if (opts.output) args.push("--output", opts.output);
  if (opts.range) args.push("--range", opts.range);
  if (opts.withClicks) args.push("--with-clicks");
  if (opts.perSlide) args.push("--per-slide");
  if (opts.rasterize) args.push("--rasterize");
  return args;
}

function resolveOut(root: string, output: string): string {
  return isAbsolute(output) ? output : join(root, output);
}

export function registerMediaTools(server: McpServer, ctx: ServerContext): void {
  /** Spawn the CLI (reusing the tested Phase 12/13 pipeline) and return its stdout. */
  async function runExport(opts: ExportArgOptions): Promise<string> {
    const args = buildExportArgs(opts);
    const { stdout } = ctx.cliBin
      ? await run(process.execPath, [ctx.cliBin, ...args], { cwd: ctx.root })
      : await run("astro-slides", args, { cwd: ctx.root });
    return stdout;
  }

  const deckArg = z.string().describe("Deck id.");

  server.registerTool(
    "export_pdf",
    {
      title: "Export PDF",
      description: "Export a deck to PDF (spawns the CLI export pipeline).",
      inputSchema: {
        deck: deckArg,
        output: z.string().optional().describe("Output file path (relative to project root)."),
        withClicks: z.boolean().optional(),
        perSlide: z.boolean().optional().describe("One PDF per slide."),
        range: z.string().optional().describe('Slide subset, e.g. "1,3-5".'),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, output, withClicks, perSlide, range }) =>
      guard(async () => {
        resolveDeckFile(ctx.root, deck); // validate deck exists
        const out = output ?? `${deck}.pdf`;
        await runExport({
          root: ctx.root,
          format: "pdf",
          output: out,
          ...(withClicks ? { withClicks } : {}),
          ...(perSlide ? { perSlide } : {}),
          ...(range ? { range } : {}),
        });
        return ok({ path: resolveOut(ctx.root, out) });
      }),
  );

  server.registerTool(
    "export_pptx",
    {
      title: "Export PPTX",
      description: "Export a deck to an editable PowerPoint file (spawns the CLI export pipeline).",
      inputSchema: {
        deck: deckArg,
        output: z.string().optional(),
        rasterize: z.boolean().optional().describe("Rasterize every slide to an image."),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, output, rasterize }) =>
      guard(async () => {
        resolveDeckFile(ctx.root, deck);
        const out = output ?? `${deck}.pptx`;
        await runExport({
          root: ctx.root,
          format: "pptx",
          output: out,
          ...(rasterize ? { rasterize } : {}),
        });
        return ok({ path: resolveOut(ctx.root, out) });
      }),
  );

  server.registerTool(
    "export_png",
    {
      title: "Export PNG",
      description: "Export a deck's slides to PNG images in a directory (spawns the CLI pipeline).",
      inputSchema: {
        deck: deckArg,
        output: z.string().optional().describe("Output directory (relative to project root)."),
        withClicks: z.boolean().optional(),
        range: z.string().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, output, withClicks, range }) =>
      guard(async () => {
        resolveDeckFile(ctx.root, deck);
        const dir = output ?? `${deck}-png`;
        await runExport({
          root: ctx.root,
          format: "png",
          output: dir,
          ...(withClicks ? { withClicks } : {}),
          ...(range ? { range } : {}),
        });
        const abs = resolveOut(ctx.root, dir);
        const files = (await readdir(abs).catch(() => []))
          .filter((f) => f.endsWith(".png"))
          .sort()
          .map((f) => join(abs, f));
        return ok({ paths: files });
      }),
  );

  server.registerTool(
    "screenshot_slide",
    {
      title: "Screenshot slide",
      description: "Render one slide to a PNG (a single-slide PNG export).",
      inputSchema: {
        deck: deckArg,
        no: z.number().int().positive().describe("1-based slide number."),
        step: z.number().int().nonnegative().optional().describe("Reveal up to this click step."),
        output: z.string().optional().describe("Output directory."),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, no, step, output }) =>
      guard(async () => {
        resolveDeckFile(ctx.root, deck);
        const dir = output ?? `${deck}-shots`;
        await runExport({
          root: ctx.root,
          format: "png",
          output: dir,
          range: String(no),
          ...(step != null ? { withClicks: true } : {}),
        });
        const abs = resolveOut(ctx.root, dir);
        const files = (await readdir(abs).catch(() => []))
          .filter((f) => f.endsWith(".png"))
          .sort()
          .map((f) => join(abs, f));
        return ok({ path: files[0] ?? null, paths: files });
      }),
  );

  server.registerTool(
    "export_md",
    {
      title: "Export Markdown",
      description: "Export the deck's Markdown/MDX source to a file.",
      inputSchema: { deck: deckArg, output: z.string().optional() },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    ({ deck, output }) =>
      guard(async () => {
        const file = resolveDeckFile(ctx.root, deck);
        // Confirm it parses, then emit the (import-expanded) source is out of scope — we
        // write the literal deck source, which is already Markdown/MDX.
        loadDeck(ctx.root, file);
        const out = resolveOut(ctx.root, output ?? `${deck}.md`);
        await writeFile(out, await readFile(file, "utf8"), "utf8");
        return ok({ path: out });
      }),
  );
}
