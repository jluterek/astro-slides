import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { guard, ok, type ServerContext } from "../context.js";
import { loadDeck, resolveDeckFile } from "../deck-loader.js";

const run = promisify(execFile);

// Exports drive headless Chromium — slow, but never unbounded: a wedged browser must
// not hang the tool call forever. stdout is progress chatter; give it headroom.
const EXPORT_TIMEOUT_MS = 5 * 60_000;
const EXPORT_MAX_BUFFER = 16 * 1024 * 1024;

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

/** Resolve a tool-supplied output path, CONTAINED to the project root. Tool arguments
 * are model-controlled input on a network-reachable surface — an absolute or
 * `../`-escaping path must never become an arbitrary filesystem write. */
function resolveOut(root: string, output: string): string {
  const abs = resolve(root, output);
  const base = resolve(root);
  if (abs !== base && !abs.startsWith(base + sep))
    throw new Error(`Output path "${output}" escapes the project root.`);
  return abs;
}

export function registerMediaTools(server: McpServer, ctx: ServerContext): void {
  /** Spawn the CLI (reusing the tested Phase 12/13 pipeline) and return its stdout. */
  async function runExport(opts: ExportArgOptions): Promise<string> {
    const args = buildExportArgs(opts);
    const execOpts = { cwd: ctx.root, timeout: EXPORT_TIMEOUT_MS, maxBuffer: EXPORT_MAX_BUFFER };
    const { stdout } = ctx.cliBin
      ? await run(process.execPath, [ctx.cliBin, ...args], execOpts)
      : await run("astro-slides", args, execOpts);
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
        // Contain BEFORE spawning — the CLI writes wherever --output points.
        const out = resolveOut(ctx.root, output ?? `${deck}.pdf`);
        await runExport({
          root: ctx.root,
          format: "pdf",
          output: out,
          ...(withClicks ? { withClicks } : {}),
          ...(perSlide ? { perSlide } : {}),
          ...(range ? { range } : {}),
        });
        return ok({ path: out });
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
        const out = resolveOut(ctx.root, output ?? `${deck}.pptx`);
        await runExport({
          root: ctx.root,
          format: "pptx",
          output: out,
          ...(rasterize ? { rasterize } : {}),
        });
        return ok({ path: out });
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
        const abs = resolveOut(ctx.root, output ?? `${deck}-png`);
        await runExport({
          root: ctx.root,
          format: "png",
          output: abs,
          ...(withClicks ? { withClicks } : {}),
          ...(range ? { range } : {}),
        });
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
        const abs = resolveOut(ctx.root, output ?? `${deck}-shots`);
        await runExport({
          root: ctx.root,
          format: "png",
          output: abs,
          range: String(no),
          ...(step != null && step > 0 ? { withClicks: true } : {}),
        });
        const files = (await readdir(abs).catch(() => []))
          .filter((f) => f.endsWith(".png"))
          .sort()
          .map((f) => join(abs, f));
        // Select the requested slide (and step) from the CLI's `<deck>-<paddedNo>[.step].png`
        // naming — files[0] of an unfiltered listing could be a stale/other-slide shot.
        const want = new RegExp(`-0*${no}${step && step > 0 ? `\\.${step}` : ""}\\.png$`);
        const match = files.find((f) => want.test(f)) ?? null;
        return ok({ path: match, paths: files });
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
