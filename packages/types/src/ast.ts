import type { Frontmatter, Headmatter } from "./frontmatter.js";

/**
 * The slide AST. Every downstream consumer — runtime, presenter, exporter, MCP
 * server, AI tools — sees this same shape. See `docs/architecture/ast.md`.
 *
 * In Phase 02 a slide's `content` is transformed MDX/Markdown *source* (slot sugar
 * lowered, snippets inlined, Marp directives normalized). Compilation of that source
 * to an MDX/HAST tree happens in the Astro integration (Phase 03) — the parser stays
 * free of any Astro/MDX-compiler coupling.
 */

/** Features auto-detected per slide, used for build-time tree-shaking. */
export type DetectedFeatures = {
  katex: boolean;
  mermaid: boolean;
  plantuml: boolean;
  monaco: boolean;
  twoslash: boolean;
  magicMove: boolean;
};

/**
 * A single click step within a slide. Resolved at parse time (ADR-0008). The fields
 * are part of the AST now; population is the Phase 06 click-model's job, so Phase 02
 * emits an empty list and `totalClicks: 0` unless `frontmatter.clicks` overrides it.
 */
export type ClickStep = {
  /** 1-based step index. */
  at: number;
  /** CSS selector or component reference revealed at this step. */
  target?: string;
  /** Animation name or composable spec. */
  animation?: string;
  /** End of a range for `<Click at="[2,5]">`. */
  rangeEnd?: number;
};

/**
 * Named slots produced by `::name::` slot sugar. Unnamed leading content lives under
 * `default`; every `::name::` marker opens a new named region.
 */
export type SlideSlots = {
  default: string;
  [name: string]: string;
};

export type Slide = {
  /** 0-based position in the flattened deck. */
  index: number;
  /** 1-based slide number (what authors and the URL use). */
  no: number;
  frontmatter: Frontmatter;
  /** Path of the file this slide's content came from (after `src:` resolution). */
  source: string;
  /** Transformed MDX/Markdown body: slot sugar lowered, snippets inlined. */
  content: string;
  /** Body split by slot sugar. `default` is always present. */
  slots: SlideSlots;
  /** Speaker notes — the last HTML comment in the slide, as Markdown. */
  notes: string | null;
  /** Parse-time click plan (ADR-0008). Populated in Phase 06. */
  clickSteps: ClickStep[];
  /** Total click steps. `frontmatter.clicks` overrides the computed value. */
  totalClicks: number;
  /** Resolved layout name (`cover` for slide 1, else `default`, unless overridden). */
  layout: string;
  detectedFeatures: DetectedFeatures;
  /** Image sources referenced in this slide (for preloading). */
  images: string[];
  /** Content hash for HMR change detection. */
  revision: string;
};

export type Deck = {
  /** Entry path the deck was parsed from. */
  source: string;
  headmatter: Headmatter;
  slides: Slide[];
  /** Deck-wide feature union (OR of every slide's `detectedFeatures`). */
  features: DetectedFeatures;
};

/** Compact per-slide view for manifests, MCP responses, and TOCs. */
export type SlideSummary = {
  no: number;
  /** Text of the slide's first heading, if any. */
  title: string | null;
  layout: string;
  notes: string | null;
  totalClicks: number;
  hide: boolean;
};

/** Compact whole-deck view — knowable without rendering. */
export type DeckSummary = {
  source: string;
  title: string;
  slideCount: number;
  totalClicks: number;
  slides: SlideSummary[];
};

export const EMPTY_FEATURES: DetectedFeatures = {
  katex: false,
  mermaid: false,
  plantuml: false,
  monaco: false,
  twoslash: false,
  magicMove: false,
};
