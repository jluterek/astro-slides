import { createHighlighter, type Highlighter } from "shiki";
import type { ResolvedShikiConfig } from "./config.js";

/**
 * Build-time Shiki highlighter, created once per (themes, langs) config and cached
 * for the process. Tokenization is expensive to boot (TextMate grammars + themes);
 * every slide's code blocks share the one instance (ADR-0011).
 */

let cache: { key: string; promise: Promise<Highlighter> } | null = null;

function configKey(config: ResolvedShikiConfig): string {
  return JSON.stringify([config.themes, [...config.langs].sort()]);
}

export function getHighlighter(config: ResolvedShikiConfig): Promise<Highlighter> {
  const key = configKey(config);
  if (cache && cache.key === key) return cache.promise;
  const promise = createHighlighter({
    themes: [config.themes.light, config.themes.dark],
    langs: [...config.langs],
  });
  cache = { key, promise };
  return promise;
}

/** Load a language grammar on demand (author used a lang outside the preload set). */
export async function ensureLang(hl: Highlighter, lang: string): Promise<boolean> {
  if (hl.getLoadedLanguages().includes(lang)) return true;
  try {
    await hl.loadLanguage(lang as Parameters<Highlighter["loadLanguage"]>[0]);
    return true;
  } catch {
    return false;
  }
}

/** Reset the cache — test-only, so successive configs don't leak between cases. */
export function resetHighlighter(): void {
  cache = null;
}
