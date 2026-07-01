import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";
import type { ShikiTransformer } from "shiki";

/**
 * Code-rendering configuration (ADR-0011). Defaults mirror VS Code's Dark+/Light+
 * themes and a curated base language set; authors extend or replace it from a
 * project-root `setup/shiki.{ts,js,mjs}` module (see `loadShikiSetup`).
 */
export interface ShikiSetup {
  /** Dual-theme ids. Both are embedded; the deck's `data-color-scheme` selects one. */
  themes?: { light: string; dark: string };
  /** Languages to preload. Merged with (not replacing) the defaults unless `replaceLangs`. */
  langs?: string[];
  replaceLangs?: boolean;
  /** Extra Shiki transformers appended after the built-ins. */
  transformers?: ShikiTransformer[];
}

/** Fully-resolved config the highlighter + plugins consume. */
export interface ResolvedShikiConfig {
  themes: { light: string; dark: string };
  langs: string[];
  transformers: ShikiTransformer[];
}

export const DEFAULT_THEMES = { light: "light-plus", dark: "dark-plus" } as const;

/** Curated base languages — common enough to preload, small enough to stay fast. */
export const DEFAULT_LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "html",
  "css",
  "astro",
  "vue",
  "svelte",
  "bash",
  "shell",
  "python",
  "rust",
  "go",
  "sql",
  "yaml",
  "markdown",
  "diff",
  "toml",
] as const;

export function resolveShikiConfig(setup: ShikiSetup = {}): ResolvedShikiConfig {
  const langs = setup.replaceLangs
    ? (setup.langs ?? [...DEFAULT_LANGS])
    : [...new Set([...DEFAULT_LANGS, ...(setup.langs ?? [])])];
  return {
    themes: setup.themes ?? { ...DEFAULT_THEMES },
    langs,
    transformers: setup.transformers ?? [],
  };
}

/**
 * Load a project's `setup/shiki.{ts,js,mjs}` if present. TypeScript is transformed
 * with esbuild to an ESM data URL and imported — no separate TS runtime needed. A
 * default export that is a function is invoked; a plain object is used directly.
 * Returns `{}` when no setup file exists.
 */
export async function loadShikiSetup(root: string): Promise<ShikiSetup> {
  for (const ext of ["ts", "mts", "js", "mjs"]) {
    const file = join(root, "setup", `shiki.${ext}`);
    if (!existsSync(file)) continue;
    const mod = await importMaybeTs(file, ext);
    const def = (mod as { default?: unknown }).default ?? mod;
    const setup = typeof def === "function" ? await def() : def;
    return (setup ?? {}) as ShikiSetup;
  }
  return {};
}

async function importMaybeTs(file: string, ext: string): Promise<unknown> {
  // `@vite-ignore` keeps Vite from trying to analyze/rewrite these — they load user
  // code from outside the module graph (a file URL or an esbuild-transformed data URL).
  if (ext === "js" || ext === "mjs") return import(/* @vite-ignore */ pathToFileURL(file).href);
  const source = readFileSync(file, "utf8");
  const { code } = await transform(source, { loader: "ts", format: "esm", target: "node20" });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  return import(/* @vite-ignore */ dataUrl);
}
