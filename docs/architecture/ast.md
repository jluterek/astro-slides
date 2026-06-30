# Slide AST shape

- **Status:** stub (designed in Phase 02)
- **Owner phase:** Phase 02

The canonical TypeScript shape of the parsed deck. Every downstream consumer — runtime, presenter, exporter, MCP server — sees the same AST.

## Scope

This spec defines:
- `Deck`, `Slide`, `Frontmatter`, `Headmatter`, `ClickStep`, `SlideSummary`, `DeckSummary`
- Serialization back to source (for `astro-slides format` and MCP writes)
- The `revision` hash used for HMR change detection

## Sketch (lands in Phase 02)

```ts
export type Deck = {
  source: string;           // entry path
  headmatter: Headmatter;
  slides: Slide[];
};

export type Slide = {
  no: number;                       // 1-based
  frontmatter: Frontmatter;
  body: MdxAst;                     // MDX AST root
  notes: string | null;             // last HTML comment, markdown
  clickSteps: ClickStep[];          // parse-time resolved (ADR-0008)
  totalClicks: number;              // = max(clickSteps[i].at), or override
  layout: string;                   // resolved layout name
  detectedFeatures: DetectedFeatures; // katex, mermaid, monaco, etc.
  revision: string;                 // content hash for HMR
};

export type ClickStep = {
  at: number;                       // 1-based step index
  target?: string;                  // CSS selector or component ref
  animation?: string;               // "fade" | "up" | "scale" | composable
  rangeEnd?: number;                // for `<Click at="[2,5]">`
};
```

Types live in `packages/types/src/ast.ts`. The parser package depends only on `@astro-slides/types`.

## Open questions

- Should `body` be the raw MDX AST, or a transformed "slide AST" with our remark plugins already applied (slot sugar lowered, snippets inlined, etc.)?
- How are imported slides (`src:` frontmatter) represented — inlined into the parent's `slides` array, or kept as a reference?
- Do we need a separate `RenderedSlide` type for runtime that adds resolved layout component refs, theme bindings?

## Change history

- 2026-06-30 — stub (Phase 01 prep). Full spec in Phase 02.
