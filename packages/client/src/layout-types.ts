/**
 * The prop contract every built-in layout `.astro` receives from the deck route.
 * Slide content arrives as Astro **slots** (the compiled MDX): the default slot for
 * body content, plus named slots (`right`, `left`) for multi-column layouts. Media
 * layouts read the image/iframe URL from `frontmatter`.
 */
export interface LayoutProps {
  no: number;
  title: string | null;
  layout: string;
  frontmatter: Record<string, unknown>;
}

/** Read a non-empty string frontmatter field, or null. */
export function fmString(fm: Record<string, unknown>, key: string): string | null {
  const value = fm[key];
  return typeof value === "string" && value !== "" ? value : null;
}
