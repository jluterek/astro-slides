# @astro-slides/parser

Turns deck source into a slide AST.

Handles MDX (primary) and Marp/Slidev-compatible Markdown (secondary): frontmatter,
`---` slide separators, slot sugar (`::right::`), external snippet imports
(`<<< @/snippets/...`), and slide imports (`src:` in frontmatter). Click steps are
resolved at parse time (ADR-0008).

Status: skeleton (Phase 01). Implemented in Phase 02.
