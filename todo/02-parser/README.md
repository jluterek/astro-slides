---
title: Phase 02 — Parser
status: pending
started:
ended:
---

## Goal

Implement the MDX/MD → slide AST pipeline. The parser is the load-bearing piece for everything downstream — runtime, presenter, export, MCP server, and AI tools all consume the same AST. This phase establishes the shape and the input-format handling that makes ADR-0002 (MDX primary, Marp/Slidev compatible) real.

## Exit criteria

- [ ] Parser produces a typed `Deck` → `Slide[]` AST from `.mdx` and `.md` inputs.
- [ ] Frontmatter (YAML) parsed into typed `Headmatter` (deck-level) and `Frontmatter` (slide-level).
- [ ] `---` slide separator works correctly inside MDX, including not splitting on fenced code blocks or HTML comments.
- [ ] Trailing HTML-comment-per-slide treated as speaker notes.
- [ ] Slot sugar (`::name::`) lowered to JSX named slots.
- [ ] Snippet imports (`<<< @/file#region`) inlined with region detection across common syntaxes.
- [ ] Slide imports (`src:` frontmatter) resolve recursively with frontmatter merge semantics.
- [ ] Marp directive parser (`<!-- _class: -->`, `<!-- _backgroundColor: -->`, etc.) emits the same AST.
- [ ] Parse-time **image-usage extraction** and **feature detection** (KaTeX, Mermaid, Monaco) for downstream tree-shaking.
- [ ] Sync + async parse functions exposed (sync for tooling, async for the dev server).
- [ ] Comprehensive unit tests for the splitter, frontmatter merge, slot sugar, snippet imports, slide imports.

## Planned tasks

- AST type design (`Deck`, `Slide`, `Frontmatter`, `Headmatter`, `SlideAST`, `SourceSlideInfo`)
- Markdown splitter (`---` aware of fences and HTML comments) — port the algorithm from Slidev's `packages/parser/src/core.ts`
- Frontmatter parsing (YAML + block-frontmatter style)
- Speaker-notes extraction (last HTML comment)
- Slot-sugar remark plugin (`::name::` → JSX named slots)
- Snippet-import remark plugin with region detection
- Slide-import resolver (recursive with frontmatter merge)
- Marp directive parser → AST normalization
- Feature detection pass
- File watcher integration for the dev server

## Dependencies

- Phase 01 (foundation, including `packages/parser/` skeleton and `packages/types/`)

## Notes

The parser lives in `packages/parser/`. Types live in `packages/types/`. No Astro coupling here — `packages/core/` (Phase 03) will be the glue.

Reference research: `docs/reference-applications/slidev.md` § *Markdown → slide AST*, `docs/reference-applications/marp.md` § *Authoring format*, `docs/reference-applications/mdx-deck.md` § *Code patterns worth studying*.

Open questions to resolve during the phase:
- How to handle MDX-1 vs MDX-3 AST differences. (Modern Astro is MDX 3+; we should target that.)
- Whether to vendor a fork of `markdown-it`-style splitter or use Astro's existing remark pipeline as the entry point.

## Outcome

_Fill in when the phase closes._
