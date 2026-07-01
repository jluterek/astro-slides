import { slideTitle } from "@astro-slides/parser";
import type { LoadedDeck } from "./deck-loader.js";
import { renderMarkdown } from "./render.js";

/**
 * The per-slide record served through the `@astro-slides/slides` virtual module — the
 * render-ready manifest the runtime and routes consume.
 */
export interface SlideRecord {
  deck: string;
  no: number;
  index: number;
  layout: string;
  title: string | null;
  /** Rendered HTML of the default slot (kept for layouts that ignore slots). */
  html: string;
  /** Rendered HTML per named slot (`default` always present). Layouts consume these. */
  slots: Record<string, string>;
  /** Per-slide class from frontmatter `class`, applied to the slide section. */
  class: string | null;
  /** Per-slide background from frontmatter `background` (color / image URL). */
  background: string | null;
  notes: string | null;
  totalClicks: number;
  frontmatter: Record<string, unknown>;
}

function renderSlots(slots: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, source] of Object.entries(slots)) {
    out[name] = source.trim() === "" ? "" : renderMarkdown(source);
  }
  return out;
}

export function buildSlideRecords(decks: LoadedDeck[]): SlideRecord[] {
  const records: SlideRecord[] = [];
  for (const { name, deck } of decks) {
    for (const slide of deck.slides) {
      if (slide.frontmatter.hide) continue;
      const fm = slide.frontmatter as Record<string, unknown>;
      const slots = renderSlots(slide.slots);
      records.push({
        deck: name,
        no: slide.no,
        index: slide.index,
        layout: slide.layout,
        title: slideTitle(slide),
        html: slots.default ?? renderMarkdown(slide.content),
        slots,
        class: typeof fm.class === "string" && fm.class ? fm.class : null,
        background: typeof fm.background === "string" ? fm.background : null,
        notes: slide.notes,
        totalClicks: slide.totalClicks,
        frontmatter: fm,
      });
    }
  }
  return records;
}

/** Public virtual-module specifiers. */
export const VIRTUAL_IDS = {
  slides: "@astro-slides/slides",
  configs: "@astro-slides/configs",
  layouts: "@astro-slides/layouts",
  titles: "@astro-slides/titles",
} as const;

const json = (value: unknown): string => JSON.stringify(value);

export function slidesModuleSource(records: SlideRecord[]): string {
  return `export const slides = ${json(records)};\nexport default slides;\n`;
}

export function configsModuleSource(decks: LoadedDeck[]): string {
  const configs = Object.fromEntries(decks.map((d) => [d.name, d.deck.headmatter]));
  const first = decks[0]?.deck.headmatter ?? {};
  return `export const configs = ${json(configs)};\nexport const deckConfig = ${json(first)};\nexport default configs;\n`;
}

export function titlesModuleSource(records: SlideRecord[]): string {
  const titles = records.map((r) => ({ deck: r.deck, no: r.no, title: r.title }));
  return `export const titles = ${json(titles)};\nexport default titles;\n`;
}

/**
 * Emit the resolved layouts as a name -> component map. Each resolved `.astro`
 * file is statically imported (absolute path) so Astro compiles it; the route
 * indexes this map by a slide's `layout`. Var names are index-based because layout
 * names (`404`, `two-cols`) aren't valid identifiers.
 */
export function layoutsModuleSource(resolved: Record<string, string>): string {
  const entries = Object.entries(resolved);
  const imports = entries.map(([, path], i) => `import layout_${i} from ${json(path)};`).join("\n");
  const map = entries.map(([name], i) => `  ${json(name)}: layout_${i}`).join(",\n");
  return `${imports}\nexport const layouts = {\n${map}\n};\nexport default layouts;\n`;
}
