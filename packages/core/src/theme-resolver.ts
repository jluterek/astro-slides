import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * User theme discovery (issue #49, ADR-0005: themes are folders). A project ships a
 * custom theme as `<root>/themes/<name>/theme.css`, scoping its tokens under
 * `[data-theme="<name>"]` exactly like the bundled themes. Deck headmatter
 * `theme: <name>` already stamps the attribute; this layer makes the CSS actually
 * load — the routes import every discovered user theme via the
 * `@astro-slides/user-themes` virtual module (Vite bundles + HMRs the real files).
 */

/** Themes compiled into the client package — always available by name. */
export const BUNDLED_THEMES = new Set([
  "starter",
  "cosmic",
  "marp-default",
  "marp-gaia",
  "marp-uncover",
]);

export function userThemesDir(root: string): string {
  return join(root, "themes");
}

export interface UserTheme {
  name: string;
  /** Absolute path of the theme's stylesheet. */
  css: string;
}

/** Every `<root>/themes/<name>/theme.css` on disk. */
export function discoverUserThemes(root: string): UserTheme[] {
  const dir = userThemesDir(root);
  if (!existsSync(dir)) return [];
  const themes: UserTheme[] = [];
  for (const name of readdirSync(dir)) {
    const folder = join(dir, name);
    if (!statSync(folder).isDirectory()) continue;
    const css = join(folder, "theme.css");
    if (existsSync(css)) themes.push({ name, css });
  }
  return themes.sort((a, b) => a.name.localeCompare(b.name));
}

/** Names referenced by decks that resolve to neither a bundled nor a user theme. */
export function unknownThemeNames(referenced: Iterable<string>, user: UserTheme[]): string[] {
  const known = new Set([...BUNDLED_THEMES, ...user.map((t) => t.name)]);
  return [...new Set([...referenced])].filter((name) => name && !known.has(name));
}
