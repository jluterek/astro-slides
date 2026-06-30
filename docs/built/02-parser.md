---
phase: 02-parser
status: distilled
distilled: 2026-06-30
---

# Phase 02 — Parser

The MDX/Markdown → slide AST pipeline. Load-bearing: runtime, presenter, export, MCP,
and AI tools all consume the `Deck` this produces. Archived task notes live in
`todo/archive/02-parser/`; this is the working summary.

## What shipped

**`@astro-slides/types`**
- `ast.ts` — `Deck`, `Slide`, `ClickStep`, `SlideSlots`, `DetectedFeatures`,
  `Slide/DeckSummary` (plain structural types).
- `frontmatter.ts` — Zod v4 `HeadmatterSchema` / `FrontmatterSchema` (loose objects so
  unknown/layout-specific keys pass through). TS types via `z.infer`.
- `scripts/gen-schemas.ts` (`pnpm gen:schemas`) → committed `schemas/frontmatter.json`
  via `z.toJSONSchema()`. Exposed as `@astro-slides/types/schemas/frontmatter.json`.

**`@astro-slides/parser`** — source-level, zero Astro/MDX-compiler coupling, injectable
filesystem. Public API: `parse` / `parseAsync` → `Deck`, plus `summarizeDeck`.
Modules: `splitter` · `frontmatter` · `notes` · `slots` · `snippets` · `imports`
(`src:`) · `marp` · `features` · `paths` · `hash` · `summary`.

62 unit tests, 92% coverage.

## How to navigate the result

- `packages/parser/src/parse.ts` — orchestrator; the order of operations
  (split → expand `src:` → marp → snippets → notes → slots → features → frontmatter).
- `packages/parser/src/splitter.ts` — the keystone algorithm (see *Surprises*).
- `packages/parser/src/index.ts` — public surface.
- `packages/types/src/{ast,frontmatter}.ts` — the AST + schema source of truth.
- Specs: `docs/architecture/ast.md`, `docs/architecture/frontmatter.md` (both `stable`).

## Key decisions

- **Source-level parser, not an MDX AST.** Each slide's `content` is transformed
  *source* (slot sugar lowered, snippets inlined, Marp stripped). MDX→HAST compilation
  is Phase 03. This answers `ast.md`'s open question.
- **Slot sugar → structured `slots` map** (`default` + named), not literal JSX named
  slots — MDX/React lacks a Vue-style slot primitive. Layouts (Phase 05) consume it.
- **Injectable filesystem** (`options.fs`) keeps the parser core pure and unit-testable
  without touching disk; Phase 03 wires real fs / Vite.
- **Click-step fields in the AST, populated later** (Phase 06, the click model).
- **`tsc -b` (emit) for typecheck.** The first cross-package reference (`parser` →
  `types`) made `tsc -b --noEmit` illegal (TS6310: referenced composite projects must
  emit). Switched to `tsc -b`; output lands in gitignored `dist/`.
- **CI lint job → `pnpm check`.** `biome lint`/`format:check` don't run the
  import-sorting *assist* that the pre-commit hook does, so CI could pass code the hook
  rejects. `pnpm check` (lint + format + assist) closes the gap.

## What surprised us

- **`---` is triply overloaded.** It separates slides, opens frontmatter, AND closes
  frontmatter — and the separator between two slides is the SAME line that opens the
  next slide's frontmatter. The working model: at a slide boundary, a `---` opens
  frontmatter *only if* the lines up to the next `---` parse as a YAML **mapping**
  (so a body starting with `# Heading` — a YAML comment → null — is correctly NOT
  treated as frontmatter). This took a rewrite after the naive "separator consumes one
  `---`, next slide re-checks" model produced phantom slides.
- **Biome's import-sorting is an *assist*, not a lint rule.** `pnpm lint` and
  `format:check` are both silent on it; only `biome check` enforces it. The pre-commit
  hook uses `check`, so it caught unsorted exports that CI would have waved through —
  hence the CI change above.
- **Node 24 runs the `.ts` schema generator with no build step** (native type
  stripping), but it needs literal `.ts` import specifiers — the opposite of the `.js`
  specifiers tsc/Vite want in `src/`.

## Loose ends

- **MDX compilation** of `content` → Phase 03 (Astro integration), incl. global remark
  plugin registration (per-collection plugins unsupported in Astro 5+).
- **Click-step population** (`clickSteps`/`totalClicks`) → Phase 06.
- **File watching / HMR** (`revision` hash is ready for it) → Phase 03.
- **Block-frontmatter** (```` ```yaml ````) is supported but lightly tested vs the
  primary `---` path.
- **Marp carry-forward directives** (non-`_` global directives that apply "from here
  on") are applied per-slide only; full Marp semantics → Phase 15.

## Stats

~1.0k LoC across two packages; 12 test files / 62 tests; 92% line coverage
(types 100%, parser 91%). CI green on PR #2.

---

**Workflow:** Created at phase close, immediately before `todo/02-parser/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
