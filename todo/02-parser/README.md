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
- [ ] `docs/architecture/ast.md` filled in with the final AST types (status moves to `stable`).
- [ ] `docs/architecture/frontmatter.md` filled in with the final field schema.
- [ ] Frontmatter (YAML) parsed into typed `Headmatter` (deck-level) and `Frontmatter` (slide-level).
- [ ] `---` slide separator works correctly inside MDX, including not splitting on fenced code blocks or HTML comments.
- [ ] Trailing HTML-comment-per-slide treated as speaker notes.
- [ ] Slot sugar (`::name::`) lowered to JSX named slots.
- [ ] Snippet imports (`<<< @/file#region`) inlined with region detection across common syntaxes.
- [ ] Slide imports (`src:` frontmatter) resolve recursively with frontmatter merge semantics.
- [ ] Marp directive parser (`<!-- _class: -->`, `<!-- _backgroundColor: -->`, etc.) emits the same AST.
- [ ] Parse-time **image-usage extraction** and **feature detection** (KaTeX, Mermaid, Monaco) for downstream tree-shaking.
- [ ] Sync + async parse functions exposed (sync for tooling, async for the dev server).
- [ ] Zod schemas for frontmatter, generated to JSON Schema via `z.toJSONSchema()` and published as `@astro-slides/types/schemas/frontmatter.json`.
- [ ] Comprehensive unit tests for the splitter, frontmatter merge, slot sugar, snippet imports, slide imports.

## Locked decisions

- **MDX version:** `@mdx-js/mdx` v3.x (Astro 5+'s peer).
- **Markdown AST utilities:** `unist-util-visit` v5, `mdast-util-*`, `hast-util-*` — the unified ecosystem.
- **Frontmatter:** `remark-frontmatter` v5 for the MDX pipeline; `gray-matter` for ad-hoc reads outside MDX.
- **YAML:** `yaml` v2+.
- **Source-preserving rewrites:** `magic-string`.
- **Marp directive parser:** hand-rolled (the grammar is small and stable; no third-party lib worth pulling in).
- **Frontmatter schema:** authored as Zod v4 in `packages/types/src/frontmatter.ts`. JSON Schema and TS types both derive from Zod.

## Tasks (planned)

- AST type design + `docs/architecture/ast.md` finalization (must be first — everything else depends)
- Frontmatter Zod schemas + `docs/architecture/frontmatter.md` finalization
- Markdown splitter (`---` aware of fences and HTML comments) — port the algorithm from Slidev's `packages/parser/src/core.ts`
- Speaker-notes extraction (last HTML comment)
- Slot-sugar remark plugin (`::name::` → JSX named slots)
- Snippet-import remark plugin with region detection
- Slide-import resolver (recursive with frontmatter merge)
- Marp directive parser → AST normalization
- Feature detection pass
- File watcher integration (Phase 03 wires this)
- JSON Schema build script

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| AST types + frontmatter schema | **must come first** — both inputs are blocking |
| After AST/schema | **splitter, slot sugar, snippet imports, slide imports, Marp directive parser, feature detection, notes extraction** — six parallel agents possible |
| After all parsers | Integration tests + Zod → JSON Schema build script |

## Dependencies

- Phase 01 (foundation, including `packages/parser/` skeleton and `packages/types/`)

## Risks

- **Per-collection remark plugins are not supported in Astro 5+.** This is research-confirmed. We register plugins **globally** in the Astro integration (Phase 03) and key behavior off the file path. Document this constraint in `docs/architecture/ast.md`.
- **MDX 3 AST conventions differ from MDX 1.** Watch out when referencing MDX Deck patterns — they're MDX 1.
- **Slidev's `markdown-exit` fork.** We don't pull that in; we stick to the unified ecosystem standard so we don't inherit Slidev's parser quirks.

## Notes

The parser lives in `packages/parser/`. Types live in `packages/types/`. No Astro coupling here — `packages/core/` (Phase 03) is the glue.

Reference: `docs/reference-applications/slidev.md` § *Markdown → slide AST*, `docs/reference-applications/marp.md` § *Authoring format*, `docs/reference-applications/mdx-deck.md` § *Code patterns worth studying*.

## Outcome

_Fill in when the phase closes._
