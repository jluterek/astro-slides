import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * The built-in layout set (Phase 05). Embedded rather than resolved from the client
 * package's `.astro` assets — the mcp-server ships as a bundled artifact and can't reliably
 * `require.resolve` a sibling package's non-JS files. Project `layouts/*.astro` add/override.
 */
export const BUILTIN_LAYOUTS = [
  "cover",
  "default",
  "section",
  "center",
  "statement",
  "fact",
  "quote",
  "intro",
  "end",
  "full",
  "none",
  "image",
  "image-left",
  "image-right",
  "iframe",
  "iframe-left",
  "iframe-right",
  "two-cols",
  "two-cols-header",
  "404",
  "error",
] as const;

/** The built-in theme (Phase 05). Project `themes/<name>/` folders add more. */
export const BUILTIN_THEMES = ["starter"] as const;

export interface LayoutDescriptor {
  name: string;
  source: "builtin" | "project";
}
export interface ThemeDescriptor {
  name: string;
  source: "builtin" | "project";
}

function listAstroNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".astro"))
    .map((f) => basename(f, ".astro"));
}

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    try {
      return statSync(join(dir, e)).isDirectory();
    } catch {
      return false;
    }
  });
}

export function listLayouts(root: string): LayoutDescriptor[] {
  const project = new Set(listAstroNames(join(root, "layouts")));
  const seen = new Set<string>();
  const out: LayoutDescriptor[] = [];
  for (const name of BUILTIN_LAYOUTS) {
    seen.add(name);
    out.push({ name, source: project.has(name) ? "project" : "builtin" });
  }
  for (const name of project) {
    if (!seen.has(name)) out.push({ name, source: "project" });
  }
  return out;
}

export function listThemes(root: string): ThemeDescriptor[] {
  const project = new Set(listDirs(join(root, "themes")));
  const seen = new Set<string>();
  const out: ThemeDescriptor[] = [];
  for (const name of BUILTIN_THEMES) {
    seen.add(name);
    out.push({ name, source: project.has(name) ? "project" : "builtin" });
  }
  for (const name of project) {
    if (!seen.has(name)) out.push({ name, source: "project" });
  }
  return out;
}
