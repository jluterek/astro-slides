import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Filesystem persistence for slide annotations (Phase 11). Drawings live under
 * `<root>/.astro-slides/drawings/<deck>/<no>-<step>.svg` — the same `.astro-slides/`
 * scratch dir the MDX emit uses, namespaced by deck so multi-deck projects don't
 * collide. `.astro-slides/` is gitignored; users opt in to commit drawings.
 *
 * The store key is `"<no>:<step>"` (see `drawingKey` in the client). The file name
 * swaps the `:` for `-` so it is filesystem-safe.
 */

const OUT_DIR = ".astro-slides";
const DRAWINGS = "drawings";

/** Directory holding one deck's drawing SVGs. */
export function drawingsDir(root: string, deck: string): string {
  return join(root, OUT_DIR, DRAWINGS, sanitize(deck));
}

/** `"<no>:<step>"` → `"<no>-<step>.svg"`; returns null for a malformed key. */
export function drawingFileName(key: string): string | null {
  const m = /^(\d+):(\d+)$/.exec(key);
  return m ? `${m[1]}-${m[2]}.svg` : null;
}

/** `"<no>-<step>.svg"` → `"<no>:<step>"`; null if it isn't a drawing file. */
export function drawingKeyFromFile(file: string): string | null {
  const m = /^(\d+)-(\d+)\.svg$/.exec(file);
  return m ? `${m[1]}:${m[2]}` : null;
}

/** Persist (or, for empty SVG, delete) one annotation. Returns false on a bad key. */
export function saveDrawing(root: string, deck: string, key: string, svg: string): boolean {
  const name = drawingFileName(key);
  if (!name) return false;
  const dir = drawingsDir(root, deck);
  const file = join(dir, name);
  if (!svg.trim()) {
    if (existsSync(file)) rmSync(file);
    return true;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, svg, "utf8");
  return true;
}

/** Load every persisted annotation for a deck as `{ "<no>:<step>": svg }`. */
export function loadDrawings(root: string, deck: string): Record<string, string> {
  const dir = drawingsDir(root, deck);
  if (!existsSync(dir)) return {};
  const out: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    const key = drawingKeyFromFile(name);
    if (key) out[key] = readFileSync(join(dir, name), "utf8");
  }
  return out;
}

/** Keep deck names to a safe path segment (they come from directory names already). */
function sanitize(deck: string): string {
  return deck.replace(/[^\w.-]+/g, "_") || "deck";
}
