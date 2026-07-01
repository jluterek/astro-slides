import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { type Deck, parse } from "@astro-slides/parser";

/**
 * Discovers and parses deck source files from a project. The parser gets a Node
 * filesystem so `src:`/snippet imports resolve. Single-deck mode uses `slides.{mdx,md}`
 * at the project root; multi-deck uses `content/decks/<name>/slides.{mdx,md}`.
 */
export interface LoadedDeck {
  name: string;
  file: string;
  deck: Deck;
}

const DECK_BASENAMES = ["slides.mdx", "slides.md"];

export function discoverDeckFiles(root: string, explicit?: string[]): string[] {
  if (explicit && explicit.length > 0) return explicit.map((p) => join(root, p));

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

export function loadDeck(root: string, file: string): LoadedDeck {
  const source = readFileSync(file, "utf8");
  const deck = parse(source, {
    filepath: file,
    root,
    fs: { readFileSync: (p) => readFileSync(p, "utf8") },
  });
  return { name: deckNameFromFile(root, file), file, deck };
}

export function loadAllDecks(root: string, explicit?: string[]): LoadedDeck[] {
  return discoverDeckFiles(root, explicit).map((f) => loadDeck(root, f));
}
