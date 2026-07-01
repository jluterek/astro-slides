/**
 * The prop contract every built-in layout `.astro` receives from the deck route.
 * Content arrives as pre-rendered HTML (the default slot in `html`; all named
 * slots in `slots`) which layouts inject via `set:html`.
 */
export interface LayoutProps {
  no: number;
  title: string | null;
  layout: string;
  html: string;
  slots: Record<string, string>;
  frontmatter: Record<string, unknown>;
}

/** Read a non-empty string frontmatter field, or null. */
export function fmString(fm: Record<string, unknown>, key: string): string | null {
  const value = fm[key];
  return typeof value === "string" && value !== "" ? value : null;
}
