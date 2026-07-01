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
  html: string;
  notes: string | null;
  totalClicks: number;
  frontmatter: Record<string, unknown>;
}

export function buildSlideRecords(decks: LoadedDeck[]): SlideRecord[] {
  const records: SlideRecord[] = [];
  for (const { name, deck } of decks) {
    for (const slide of deck.slides) {
      if (slide.frontmatter.hide) continue;
      records.push({
        deck: name,
        no: slide.no,
        index: slide.index,
        layout: slide.layout,
        title: slideTitle(slide),
        html: renderMarkdown(slide.content),
        notes: slide.notes,
        totalClicks: slide.totalClicks,
        frontmatter: slide.frontmatter as Record<string, unknown>,
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

export function layoutsModuleSource(records: SlideRecord[]): string {
  // Phase 05 wires real layout components; Phase 03 exposes the referenced names so the
  // manifest is complete and downstream code has the seam.
  const names = [...new Set(records.map((r) => r.layout))];
  return `export const layouts = ${json(names)};\nexport default layouts;\n`;
}
