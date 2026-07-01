import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { type Deck, parse } from "@astro-slides/parser";

/**
 * Deck discovery + loading for the MCP server. A lean reimplementation of core's
 * `deck-loader` (which we can't import — it drags Astro/Vite in): single-deck mode reads
 * `slides.{mdx,md}` at the project root, multi-deck reads `content/decks/<name>/slides.{mdx,md}`.
 * The parser gets a Node filesystem so `src:`/snippet imports resolve for the read tools.
 */
export interface LoadedDeck {
  name: string;
  file: string;
  deck: Deck;
}

const DECK_BASENAMES = ["slides.mdx", "slides.md"];

export function discoverDeckFiles(root: string): string[] {
  const files: string[] = [];
  for (const b of DECK_BASENAMES) {
    const p = join(root, b);
    if (existsSync(p)) {
      files.push(p);
      break;
    }
  }
  const decksDir = join(root, "content", "decks");
  if (existsSync(decksDir)) {
    for (const entry of readdirSync(decksDir)) {
      const dir = join(decksDir, entry);
      if (!statSync(dir).isDirectory()) continue;
      for (const b of DECK_BASENAMES) {
        const p = join(dir, b);
        if (existsSync(p)) {
          files.push(p);
          break;
        }
      }
    }
  }
  return files;
}

export function deckNameFromFile(root: string, file: string): string {
  const rel = file.slice(root.length).replace(/^[/\\]/, "");
  const parts = rel.split(/[/\\]/);
  const decksIdx = parts.indexOf("decks");
  const named = decksIdx >= 0 ? parts[decksIdx + 1] : undefined;
  if (named) return named;
  return basename(file).replace(/\.(mdx|md)$/, "");
}

/** Read + parse one deck file (with `src:`/snippet import resolution). */
export function loadDeck(root: string, file: string): LoadedDeck {
  const source = readFileSync(file, "utf8");
  const deck = parse(source, {
    filepath: file,
    root,
    fs: { readFileSync: (p) => readFileSync(p, "utf8") },
  });
  return { name: deckNameFromFile(root, file), file, deck };
}

export function loadAllDecks(root: string): LoadedDeck[] {
  return discoverDeckFiles(root).map((f) => loadDeck(root, f));
}

/** Resolve a deck id to its source file, or throw a clear MCP-facing error. */
export function resolveDeckFile(root: string, deckId: string): string {
  const files = discoverDeckFiles(root);
  const match = files.find((f) => deckNameFromFile(root, f) === deckId);
  if (!match) {
    const known = files.map((f) => deckNameFromFile(root, f)).join(", ") || "(none)";
    throw new Error(`Unknown deck "${deckId}". Known decks: ${known}`);
  }
  return match;
}
