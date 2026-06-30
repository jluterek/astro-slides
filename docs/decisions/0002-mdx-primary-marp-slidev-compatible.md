# 0002. MDX as primary author format, Marp/Slidev-compatible

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Author formats in the reference ecosystem:

- **JSX/TSX only** (Spectacle) — full React power, but heavy for prose, no portability to non-React tooling.
- **Markdown only** (Marp) — universal portability, but no component embedding without raw HTML.
- **Markdown + embedded Vue** (Slidev) — best ergonomics in the existing field, but Vue-locked.
- **MDX** (MDX Deck, Spectacle's secondary path) — Markdown for prose, JSX for components, frontmatter for config. Astro has native MDX support.
- **HTML** (reveal.js, impress.js, WebSlides) — most fragile to author and refactor.

A meaningful share of the existing deck ecosystem already lives in Marp- and Slidev-flavored Markdown. Compatibility with both is a near-free win that protects authors from migration cost.

## Decision

- **Primary format:** MDX (`.mdx`). Markdown for prose, JSX for components, YAML frontmatter, `---` slide separators, trailing HTML comment for speaker notes, slot sugar (`::name::`), snippet imports (`<<< @/file#region`), slide imports (`src:`).
- **Secondary format:** Marp/Slidev-flavored Markdown (`.md`). Read as-is. YAML frontmatter, `---` separators, HTML-comment directives (`<!-- _class: -->`, `<!-- _backgroundColor: -->`). Existing Marp and Slidev decks render unchanged within feature overlap.
- **Escape hatch:** Astro components (`.astro`) for full-power custom slides.

## Consequences

- Authors with existing Marp or Slidev decks can adopt astro-slides without a rewrite.
- React/Solid/Vue/Svelte components embed cleanly as MDX islands per ADR-0001.
- We own a set of remark/rehype plugins for slide splitting, frontmatter merge, slot sugar, snippet imports, click-step extraction, and Marp-directive translation. All share a normalization layer that produces a single slide AST regardless of input format.
- Trade-off: three input formats means more parser surface. Mitigated by the shared AST.
- Trade-off: Marp-compatibility is limited to features that have an astro-slides equivalent. Marp-specific quirks that don't translate (e.g., math via MathJax 2 specifically) will be documented as known gaps.
- Trade-off: Slidev's Vue-specific components (`<v-click>`, `<Tweet>`, `<Youtube>`) need React-ish equivalents in our component library to render. We ship those.
