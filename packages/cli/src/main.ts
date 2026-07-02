import { type ChildProcess, spawn } from "node:child_process";
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

/** Locate a deck source file to open in `$EDITOR` — root `slides.{mdx,md}`, else the first
 * `content/decks/<name>/slides.{mdx,md}`, else the project root. Pure — unit-tested. */
export function findDeckSource(root: string): string {
  for (const name of ["slides.mdx", "slides.md"]) {
    const p = join(root, name);
    if (existsSync(p)) return p;
  }
  const decksDir = join(root, "content", "decks");
  if (existsSync(decksDir)) {
    for (const entry of readdirSync(decksDir).sort()) {
      for (const name of ["slides.mdx", "slides.md"]) {
        const p = join(decksDir, entry, name);
        if (existsSync(p)) return p;
      }
    }
  }
  return root;
}

/** Command to open a URL/path in the OS default handler. Pure — unit-tested. */
export function openCommand(
  platform: NodeJS.Platform,
  target: string,
): { cmd: string; args: string[] } {
  if (platform === "darwin") return { cmd: "open", args: [target] };
  if (platform === "win32") return { cmd: "cmd", args: ["/c", "start", "", target] };
  return { cmd: "xdg-open", args: [target] };
}

/** Resolve the `$VISUAL`/`$EDITOR` command for a file, or null when neither is set. The editor
 * string may carry flags (e.g. `"code -w"`), so it is split on whitespace. Pure — unit-tested. */
export function editorCommand(
  env: NodeJS.ProcessEnv,
  file: string,
): { cmd: string; args: string[] } | null {
  const editor = env.VISUAL || env.EDITOR;
  if (!editor) return null;
  const parts = editor.split(/\s+/).filter(Boolean);
  const cmd = parts[0];
  if (!cmd) return null;
  return { cmd, args: [...parts.slice(1), file] };
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

    const devOptions = remote ? { server: { host: true } } : {};
    let server = await astro.dev({ root, ...devOptions });
    console.log(shortcutHelp());

    if (remote) {
      const host = lanAddress() ?? "localhost";
      const port = server.address?.port ?? DEFAULT_PORT;
      printRemote(buildRemoteUrl({ host, port, token: token || undefined }), !!password);
    }

    // Wire the in-TTY shortcuts (SHORTCUTS map) to real actions. `open`/`edit` shell out to the
    // OS default handler / `$EDITOR`; `restart` recycles Astro's dev server; `m` toggles a child
    // MCP server (HTTP) pointed at this dev deck so an agent can connect while you present.
    const deckSource = findDeckSource(root);
    let mcpChild: ChildProcess | null = null;
    const bin = process.argv[1];

    const openBrowser = (): void => {
      const port = server.address?.port ?? DEFAULT_PORT;
      const { cmd, args } = openCommand(process.platform, `http://localhost:${port}/`);
      spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
    };
    const openEditor = (): void => {
      const ec = editorCommand(process.env, deckSource);
      if (!ec) {
        console.log(pc.dim("  Set $EDITOR (or $VISUAL) to use the edit shortcut."));
        return;
      }
      spawn(ec.cmd, ec.args, { stdio: "inherit" });
    };
    const restart = async (): Promise<void> => {
      console.log(pc.dim("  Restarting the dev server…"));
      await server.stop();
      try {
        server = await astro.dev({ root, ...devOptions });
      } catch (err) {
        // `r` is pressed exactly when the config may have just broken — report and
        // keep the session alive instead of dying on an unhandled rejection.
        console.error(pc.red(`  Restart failed: ${err instanceof Error ? err.message : err}`));
        console.log(pc.dim("  Fix the error and press r again."));
      }
    };
    const toggleMcp = (): void => {
      if (mcpChild) {
        mcpChild.kill();
        mcpChild = null;
        console.log(pc.dim("  MCP server stopped."));
        return;
      }
      if (!bin) {
        console.log(pc.dim("  Cannot resolve the CLI entry to start the MCP server."));
        return;
      }
      // Point the child at THIS project (`root`, not cwd) and, under --remote, at the
      // live sync gateway so its navigate tools can drive the presentation.
      const port = server.address?.port ?? DEFAULT_PORT;
      const mcpArgs = [bin, "mcp-server", root, "--transport", "http"];
      if (remote) {
        mcpArgs.push("--sync-gateway", `http://127.0.0.1:${port}`);
        if (token) mcpArgs.push("--sync-token", token);
      }
      mcpChild = spawn(process.execPath, mcpArgs, {
        stdio: ["ignore", "inherit", "inherit"],
      });
      console.log(pc.dim("  MCP server started (HTTP). Press m again to stop."));
    };
    const quit = async (): Promise<void> => {
      mcpChild?.kill();
      await server.stop();
      process.exit(0);
    };
    // Don't orphan the MCP child if the dev process dies by any path other than `q`
    // (SIGTERM, hangup, crash) — it would keep port 4444 bound for the next session.
    const reapChild = (): void => {
      mcpChild?.kill();
    };
    process.on("exit", reapChild);
    for (const sig of ["SIGTERM", "SIGHUP"] as const) {
      process.on(sig, () => {
        reapChild();
        process.exit(0);
      });
    }
    attachShortcuts({
      restart: () => void restart(),
      open: openBrowser,
      edit: openEditor,
      clear: () => console.clear(),
      mcp: toggleMcp,
      quit: () => void quit(),
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

// --- Export (Phase 12) -----------------------------------------------------
// Web-format export: PDF (Playwright + pdf-lib), PNG (per slide / per click), and an
// offline HTML bundle. Kept inline (no relative imports) so the `bin` runs it under
// Node's type stripping; the pure helpers below are re-exported for unit tests. The
// pipeline builds the deck, previews it, and drives headless Chromium against the
// prerendered `/print/<deck>` page.

export type ExportFormat = "pdf" | "png" | "pptx" | "html";

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
  } catch (err) {
    // Only rewrite a genuinely-missing module — a broken install's real error must
    // surface, not be masked by "install playwright" advice.
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
      throw new Error(
        "Export needs Playwright. Install `@playwright/test` and run `playwright install chromium`.",
      );
    }
    throw err;
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
    for (const no of options.slides) {
      // Derive the page index from the slide number directly — indexing the FILTERED
      // `indices` array by loop position misaligns every slide after a dropped one.
      const pageIndex = no - 1;
      if (pageIndex < 0 || pageIndex >= pageCount) continue;
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

// --- PPTX export (Phase 13, ADR-0007) --------------------------------------
// Editable OOXML via PptxGenJS. The exporter has no runtime access to the parser AST
// (workspace TS can't be imported from the type-stripped bin), so it extracts a
// structured model from the *rendered* slide DOM — headings/paragraphs/lists/tables/
// images become editable shapes, code blocks and `exportAs: image` slides rasterize.
// Positions come from bounding rects in design pixels, converted to inches (EMU under
// the hood). The pure model → PptxGenJS mapper is unit-tested with a fake slide.

const EMU_PER_INCH = 914400;

/** Design-pixel length → inches, given the slide dimension it maps onto. */
export function pxToIn(px: number, designPx: number, slideIn: number): number {
  if (designPx <= 0) return 0;
  return (px / designPx) * slideIn;
}

/** Inches → EMU (PowerPoint's internal unit). */
export function inToEmu(inches: number): number {
  return Math.round(inches * EMU_PER_INCH);
}

/** Normalize a CSS color (`rgb()`, `rgba()`, `#rgb`, `#rrggbb`) to `RRGGBB`, or "". */
export function parseCssColor(css: string | undefined | null): string {
  if (!css) return "";
  const s = css.trim().toLowerCase();
  // Only FULLY transparent is "no color" — a prefix test like `rgba(0, 0, 0, 0` would
  // also swallow semi-transparent black (`rgba(0, 0, 0, 0.5)`).
  const alpha = s.match(/^rgba?\([^)]*[,\s/]\s*(0?\.?\d+)\s*\)$/);
  if (s === "transparent" || (alpha?.[1] != null && Number.parseFloat(alpha[1]) === 0)) return "";
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex?.[1]) {
    const h = hex[1];
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
    return full.toUpperCase();
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
    return `${toHex(rgb[1] ?? "0")}${toHex(rgb[2] ?? "0")}${toHex(rgb[3] ?? "0")}`.toUpperCase();
  }
  return "";
}

export interface PptxRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  link?: string;
}
export interface PptxBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type PptxElement =
  | {
      kind: "text";
      box: PptxBox;
      runs: PptxRun[];
      fontSize: number;
      align: "left" | "center" | "right";
      color?: string;
    }
  | {
      kind: "list";
      box: PptxBox;
      items: { runs: PptxRun[]; level: number }[];
      fontSize: number;
      color?: string;
    }
  | { kind: "image"; box: PptxBox; data: string }
  | { kind: "table"; box: PptxBox; rows: string[][] };

export interface SlideModel {
  no: number;
  widthIn: number;
  heightIn: number;
  elements: PptxElement[];
  notes: string;
  background?: string;
}

/** Minimal slice of a PptxGenJS slide the mapper touches (so tests use a fake). */
export interface PptxSlideLike {
  background?: { color?: string };
  // biome-ignore lint/suspicious/noExplicitAny: PptxGenJS's TextProps/options are broad unions; a fake slide records them.
  addText(text: any, options?: any): unknown;
  // biome-ignore lint/suspicious/noExplicitAny: image options union.
  addImage(options: any): unknown;
  // biome-ignore lint/suspicious/noExplicitAny: table rows/options union.
  addTable(rows: any, options?: any): unknown;
  addNotes(notes: string): unknown;
}

/** Convert our runs to PptxGenJS text-run props. */
function toTextRuns(runs: PptxRun[]): unknown[] {
  return runs.map((r) => ({
    text: r.text,
    options: {
      ...(r.bold ? { bold: true } : {}),
      ...(r.italic ? { italic: true } : {}),
      ...(r.color ? { color: r.color } : {}),
      ...(r.link ? { hyperlink: { url: r.link } } : {}),
    },
  }));
}

/** Map one extracted slide model onto a PptxGenJS slide (pure over the slide API). */
export function buildPptxSlide(slide: PptxSlideLike, model: SlideModel): void {
  if (model.background) slide.background = { color: model.background };
  for (const el of model.elements) {
    const pos = { x: el.box.x, y: el.box.y, w: el.box.w, h: el.box.h };
    if (el.kind === "text") {
      slide.addText(toTextRuns(el.runs), {
        ...pos,
        fontSize: el.fontSize,
        align: el.align,
        valign: "top",
        ...(el.color ? { color: el.color } : {}),
      });
    } else if (el.kind === "list") {
      slide.addText(
        el.items.map((it) => ({
          text: it.runs.map((r) => r.text).join(""),
          options: { bullet: { indent: 15 }, indentLevel: it.level },
        })),
        { ...pos, fontSize: el.fontSize, valign: "top", ...(el.color ? { color: el.color } : {}) },
      );
    } else if (el.kind === "image") {
      slide.addImage({ data: el.data, ...pos });
    } else if (el.kind === "table") {
      slide.addTable(
        el.rows.map((row) => row.map((cell) => ({ text: cell }))),
        { ...pos, border: { type: "solid", pt: 1, color: "D0D0D0" }, autoPage: false },
      );
    }
  }
  if (model.notes.trim()) slide.addNotes(model.notes.trim());
}

/** Build a `.pptx` Buffer for a deck from its extracted slide models. */
/** Minimal slice of the PptxGenJS presentation API the exporter uses. */
interface PptxApp {
  defineLayout(layout: { name: string; width: number; height: number }): void;
  layout: string;
  addSlide(): PptxSlideLike;
  write(props: { outputType: string }): Promise<unknown>;
}

export async function buildDeckPptx(
  models: SlideModel[],
  layout: { widthIn: number; heightIn: number },
): Promise<Buffer> {
  const mod = await import("pptxgenjs");
  const Ctor = ((mod as { default?: unknown }).default ?? mod) as unknown as new () => PptxApp;
  const pptx = new Ctor();
  pptx.defineLayout({ name: "DECK", width: layout.widthIn, height: layout.heightIn });
  pptx.layout = "DECK";
  for (const model of models) buildPptxSlide(pptx.addSlide(), model);
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

/** Raw block shape returned by the in-browser DOM walker (px rects in design space). */
interface RawBlock {
  kind: "text" | "list" | "table" | "image" | "code";
  px: { x: number; y: number; w: number; h: number };
  runs?: PptxRun[];
  items?: { runs: PptxRun[]; level: number }[];
  rows?: string[][];
  data?: string;
  fontPx?: number;
  align?: "left" | "center" | "right";
  color?: string;
  /** For `code`: index among the PRESENT slide's `.as-code` elements — the deck route
   * stacks every slide in the DOM, so a page-wide index would hit other slides. */
  codeIdx?: number;
}
interface RawSlide {
  designW: number;
  designH: number;
  notes: string;
  background: string;
  blocks: RawBlock[];
}

/**
 * Walk the rendered slide DOM into a serializable model (runs in the browser). Captures
 * headings/paragraphs (text), lists, tables, and images (inlined as data URLs); code
 * blocks are marked for rasterization. Skips content nested inside a captured container.
 */
/* c8 ignore start — executes in the browser via page.evaluate, not under coverage. */
const DOM_WALKER = async (no: number): Promise<RawSlide> => {
  const deck = document.querySelector(".as-deck") as HTMLElement | null;
  const vp = document.querySelector(".as-viewport") as HTMLElement | null;
  const present = (document.querySelector(".as-slide.present") as HTMLElement | null) ?? vp;
  const notesMap = JSON.parse(
    document.querySelector(".as-notes-data")?.textContent || "{}",
  ) as Record<string, string>;
  const empty = {
    designW: 1920,
    designH: 1080,
    notes: notesMap[String(no)] ?? "",
    background: "",
    blocks: [] as RawBlock[],
  };
  if (!vp || !present) return empty;

  const designW = Number(deck?.dataset.designWidth) || vp.getBoundingClientRect().width || 1920;
  const designH = Number(deck?.dataset.designHeight) || 1080;
  const vpRect = vp.getBoundingClientRect();
  const scale = vpRect.width / designW || 1;
  const toPx = (r: DOMRect) => ({
    x: (r.left - vpRect.left) / scale,
    y: (r.top - vpRect.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  });
  // Normalize ANY computed CSS color (Chromium serializes oklch() colors as oklch —
  // the Cosmic theme would otherwise lose every color) via canvas fillStyle, which
  // round-trips to `#rrggbb` / `rgba(…)` in sRGB. Fully transparent → "" (no shape
  // color / no background — the default `rgba(0, 0, 0, 0)` must NOT become black).
  const colorCtx = document.createElement("canvas").getContext("2d");
  const hex = (css: string): string => {
    if (!css || css === "transparent") return "";
    let n = css;
    if (colorCtx) {
      colorCtx.fillStyle = "#000";
      colorCtx.fillStyle = css;
      n = String(colorCtx.fillStyle);
    }
    const hx = n.match(/^#([0-9a-f]{6})$/i);
    if (hx) return (hx[1] as string).toUpperCase();
    const m = n.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    if (!m) return "";
    if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return "";
    const h = (v: string) => Math.round(Number(v)).toString(16).padStart(2, "0");
    return `${h(m[1] as string)}${h(m[2] as string)}${h(m[3] as string)}`.toUpperCase();
  };
  const runsOf = (el: Element): PptxRun[] => {
    const runs: PptxRun[] = [];
    const walk = (node: Node, link?: string, bold?: boolean, italic?: boolean): void => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          const text = child.textContent ?? "";
          if (text.trim())
            runs.push({
              text,
              ...(link ? { link } : {}),
              ...(bold ? { bold } : {}),
              ...(italic ? { italic } : {}),
            });
        } else if (child.nodeType === 1) {
          const e = child as HTMLElement;
          const tag = e.tagName.toLowerCase();
          const w = Number(getComputedStyle(e).fontWeight);
          walk(
            e,
            tag === "a" ? (e as HTMLAnchorElement).href : link,
            bold || tag === "strong" || tag === "b" || w >= 600,
            italic || tag === "em" || tag === "i",
          );
        }
      }
    };
    walk(el);
    return runs;
  };
  const inlineImage = async (img: HTMLImageElement): Promise<string> => {
    try {
      const res = await fetch(img.currentSrc || img.src);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => resolve("");
        fr.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  };

  const blocks: RawBlock[] = [];
  const nodes = present.querySelectorAll("h1,h2,h3,h4,p,ul,ol,table,img,.as-code");
  for (const el of nodes) {
    // Skip content owned by a captured container (list items, cells, code spans).
    if (el.parentElement?.closest("ul,ol,table,.as-code")) continue;
    if (el.closest(".as-code") && !el.classList.contains("as-code")) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const px = toPx(rect);
    const tag = el.tagName.toLowerCase();
    const style = getComputedStyle(el);
    if (el.classList.contains("as-code")) {
      const codeIdx = Array.prototype.indexOf.call(present.querySelectorAll(".as-code"), el);
      blocks.push({ kind: "code", px, codeIdx });
    } else if (tag === "img") {
      const data = await inlineImage(el as HTMLImageElement);
      if (data) blocks.push({ kind: "image", px, data });
    } else if (tag === "ul" || tag === "ol") {
      const items: { runs: PptxRun[]; level: number }[] = [];
      for (const li of el.querySelectorAll("li")) {
        let level = 0;
        let p: Element | null = li.parentElement;
        while (p && p !== el) {
          if (p.tagName === "UL" || p.tagName === "OL") level++;
          p = p.parentElement;
        }
        items.push({ runs: runsOf(li), level });
      }
      blocks.push({
        kind: "list",
        px,
        items,
        fontPx: Number.parseFloat(style.fontSize),
        color: hex(style.color),
      });
    } else if (tag === "table") {
      const rows: string[][] = [];
      for (const tr of el.querySelectorAll("tr")) {
        rows.push(
          [...tr.querySelectorAll("th,td")].map((c) => (c as HTMLElement).innerText.trim()),
        );
      }
      blocks.push({ kind: "table", px, rows });
    } else {
      const runs = runsOf(el);
      if (runs.length)
        blocks.push({
          kind: "text",
          px,
          runs,
          fontPx: Number.parseFloat(style.fontSize),
          align: (style.textAlign === "center" || style.textAlign === "right"
            ? style.textAlign
            : "left") as "left" | "center" | "right",
          color: hex(style.color),
        });
    }
  }
  const bg = present ? hex(getComputedStyle(present).backgroundColor) : "";
  return { designW, designH, notes: notesMap[String(no)] ?? "", background: bg, blocks };
};
/* c8 ignore stop */

export interface PptxExportOptions {
  baseUrl: string;
  deck: string;
  slides: number[];
  total: number;
  outFile: string;
  /** Rasterize every slide to a full-slide image instead of editable shapes. */
  rasterizeAll?: boolean;
}

/** Export a deck to an editable `.pptx` by extracting each slide's rendered DOM. */
export async function exportDeckPptx(
  browser: Browser,
  options: PptxExportOptions,
): Promise<string[]> {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    // Read the design size once to fix the slide layout aspect (px maps onto inches).
    await page.goto(slideUrl(options.baseUrl, options.deck, options.slides[0] ?? 1), {
      waitUntil: "networkidle",
    });
    await waitForRenderReady(page);
    const design = await page.evaluate(() => {
      const d = document.querySelector(".as-deck") as HTMLElement | null;
      return {
        w: Number(d?.dataset.designWidth) || 1920,
        h: Number(d?.dataset.designHeight) || 1080,
      };
    });
    const widthIn = 13.333;
    const heightIn = Math.round(((widthIn * design.h) / design.w) * 100) / 100;

    const models: SlideModel[] = [];
    for (const no of options.slides) {
      await page.goto(slideUrl(options.baseUrl, options.deck, no), { waitUntil: "networkidle" });
      await waitForRenderReady(page);
      // A slide can opt into rasterization via `exportAs: image` frontmatter.
      const slideRasterize =
        options.rasterizeAll ||
        (await page
          .locator(`.as-slide[data-slide-no="${no}"]`)
          .first()
          .getAttribute("data-export-as")
          .then((v) => v === "image")
          .catch(() => false));
      if (slideRasterize) {
        const shot = await page.locator(".as-viewport").first().screenshot();
        const notesMap = await page.evaluate(
          () =>
            JSON.parse(document.querySelector(".as-notes-data")?.textContent || "{}") as Record<
              string,
              string
            >,
        );
        models.push({
          no,
          widthIn,
          heightIn,
          notes: notesMap[String(no)] ?? "",
          elements: [
            {
              kind: "image",
              box: { x: 0, y: 0, w: widthIn, h: heightIn },
              data: `data:image/png;base64,${shot.toString("base64")}`,
            },
          ],
        });
        continue;
      }
      const raw = await page.evaluate(DOM_WALKER, no);
      const elements: PptxElement[] = [];
      const toBox = (px: RawBlock["px"]): PptxBox => ({
        x: pxToIn(px.x, raw.designW, widthIn),
        y: pxToIn(px.y, raw.designH, heightIn),
        w: pxToIn(px.w, raw.designW, widthIn),
        h: pxToIn(px.h, raw.designH, heightIn),
      });
      const pt = (fontPx: number | undefined): number =>
        Math.max(6, Math.round(pxToIn(fontPx ?? 24, raw.designW, widthIn) * 72));
      for (const b of raw.blocks) {
        const box = toBox(b.px);
        if (b.kind === "text" && b.runs)
          elements.push({
            kind: "text",
            box,
            runs: b.runs,
            fontSize: pt(b.fontPx),
            align: b.align ?? "left",
            ...(b.color ? { color: b.color } : {}),
          });
        else if (b.kind === "list" && b.items)
          elements.push({
            kind: "list",
            box,
            items: b.items,
            fontSize: pt(b.fontPx),
            ...(b.color ? { color: b.color } : {}),
          });
        else if (b.kind === "table" && b.rows) elements.push({ kind: "table", box, rows: b.rows });
        else if (b.kind === "image" && b.data) elements.push({ kind: "image", box, data: b.data });
        else if (b.kind === "code") {
          // Scope to THIS slide's section — the deck route keeps every slide in the
          // DOM, so a page-wide `.as-code` index would target (hidden) other slides
          // and stall on Playwright's visibility wait.
          const shot = await page
            .locator(`.as-slide[data-slide-no="${no}"] .as-code`)
            .nth(b.codeIdx ?? 0)
            .screenshot()
            .catch(() => null);
          if (shot)
            elements.push({
              kind: "image",
              box,
              data: `data:image/png;base64,${shot.toString("base64")}`,
            });
        }
      }
      models.push({
        no,
        widthIn,
        heightIn,
        notes: raw.notes,
        elements,
        ...(raw.background ? { background: raw.background } : {}),
      });
    }

    const buf = await buildDeckPptx(models, { widthIn, heightIn });
    await mkdir(join(options.outFile, ".."), { recursive: true }).catch(() => {});
    await writeFile(options.outFile, buf);
    return [options.outFile];
  } finally {
    await context.close();
  }
}

interface AstroExportModule extends AstroModule {
  preview(config: { root: string }): Promise<AstroPreviewServer>;
}

const exportCommand = defineCommand({
  meta: {
    name: "export",
    description: "Export the deck to PDF, PNG, PPTX, or an offline HTML bundle.",
  },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
    format: { type: "string", description: "pdf | png | pptx | html", default: "pdf" },
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
    rasterize: {
      type: "boolean",
      description: "PPTX: rasterize every slide to a full-slide image.",
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
    if (!["pdf", "png", "pptx", "html"].includes(format)) {
      console.error(pc.red(`Unknown --format "${format}" (expected pdf | png | pptx | html).`));
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
            // With several decks, a single --output file would be overwritten by each
            // deck in turn — suffix the deck name (talk.pdf → talk.slides-a.pdf).
            const outputFor = (output: string | undefined, deck: string): string | undefined => {
              if (!output || decks.length <= 1) return output;
              const dot = output.lastIndexOf(".");
              return dot > 0
                ? `${output.slice(0, dot)}.${deck}${output.slice(dot)}`
                : `${output}.${deck}`;
            };
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
                      args.output && !args["per-slide"]
                        ? (outputFor(args.output, deck) as string)
                        : join(root, `${deck}.pdf`),
                    ...(scale != null ? { scale } : {}),
                    toc: !!args["with-toc"],
                    titles: titleMap,
                  })),
                );
              } else if (format === "pptx") {
                ctx.written.push(
                  ...(await exportDeckPptx(ctx.browser, {
                    baseUrl: ctx.baseUrl,
                    deck,
                    slides,
                    total,
                    outFile: outputFor(args.output, deck) ?? join(root, `${deck}.pptx`),
                    rasterizeAll: !!args.rasterize,
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

// --- MCP server (Phase 14) -------------------------------------------------
// The tool surface lives in `@astro-slides/mcp-server`, bundled by tsup so this
// type-stripped bin can `import()` it at runtime (the parser is inlined — it can't be
// imported as workspace TS, the same wall the export pipeline hit). We hand the server our
// own bin path so its export/capture tools re-spawn the tested Playwright pipeline.
//
// The import is loaded through a non-literal specifier + `@vite-ignore` so Vitest (which
// transforms this file when testing the export helpers) doesn't try to resolve the bundle's
// `dist/` at test time — it's only needed when the command actually runs. `typeof import`
// keeps full typing (type-erased, so it never reaches Vite).
type McpServerModule = typeof import("@astro-slides/mcp-server");
const MCP_SERVER_PACKAGE = "@astro-slides/mcp-server";
const mcpServerCommand = defineCommand({
  meta: { name: "mcp-server", description: "Run the MCP server (stdio or Streamable HTTP)." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
    transport: { type: "string", default: "stdio", description: "stdio | http" },
    host: { type: "string", default: "127.0.0.1", description: "http bind host" },
    port: { type: "string", default: "4444", description: "http port" },
    token: { type: "string", description: "Bearer token (or ASTRO_SLIDES_MCP_TOKEN)." },
    "read-only": { type: "boolean", default: false, description: "Disable write tools." },
    "sync-gateway": { type: "string", description: "Running dev gateway URL for navigate tools." },
    "sync-token": { type: "string", description: "Token for the sync gateway." },
  },
  async run({ args }) {
    const { runMcpServer } = (await import(
      /* @vite-ignore */ MCP_SERVER_PACKAGE
    )) as McpServerModule;
    const transport = args.transport === "http" ? "http" : "stdio";
    const port = Number(args.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error(pc.red(`Invalid --port "${args.port}" (expected 0-65535).`));
      process.exit(1);
    }
    const token = args.token ?? process.env.ASTRO_SLIDES_MCP_TOKEN;
    const handle = await runMcpServer({
      root: args.root ?? process.cwd(),
      readOnly: Boolean(args["read-only"]),
      transport,
      host: args.host,
      port,
      ...(process.argv[1] ? { cliBin: process.argv[1] } : {}),
      ...(token ? { token } : {}),
      ...(args["sync-gateway"] ? { syncGateway: args["sync-gateway"] } : {}),
      ...(args["sync-token"] ? { syncToken: args["sync-token"] } : {}),
    });
    // stdout is the stdio transport's channel — status goes to stderr only.
    if (transport === "http" && handle) {
      console.error(pc.green(`MCP server listening on ${handle.url}`));
    } else {
      console.error(pc.dim("MCP server ready on stdio."));
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
    "mcp-server": mcpServerCommand,
  },
});
