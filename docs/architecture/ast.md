# Slide AST shape

- **Status:** stable (finalized in Phase 02)
- **Owner phase:** Phase 02
- **Source of truth:** `packages/types/src/ast.ts` (+ `frontmatter.ts` for `Frontmatter`/`Headmatter`)

The canonical shape of a parsed deck. Every downstream consumer — runtime, presenter,
exporter, MCP server, AI tools — sees this same AST. Frontmatter types are inferred from
Zod (`z.infer`); AST types are plain structural types (they describe parser output, not
validated user input).

## Types

```ts
type Deck = {
  source: string;            // entry path the deck was parsed from
  headmatter: Headmatter;    // deck-level config (first frontmatter block)
  slides: Slide[];           // flattened, after `src:` imports are inlined
  features: DetectedFeatures; // OR of every slide's detectedFeatures
};

type Slide = {
  index: number;             // 0-based position in the flattened deck
  no: number;                // 1-based slide number (URLs, authors)
  frontmatter: Frontmatter;
  source: string;            // file the content came from (after `src:` resolution)
  content: string;           // transformed MDX/Markdown body (slot sugar lowered,
                             //   snippets inlined, Marp directives stripped) = default slot
  slots: SlideSlots;         // { default, [name] } from `::name::` sugar
  notes: string | null;      // last HTML comment, as Markdown
  clickSteps: ClickStep[];   // parse-time click plan (ADR-0008); populated in Phase 06
  totalClicks: number;       // computed; frontmatter.clicks overrides; 0 until Phase 06
  layout: string;            // resolved: `cover` for slide 1, else `default`, unless overridden
  detectedFeatures: DetectedFeatures;
  images: string[];          // image srcs for preloading
  revision: string;          // FNV-1a content hash for HMR change detection
};

type ClickStep = { at: number; target?: string; animation?: string; rangeEnd?: number };
type SlideSlots = { default: string; [name: string]: string };
type DetectedFeatures = {
  katex: boolean; mermaid: boolean; plantuml: boolean;
  monaco: boolean; twoslash: boolean; magicMove: boolean;
};

// Compact, render-free views for manifests / MCP / TOCs:
type SlideSummary = { no; title: string | null; layout; notes; totalClicks; hide };
type DeckSummary = { source; title; slideCount; totalClicks; slides: SlideSummary[] };
```

## Resolved open questions

- **Is `body` a raw MDX AST or transformed source?** It is **transformed source** (a
  string), exposed as `content` (+ structured `slots`). The Phase 02 parser is
  deliberately free of any MDX compiler / Astro coupling — slot sugar, snippet inlining,
  Marp normalization, and feature detection all happen at the source level. MDX → HAST
  compilation is the Astro integration's job (Phase 03).
- **How are `src:` imports represented?** **Inlined** — imported slides are flattened
  into the parent's `slides` array in place, with the importing slide's frontmatter
  overriding the first imported slide's. No reference node survives in the AST.
- **Do we need a separate `RenderedSlide` type?** Not in the parser. Runtime-only
  concerns (resolved layout component refs, theme bindings) layer on in Phase 04+; the
  parser stops at `layout` as a *name*.

## Constraints

- **Per-collection remark plugins are not supported in Astro 5+** (research-confirmed).
  The Astro integration (Phase 03) registers plugins globally and keys behavior off the
  file path — the parser itself doesn't depend on this.
- **MDX 3 AST conventions differ from MDX 1** — relevant only once Phase 03 compiles the
  `content` string; the Phase 02 AST is MDX-version-agnostic.
- **Click steps must be statically discoverable** (ADR-0008). `clickSteps`/`totalClicks`
  are AST fields now; Phase 06 fills them.

## Change history

- 2026-06-30 — finalized in Phase 02. Types live in `packages/types/src/ast.ts`.
