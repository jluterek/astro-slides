# @astro-slides/parser

Turns deck source into a slide AST.

Handles MDX (primary) and Marp/Slidev-compatible Markdown (secondary): frontmatter,
`---` slide separators, slot sugar (`::right::`), external snippet imports
(`<<< @/snippets/...`), and slide imports (`src:` in frontmatter). Click steps are
resolved at parse time (ADR-0008).

Public API: `parse(source, options)` / `parseAsync(...)` → typed `Deck`, plus
`summarizeDeck`. `src:`/snippet imports use an injectable filesystem (`options.fs`), so
the core is pure and testable. The parser produces transformed *source* per slide; MDX→
tree compilation is the Astro integration's job (Phase 03). See
`docs/architecture/ast.md`.

Status: implemented (Phase 02). Click-step population is deferred to Phase 06.
