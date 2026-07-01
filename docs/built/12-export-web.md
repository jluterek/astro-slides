---
phase: 12-export-web
status: distilled
distilled: 2026-07-01
---

# Phase 12 — Web export (PDF, PNG, SPA, embeds)

Every web-format export: a `/print` route for `window.print()`, a Playwright-driven CLI
`export` for PDF/PNG, an offline HTML bundle, per-slide `?embed=1` pages, and the SPA build
(`/` redirect + `404.html`). PPTX is Phase 13. Archived task notes:
`todo/archive/12-export-web/`.

## What shipped

**Print route** — `packages/core/src/routes/print.astro` + `client/src/styles/print.css`
- `/print/[deck]` renders every slide as a page-sized block (`@page { size }` from the deck's
  aspect ratio), one per page, **all click steps revealed** (specificity, not `!important`).
  Reuses the deck's layouts + components, so print output matches the live deck.

**Embed mode** — runtime + `deck.css`
- `?embed=1` adds `.as-embed` (client-side, since prerendered routes can't read the query),
  hiding help/status/drawing chrome for `<iframe>` embedding. The slide still navigates.

**SPA build** — `integration.ts`
- A `/` index route redirects to the first slide; an `astro:build:done` hook copies
  `index.html` → `404.html` so refreshed deep links resolve on GitHub Pages.

**Export CLI** — inline in `packages/cli/src/main.ts`
- `astro-slides export [--format pdf|png|html]` builds the deck, starts `astro preview`, and
  drives headless Chromium (`listr2` progress).
  - **PDF**: renders the whole `/print` page once (`page.pdf`, `preferCSSPageSize`), then
    pdf-lib keeps the `--range` pages and either writes one document or splits `--per-slide`.
    `--with-toc` adds a title outline via `@lillallol/outline-pdf`.
  - **PNG**: navigates `/<deck>/<n>?embed=1[&step=k]` and screenshots `.as-viewport`;
    `--with-clicks` reads the step count from `data-steps`; `--scale` = device pixel ratio;
    `--omit-background` for transparency.
  - **html**: zips the built `dist/` (jszip) into an offline bundle.
  - Flags mirror Slidev: `--range`, `--dark`, `--with-clicks`, `--with-toc`, `--per-slide`,
    `--scale`, `--omit-background`, `--executable-path`.
- `data-waitfor` selectors + `document.fonts.ready` gate every snapshot.

## How to navigate the result

- `packages/core/src/routes/print.astro` — the stacked print page.
- `packages/client/src/styles/print.css` — page sizing + reveal-all-clicks.
- `packages/core/src/integration.ts` — `/print`, `/`, and the `404.html` build hook.
- `packages/cli/src/main.ts` (Export section) — `parseRange`/`slideUrl`/`discoverDecks`
  helpers, `exportDeckPdf`/`exportDeckPng`, and the `export` command.
- `packages/cli/src/__tests__/export.test.ts` — helper + bundle + discover tests.
- `e2e/export.spec.ts` — print/embed DOM + real `page.pdf`/screenshot.

## Key decisions

- **Export code lives in the CLI's self-contained `main.ts`, not core.** The bin runs
  `main.ts` under Node type-stripping, which can't resolve the repo's `.js` import specifiers
  to `.ts` at runtime — so the CLI may import only bare (JS) deps. A `packages/core/src/export/`
  first draft was removed once this surfaced.
- **One render, then slice** for PDF — faster and more consistent than N navigations; pdf-lib
  does range selection + per-slide splitting.
- **Reveal clicks via specificity** (`.as-print .as-print-slide [data-click]`), keeping the
  stylesheet `!important`-free.
- **Embed is client-side** — prerendered routes can't see `?embed=1` at build time.
- **Playwright is an optional peer of the CLI** (large binary), lazy-imported with an actionable
  install message; `--executable-path` for BYO.

## What surprised us

- **The workspace-TS-at-runtime wall.** `import("@astro-slides/core")` from the running CLI
  throws `Cannot find module …/code/index.js` — Node won't map the `.js` specifier to the `.ts`
  source in a workspace package. This is the same constraint that keeps the CLI self-contained;
  it forced the export code inline and the `packages/core/src/export/` removal.
- **The root e2e can't import `@astro-slides/cli`** (not a root dependency), so the export spec
  tests the render-to-file path with Playwright primitives (`page.pdf` / screenshot) instead of
  importing the pipeline — the pipeline itself is unit-tested + verified live.

## Loose ends

- **PPTX + Markdown export are not here** — PPTX is Phase 13; MD export isn't scoped.
- **`--dark` sets an env var** (`ASTRO_SLIDES_COLOR_SCHEME`) but the deck doesn't yet read it at
  build — dark export is best-effort until the theme wires it (Phase 16).
- **Per-slide PDF loses cross-slide links** (documented trade-off of splitting).
- **`--per-slide` for PNG isn't a thing** — PNG is always per-slide; the flag is PDF-only.
- **No visual/byte snapshot tests** — Chromium renders vary across versions, so tests assert
  format validity + counts, not pixels.

## Stats

New `routes/print.astro` + `routes/index.astro` + `styles/print.css`; embed mode in the runtime
+ `deck.css`; `/print`, `/`, and `404.html` wiring in `integration.ts`; the whole `export`
command + pipeline inline in `cli/src/main.ts`. Deps: `pdf-lib`, `@lillallol/outline-pdf`,
`jszip`, `listr2` (CLI); `@playwright/test` optional peer. **241 unit tests** (+9: range/url/
naming, bundle zip, deck discovery) + **27 Playwright e2e** (+4: print stacking, embed chrome,
`page.pdf`, PNG screenshot). Verified live: 3-page PDF (`--range 1-3`), valid PNG, 2.3 MB html
bundle.

---

**Workflow:** Created at phase close, before `todo/12-export-web/` moved to `todo/archive/`.
See `todo/README.md` § *Completing a phase*.
