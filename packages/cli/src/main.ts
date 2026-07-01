import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, relative, sep } from "node:path";
import { emitKeypressEvents, type Key } from "node:readline";
import type { Browser } from "@playwright/test";
import { defineCommand } from "citty";
import JSZip from "jszip";
import { Listr } from "listr2";
import { PDFDocument } from "pdf-lib";
import pc from "picocolors";
import { renderUnicodeCompact } from "uqr";

/**
 * The `astro-slides` CLI. Self-contained (no relative imports) so the `bin` can run it
 * directly under Node's native TypeScript support. `dev`/`build`/`export` drive Astro +
 * Playwright through their programmatic APIs; `mcp-server` lands in Phase 14.
 */

/** In-TTY shortcuts shown while the dev server runs. */
export const SHORTCUTS: Record<string, string> = {
  r: "restart the dev server",
  o: "open the deck in your browser",
  e: "open the deck source in your editor",
  c: "clear the console",
  m: "toggle the MCP server",
  q: "quit",
  "?": "show this shortcut list",
};

export function shortcutHelp(): string {
  const lines = Object.entries(SHORTCUTS).map(
    ([key, desc]) => `  ${pc.bold(pc.cyan(key))}  ${pc.dim(desc)}`,
  );
  return `${pc.bold("Shortcuts")}\n${lines.join("\n")}`;
}

export type ShortcutAction = "restart" | "open" | "edit" | "clear" | "mcp" | "quit" | "help" | null;

/** Map a keypress to a shortcut action. Ctrl-C always quits. Pure — unit-tested. */
export function keyToAction(
  str: string | undefined,
  key: Pick<Key, "ctrl" | "name">,
): ShortcutAction {
  if (key.ctrl && key.name === "c") return "quit";
  switch (str) {
    case "r":
      return "restart";
    case "o":
      return "open";
    case "e":
      return "edit";
    case "c":
      return "clear";
    case "m":
      return "mcp";
    case "q":
      return "quit";
    case "?":
      return "help";
    default:
      return null;
  }
}

/** Attach the TTY keypress handler. Returns a detach function. No-op when not a TTY. */
export function attachShortcuts(
  handlers: Partial<Record<ShortcutAction & string, () => void>>,
): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY) return () => {};
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  const onKey = (str: string | undefined, key: Key): void => {
    const action = keyToAction(str, key);
    if (action === "help") {
      console.log(shortcutHelp());
      return;
    }
    if (action && handlers[action]) handlers[action]?.();
  };
  stdin.on("keypress", onKey);
  return () => {
    stdin.off("keypress", onKey);
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
  };
}

// --- Mobile remote (Phase 11) ---------------------------------------------
// Helpers for `dev --remote`. Kept in this self-contained file (no relative imports)
// so the `bin` can run it directly under Node's type stripping. Pure parts are
// unit-tested via the package's `index` re-export.

/** Derive a short, URL-safe token from a password (stable, non-secret). */
export function deriveToken(password: string): string {
  return createHash("sha256").update(password).digest("hex").slice(0, 12);
}

/** First non-internal IPv4 address, or null when only loopback is available. */
export function lanAddress(ifaces = networkInterfaces()): string | null {
  for (const list of Object.values(ifaces)) {
    for (const net of list ?? []) {
      // Node 18+ reports `family` as the string "IPv4".
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

export interface RemoteUrlOptions {
  host: string;
  port: number;
  token?: string | undefined;
}

/** Build the `/entry` URL a phone opens. */
export function buildRemoteUrl({ host, port, token }: RemoteUrlOptions): string {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `http://${host}:${port}/entry${query}`;
}

/** Print the QR code + URL + a one-line security note to the terminal. */
export function printRemote(url: string, hasPassword: boolean): void {
  const lines = [
    "",
    pc.bold(pc.cyan("Mobile remote")),
    renderUnicodeCompact(url),
    `  ${pc.bold(url)}`,
    pc.dim(
      hasPassword
        ? "  Password protected — the URL includes the access token."
        : "  Open on your LAN — anyone with this URL can drive the deck.",
    ),
    "",
  ];
  console.log(lines.join("\n"));
}

// Minimal shape of Astro's programmatic API we rely on (avoids a hard type dep).
interface AstroDevServer {
  stop(): Promise<void>;
  address?: { port: number; address: string };
}
interface AstroModule {
  dev(config: {
    root: string;
    server?: { host?: boolean | string; port?: number };
  }): Promise<AstroDevServer>;
  build(config: { root: string }): Promise<unknown>;
}

const DEFAULT_PORT = 4321;

const devCommand = defineCommand({
  meta: { name: "dev", description: "Start the dev server and watch the deck." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
    remote: {
      type: "string",
      description: "Serve a phone remote on the LAN (optionally --remote=<password>).",
    },
  },
  async run({ args }) {
    const astro = (await import("astro")) as unknown as AstroModule;
    const root = args.root ?? process.cwd();

    // --remote (Phase 11): bind 0.0.0.0 and stand up the sync gateway. `--remote` alone
    // is open on the LAN; `--remote=<password>` derives an access token. The integration
    // reads these env vars from its dev-server hook.
    const remote = args.remote !== undefined;
    const password = typeof args.remote === "string" && args.remote.length > 0 ? args.remote : "";
    const token = password ? deriveToken(password) : "";
    if (remote) {
      process.env.ASTRO_SLIDES_REMOTE = "1";
      if (token) process.env.ASTRO_SLIDES_REMOTE_TOKEN = token;
    }

    const server = await astro.dev({ root, ...(remote ? { server: { host: true } } : {}) });
    console.log(shortcutHelp());

    if (remote) {
      const host = lanAddress() ?? "localhost";
      const port = server.address?.port ?? DEFAULT_PORT;
      printRemote(buildRemoteUrl({ host, port, token: token || undefined }), !!password);
    }

    const quit = async (): Promise<void> => {
      await server.stop();
      process.exit(0);
    };
    attachShortcuts({
      quit: () => void quit(),
      clear: () => console.clear(),
    });
  },
});

const buildCommand = defineCommand({
  meta: { name: "build", description: "Build the deck to static output." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
  },
  async run({ args }) {
    const astro = (await import("astro")) as unknown as AstroModule;
    await astro.build({ root: args.root ?? process.cwd() });
  },
});

const notImplemented = (name: string, phase: string) =>
  defineCommand({
    meta: { name, description: `(${phase}) not implemented yet.` },
    run() {
      console.error(pc.yellow(`\`astro-slides ${name}\` arrives in ${phase}.`));
      process.exit(1);
    },
  });

// --- Export (Phase 12) -----------------------------------------------------
// Web-format export: PDF (Playwright + pdf-lib), PNG (per slide / per click), and an
// offline HTML bundle. Kept inline (no relative imports) so the `bin` runs it under
// Node's type stripping; the pure helpers below are re-exported for unit tests. The
// pipeline builds the deck, previews it, and drives headless Chromium against the
// prerendered `/print/<deck>` page.

export type ExportFormat = "pdf" | "png" | "html";

/** Parse Slidev-style `--range` (`"1,3-5,8"`) into sorted, deduped, in-bounds slide nos. */
export function parseRange(spec: string | undefined, total: number): number[] {
  const all = (): number[] => Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  if (!spec?.trim()) return all();
  const picked = new Set<number>();
  for (const part of spec.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const dash = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dash) {
      const from = Number(dash[1]);
      const to = Number(dash[2]);
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      for (let n = lo; n <= hi; n++) if (n >= 1 && n <= total) picked.add(n);
      continue;
    }
    const single = Number(token);
    if (Number.isInteger(single) && single >= 1 && single <= total) picked.add(single);
  }
  return [...picked].sort((a, b) => a - b);
}

/** URL of the whole-deck print page (all slides stacked, all clicks revealed). */
export function printUrl(baseUrl: string, deck: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/print/${encodeURIComponent(deck)}`;
}

/** URL of one slide on the deck route in embed mode (no chrome), optionally at a step. */
export function slideUrl(baseUrl: string, deck: string, no: number, step?: number): string {
  const q = new URLSearchParams({ embed: "1" });
  if (step && step > 0) q.set("step", String(step));
  return `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(deck)}/${no}?${q.toString()}`;
}

/** Zero-pad a slide number so files sort lexically (`slide-03.png`). */
export function padNo(no: number, total: number): string {
  return String(no).padStart(String(Math.max(total, 1)).length, "0");
}

/** File name for a per-slide artifact, e.g. `talk-03.png` or `talk-03.2.png` (click 2). */
export function slideFileName(
  deck: string,
  no: number,
  total: number,
  ext: string,
  step?: number,
): string {
  const stepSuffix = step && step > 0 ? `.${step}` : "";
  return `${deck}-${padNo(no, total)}${stepSuffix}.${ext}`;
}

/** Recursively list files under `dir` as POSIX-relative paths (sorted, stable). */
export function listFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...listFiles(abs, base));
    else out.push(relative(base, abs).split(sep).join("/"));
  }
  return out.sort();
}

/** Zip every file under `dir` into a single archive (offline HTML bundle). */
export async function zipDirectory(dir: string): Promise<Buffer> {
  const zip = new JSZip();
  for (const rel of listFiles(dir)) zip.file(rel, readFileSync(join(dir, rel)));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Discover built decks + slide counts + titles by scanning the dist output. */
export function discoverDecks(dist: string): { deck: string; total: number; titles: string[] }[] {
  const printDir = join(dist, "print");
  if (!existsSync(printDir)) return [];
  return readdirSync(printDir)
    .filter((deck) => statSync(join(printDir, deck)).isDirectory())
    .map((deck) => {
      const deckDir = join(dist, deck);
      const nums = existsSync(deckDir)
        ? readdirSync(deckDir)
            .filter((n) => /^\d+$/.test(n) && statSync(join(deckDir, n)).isDirectory())
            .map(Number)
            .sort((a, b) => a - b)
        : [];
      const total = nums.length ? Math.max(...nums) : 0;
      const titles = nums.map((n) => readSlideTitle(join(deckDir, String(n), "index.html"), n));
      return { deck, total, titles };
    });
}

/** Best-effort slide title from a built page (`data-title`), else "Slide N". */
function readSlideTitle(file: string, no: number): string {
  if (!existsSync(file)) return `Slide ${no}`;
  const html = readFileSync(file, "utf8");
  const m = html.match(new RegExp(`data-slide-no="${no}"[^>]*data-title="([^"]*)"`));
  return m?.[1]?.trim() || `Slide ${no}`;
}

interface AstroPreviewServer {
  host: string;
  port: number;
  stop(): Promise<void>;
}

/** Lazily launch headless Chromium; a helpful error if Playwright isn't installed. */
async function launchChromium(executablePath?: string): Promise<Browser> {
  let chromium: typeof import("@playwright/test").chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    throw new Error(
      "Export needs Playwright. Install `@playwright/test` and run `playwright install chromium`.",
    );
  }
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

/** Wait for fonts + any author-declared `data-waitfor` selectors before snapshotting. */
async function waitForRenderReady(
  page: import("@playwright/test").Page,
  timeout = 15_000,
): Promise<void> {
  const selectors: string[] = await page
    .$$eval("[data-waitfor]", (els) =>
      els.map((el) => el.getAttribute("data-waitfor")).filter((s): s is string => !!s),
    )
    .catch(() => [] as string[]);
  for (const selector of selectors)
    await page.waitForSelector(selector, { timeout }).catch(() => {});
  await page.evaluate("document.fonts && document.fonts.ready").catch(() => {});
}

export interface PdfExportOptions {
  baseUrl: string;
  deck: string;
  slides: number[];
  total: number;
  perSlide: boolean;
  outFile?: string;
  outDir?: string;
  scale?: number;
  printBackground?: boolean;
  toc?: boolean;
  titles?: Record<number, string>;
}

/** Export a deck to PDF via the print page + pdf-lib. Returns written file paths. */
export async function exportDeckPdf(
  browser: Browser,
  options: PdfExportOptions,
): Promise<string[]> {
  const context = await browser.newContext();
  let raw: Uint8Array;
  try {
    const page = await context.newPage();
    await page.goto(printUrl(options.baseUrl, options.deck), { waitUntil: "networkidle" });
    await waitForRenderReady(page);
    raw = await page.pdf({
      printBackground: options.printBackground ?? true,
      preferCSSPageSize: true,
      ...(options.scale != null ? { scale: options.scale } : {}),
    });
  } finally {
    await context.close();
  }

  const src = await PDFDocument.load(raw);
  const pageCount = src.getPageCount();
  const indices = options.slides.map((no) => no - 1).filter((i) => i >= 0 && i < pageCount);
  const select = async (idx: number[]): Promise<PDFDocument> => {
    const out = await PDFDocument.create();
    for (const p of await out.copyPages(src, idx)) out.addPage(p);
    return out;
  };

  if (options.perSlide) {
    const dir = options.outDir ?? ".";
    await mkdir(dir, { recursive: true });
    const written: string[] = [];
    for (const [i, no] of options.slides.entries()) {
      const pageIndex = indices[i];
      if (pageIndex == null) continue;
      const one = await select([pageIndex]);
      const file = join(dir, slideFileName(options.deck, no, options.total, "pdf"));
      await writeFile(file, await one.save());
      written.push(file);
    }
    return written;
  }

  let bytes = await (await select(indices)).save();
  if (options.toc && options.titles)
    bytes = await addOutline(bytes, options.slides, options.titles);
  const file = options.outFile ?? join(options.outDir ?? ".", `${options.deck}.pdf`);
  await mkdir(join(file, ".."), { recursive: true }).catch(() => {});
  await writeFile(file, bytes);
  return [file];
}

/** Add a PDF outline (bookmarks) from slide titles via @lillallol/outline-pdf. */
async function addOutline(
  bytes: Uint8Array,
  slides: number[],
  titles: Record<number, string>,
): Promise<Uint8Array> {
  const [{ outlinePdfFactory }, pdfLib] = await Promise.all([
    import("@lillallol/outline-pdf"),
    import("pdf-lib"),
  ]);
  const spec = slides
    .map((no, i) => `${i + 1}||${(titles[no] ?? `Slide ${no}`).replace(/\n/g, " ")}`)
    .join("\n");
  const doc = await outlinePdfFactory(pdfLib)({ pdf: bytes, outline: spec });
  return doc.save();
}

export interface PngExportOptions {
  baseUrl: string;
  deck: string;
  slides: number[];
  total: number;
  outDir: string;
  withClicks?: boolean;
  scale?: number;
  omitBackground?: boolean;
}

/** Export a deck to PNG — one image per slide, or per click step with `withClicks`. */
export async function exportDeckPng(
  browser: Browser,
  options: PngExportOptions,
): Promise<string[]> {
  await mkdir(options.outDir, { recursive: true });
  const context = await browser.newContext({ deviceScaleFactor: options.scale ?? 2 });
  const written: string[] = [];
  const shoot = async (
    page: import("@playwright/test").Page,
    no: number,
    step: number,
  ): Promise<void> => {
    await page.goto(slideUrl(options.baseUrl, options.deck, no, step), {
      waitUntil: "networkidle",
    });
    await waitForRenderReady(page);
    const path = join(
      options.outDir,
      slideFileName(options.deck, no, options.total, "png", options.withClicks ? step : 0),
    );
    await page
      .locator(".as-viewport")
      .first()
      .screenshot({ path, omitBackground: options.omitBackground ?? false });
    written.push(path);
  };
  try {
    const page = await context.newPage();
    for (const no of options.slides) {
      await shoot(page, no, 0);
      if (!options.withClicks) continue;
      const steps = await page
        .locator(`.as-slide[data-slide-no="${no}"]`)
        .first()
        .getAttribute("data-steps")
        .then((v) => Number(v) || 0)
        .catch(() => 0);
      for (let step = 1; step <= steps; step++) await shoot(page, no, step);
    }
    return written;
  } finally {
    await context.close();
  }
}

interface AstroExportModule extends AstroModule {
  preview(config: { root: string }): Promise<AstroPreviewServer>;
}

const exportCommand = defineCommand({
  meta: { name: "export", description: "Export the deck to PDF, PNG, or an offline HTML bundle." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
    format: { type: "string", description: "pdf | png | html", default: "pdf" },
    output: { type: "string", description: "Output file or directory." },
    range: { type: "string", description: 'Slides to include, e.g. "1,3-5".' },
    "per-slide": { type: "boolean", description: "One file per slide (pdf).", default: false },
    "with-clicks": {
      type: "boolean",
      description: "One image per click step (png).",
      default: false,
    },
    "with-toc": {
      type: "boolean",
      description: "Add a PDF outline from slide titles.",
      default: false,
    },
    dark: { type: "boolean", description: "Force the dark color scheme.", default: false },
    scale: { type: "string", description: "Render scale (png DPR / pdf scale)." },
    "omit-background": {
      type: "boolean",
      description: "Transparent PNG background.",
      default: false,
    },
    "executable-path": { type: "string", description: "Path to a Chromium binary." },
  },
  async run({ args }) {
    const root = args.root ?? process.cwd();
    const format = String(args.format) as ExportFormat;
    if (!["pdf", "png", "html"].includes(format)) {
      console.error(pc.red(`Unknown --format "${format}" (expected pdf | png | html).`));
      process.exit(1);
    }
    const astro = (await import("astro")) as unknown as AstroExportModule;
    const scale = args.scale ? Number(args.scale) : undefined;

    const ctx: {
      dist: string;
      baseUrl: string;
      preview?: AstroPreviewServer;
      browser?: Browser;
      written: string[];
    } = {
      dist: join(root, "dist"),
      baseUrl: "",
      written: [],
    };

    const tasks = new Listr(
      [
        {
          title: "Build deck",
          task: async () => {
            if (args.dark) process.env.ASTRO_SLIDES_COLOR_SCHEME = "dark";
            await astro.build({ root });
          },
        },
        {
          title: "Start preview server",
          task: async () => {
            ctx.preview = await astro.preview({ root });
            const host = ctx.preview.host === "::" ? "localhost" : ctx.preview.host;
            ctx.baseUrl = `http://${host}:${ctx.preview.port}`;
          },
        },
        {
          title: format === "html" ? "Package HTML bundle" : `Render ${format.toUpperCase()}`,
          task: async (_c, task) => {
            if (format === "html") {
              const out = args.output ?? join(root, "dist.zip");
              await writeFile(out, await zipDirectory(ctx.dist));
              ctx.written.push(out);
              return;
            }
            ctx.browser = await launchChromium(args["executable-path"] || undefined);
            const decks = discoverDecks(ctx.dist);
            if (!decks.length) throw new Error("No built decks found under dist/.");
            for (const { deck, total, titles } of decks) {
              const slides = parseRange(args.range || undefined, total);
              task.output = `${deck}: ${slides.length} slide(s)`;
              if (format === "pdf") {
                const titleMap = Object.fromEntries(titles.map((t, i) => [i + 1, t]));
                ctx.written.push(
                  ...(await exportDeckPdf(ctx.browser, {
                    baseUrl: ctx.baseUrl,
                    deck,
                    slides,
                    total,
                    perSlide: !!args["per-slide"],
                    outDir: args.output && args["per-slide"] ? args.output : join(root, "dist"),
                    outFile:
                      args.output && !args["per-slide"] ? args.output : join(root, `${deck}.pdf`),
                    ...(scale != null ? { scale } : {}),
                    toc: !!args["with-toc"],
                    titles: titleMap,
                  })),
                );
              } else {
                ctx.written.push(
                  ...(await exportDeckPng(ctx.browser, {
                    baseUrl: ctx.baseUrl,
                    deck,
                    slides,
                    total,
                    outDir: args.output ?? join(root, `${deck}-png`),
                    withClicks: !!args["with-clicks"],
                    ...(scale != null ? { scale } : {}),
                    omitBackground: !!args["omit-background"],
                  })),
                );
              }
            }
          },
        },
      ],
      { rendererOptions: { collapseSubtasks: false } },
    );

    try {
      await tasks.run();
      console.log(pc.green(`\nExported ${ctx.written.length} file(s):`));
      for (const f of ctx.written) console.log(`  ${f}`);
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    } finally {
      await ctx.browser?.close();
      await ctx.preview?.stop();
    }
  },
});

export const main = defineCommand({
  meta: {
    name: "astro-slides",
    version: "0.0.0",
    description: "Author, present, and export web-native slide decks.",
  },
  subCommands: {
    dev: devCommand,
    build: buildCommand,
    export: exportCommand,
    "mcp-server": notImplemented("mcp-server", "Phase 14"),
  },
});
