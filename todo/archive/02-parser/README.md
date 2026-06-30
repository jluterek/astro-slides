---
title: Phase 02 — Parser
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Implement the MDX/MD → slide AST pipeline. The parser is the load-bearing piece for everything downstream — runtime, presenter, export, MCP server, and AI tools all consume the same AST. This phase establishes the shape and the input-format handling that makes ADR-0002 (MDX primary, Marp/Slidev compatible) real.

## Exit criteria

- [x] Parser produces a typed `Deck` → `Slide[]` AST from `.mdx` and `.md` inputs.
- [x] `docs/architecture/ast.md` filled in with the final AST types (status moves to `stable`).
- [x] `docs/architecture/frontmatter.md` filled in with the final field schema.
- [x] Frontmatter (YAML) parsed into typed `Headmatter` (deck-level) and `Frontmatter` (slide-level).
- [x] `---` slide separator works correctly inside MDX, including not splitting on fenced code blocks or HTML comments.
- [x] Trailing HTML-comment-per-slide treated as speaker notes.
- [x] Slot sugar (`::name::`) — lowered to a structured `slots` map (`default` + named); see *Outcome*.
- [x] Snippet imports (`<<< @/file#region`) inlined with region detection across common syntaxes.
- [x] Slide imports (`src:` frontmatter) resolve recursively with frontmatter merge semantics.
- [x] Marp directive parser (`<!-- _class: -->`, `<!-- _backgroundColor: -->`, etc.) emits the same AST.
- [x] Parse-time **image-usage extraction** and **feature detection** (KaTeX, Mermaid, Monaco) for downstream tree-shaking.
- [x] Sync + async parse functions exposed (sync for tooling, async for the dev server).
- [x] Zod schemas for frontmatter, generated to JSON Schema via `z.toJSONSchema()` and published as `@astro-slides/types/schemas/frontmatter.json`.
- [x] Comprehensive unit tests for the splitter, frontmatter merge, slot sugar, snippet imports, slide imports.

## Locked decisions

- **MDX version:** `@mdx-js/mdx` v3.x (Astro 5+'s peer).
- **Markdown AST utilities:** `unist-util-visit` v5, `mdast-util-*`, `hast-util-*` — the unified ecosystem.
- **Frontmatter:** `remark-frontmatter` v5 for the MDX pipeline; `gray-matter` for ad-hoc reads outside MDX.
- **YAML:** `yaml` v2+.
- **Source-preserving rewrites:** `magic-string`.
- **Marp directive parser:** hand-rolled (the grammar is small and stable; no third-party lib worth pulling in).
- **Frontmatter schema:** authored as Zod v4 in `packages/types/src/frontmatter.ts`. JSON Schema and TS types both derive from Zod.

## Tasks

Tracked inline (not as separate files) — the units are tightly coupled through the
shared AST/schema, so one branch carries them. Checked off as completed:

- [x] AST type design + `docs/architecture/ast.md` finalization (first — everything depends)
- [x] Frontmatter Zod schemas + `docs/architecture/frontmatter.md` finalization
- [x] Markdown splitter (`---` aware of fences and HTML comments)
- [x] Speaker-notes extraction (last HTML comment)
- [x] Slot sugar (`::name::`) lowering
- [x] Snippet imports (`<<< @/file#region`) with region detection
- [x] Slide-import resolver (`src:`, recursive with frontmatter merge)
- [x] Marp directive parser → AST normalization
- [x] Feature detection + image-usage extraction
- [x] Public sync + async parse API
- [x] Zod → JSON Schema build script (`@astro-slides/types/schemas/frontmatter.json`)
- [x] Comprehensive unit tests

File watcher integration is intentionally left to Phase 03 (needs the Astro/Vite glue).

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

All exit criteria met; CI green on PR #2. Distilled to
[`docs/built/02-parser.md`](../../docs/built/02-parser.md).

**Shipped:** `@astro-slides/types` (AST + Zod frontmatter schemas + JSON Schema
generator) and `@astro-slides/parser` (splitter, frontmatter, notes, slot sugar,
snippet imports, recursive `src:` imports, Marp directives, feature/image detection,
sync+async API, summaries). 62 tests, 92% coverage.

**Notable decisions (see built doc):**
- Parser is **source-level** — produces transformed MDX/Markdown *source* per slide;
  MDX→tree compilation is Phase 03. Resolves the `ast.md` "raw AST vs transformed?"
  question in favor of transformed source.
- **Slot sugar → structured `slots` map**, not literal JSX named slots (MDX/React has
  no Vue-style slot primitive). Layouts (Phase 05) consume the map.
- **Splitter**: separator `---` doubles as the next slide's frontmatter opener;
  frontmatter vs separator disambiguated by YAML-mapping detection.
- **Click-step fields** exist in the AST but are populated by Phase 06.
- `typecheck` moved `tsc -b --noEmit` → `tsc -b` (composite refs require emit); CI lint
  job now runs `pnpm check` to match the pre-commit hook.
