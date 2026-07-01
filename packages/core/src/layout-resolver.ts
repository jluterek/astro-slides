import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { BUILTIN_LAYOUTS } from "@astro-slides/types";

/**
 * Filesystem-layered layout resolution. Layout `.astro` files are looked up in
 * priority order — user project > theme(s) > built-ins — so a file named
 * `cover.astro` in the user's `layouts/` folder overrides the built-in `cover`.
 * Returns an ordered map of layout name -> absolute file path.
 */

/** Absolute path to the bundled built-in layouts folder (`@astro-slides/client/layouts`). */
export function builtinLayoutsDir(): string {
  // `import.meta.resolve` isn't available inside Vite's module runner, so resolve
  // an exported layout file via `createRequire` and take its directory.
  const require = createRequire(import.meta.url);
  return dirname(require.resolve("@astro-slides/client/layouts/default.astro"));
}

function scanLayouts(dir: string): Map<string, string> {
  const found = new Map<string, string>();
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".astro")) continue;
    found.set(basename(entry, ".astro"), join(dir, entry));
  }
  return found;
}

/**
 * Resolve layouts across layers. `layers` are given low-to-high priority; later
 * layers override earlier ones. The built-in folder is always the base layer.
 */
export function resolveLayouts(overrideDirs: string[] = []): Record<string, string> {
  const resolved = new Map<string, string>();
  for (const [name, path] of scanLayouts(builtinLayoutsDir())) resolved.set(name, path);
  for (const dir of overrideDirs) {
    for (const [name, path] of scanLayouts(dir)) resolved.set(name, path);
  }
  return Object.fromEntries(resolved);
}

/** The user project's layout override folder (`<root>/layouts`). */
export function userLayoutsDir(root: string): string {
  return join(root, "layouts");
}

/** Layout names that have no resolved file (referenced but missing). */
export function missingLayouts(resolved: Record<string, string>): string[] {
  return BUILTIN_LAYOUTS.filter((name) => !(name in resolved));
}
