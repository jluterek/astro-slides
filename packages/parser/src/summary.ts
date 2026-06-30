import type { Deck, DeckSummary, Slide, SlideSummary } from "@astro-slides/types";

const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/m;

/** First Markdown heading text in a slide, if any. */
export function slideTitle(slide: Slide): string | null {
  const m = HEADING.exec(slide.content);
  return m ? (m[1] as string).trim() : null;
}

export function summarizeSlide(slide: Slide): SlideSummary {
  return {
    no: slide.no,
    title: slideTitle(slide),
    layout: slide.layout,
    notes: slide.notes,
    totalClicks: slide.totalClicks,
    hide: slide.frontmatter.hide,
  };
}

/** Compact, render-free view of a deck — for MCP responses, manifests, and TOCs. */
export function summarizeDeck(deck: Deck): DeckSummary {
  const slides = deck.slides.map(summarizeSlide);
  const title = deck.headmatter.title || slides.find((s) => s.title)?.title || "";
  return {
    source: deck.source,
    title,
    slideCount: deck.slides.length,
    totalClicks: deck.slides.reduce((sum, s) => sum + s.totalClicks, 0),
    slides,
  };
}
