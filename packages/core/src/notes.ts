import { renderMarkdown } from "./render.js";

/**
 * Speaker-notes rendering for presenter mode (Phase 10). Notes are the trailing HTML
 * comment per slide (parsed in Phase 02), authored in Markdown. Inline click markers
 * `[click]` / `[click:N]` mark the point in the narration where the speaker advances;
 * they're converted to `<span class="as-note-click" data-click="N">` **before** Markdown
 * parsing (so `[click]` isn't mistaken for a link), then the presenter highlights the
 * marker matching the current step.
 *
 *  - `[click]`   → next auto step (1, 2, 3, …)
 *  - `[click:3]` → absolute step 3 (subsequent auto markers continue at 4)
 */

const CLICK_MARKER = /\[click(?::(\d+))?\]/g;

/** Replace click markers with highlightable spans, numbering bare markers in order. */
export function injectClickMarkers(md: string): string {
  let auto = 1;
  return md.replace(CLICK_MARKER, (_match, explicit: string | undefined) => {
    const n = explicit != null ? Number(explicit) : auto;
    auto = n + 1;
    return `<span class="as-note-click" data-click="${n}">◆${n}</span>`;
  });
}

/** Render slide notes (Markdown + click markers) to an HTML string, or "" for none. */
export function renderNotes(md: string | null | undefined): string {
  if (!md || md.trim() === "") return "";
  return renderMarkdown(injectClickMarkers(md));
}
