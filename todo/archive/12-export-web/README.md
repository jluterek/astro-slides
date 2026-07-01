---
title: Phase 12 — Export (PDF, PNG, SPA, embeds)
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Ship every web-format export: PDF (browser-native print first, Playwright fallback), PNG (per-slide and per-click), standalone HTML bundles, the SPA build, and embeddable single-slide pages. PPTX is Phase 13.

## Exit criteria

- [x] **PDF (in-browser)**: a `/print/[deck]` route renders every slide stacked into one document with `@page` sized to the deck's aspect ratio, all clicks revealed. `window.print()` produces a usable PDF.
- [x] **PDF (Playwright)**: `astro-slides export --format pdf` builds + previews the deck and drives Playwright against the print page. One-piece and `--per-slide` modes (per-slide splits the one-piece render with pdf-lib).
- [x] **PNG**: `--format png` writes one image per slide. `--with-clicks` writes one image per click step (step count read from the rendered DOM).
- [x] **SPA build**: `astro-slides build` produces the static site; the integration adds a `/` → first-slide redirect and copies `index.html` → `404.html` for GitHub Pages.
- [x] **Per-slide embeds**: each slide has a permanent URL and an `?embed=1` variant (minimal chrome, applied client-side).
- [x] **HTML bundle**: `--format html` zips the built `dist/` (jszip) into a self-contained offline archive.
- [x] **`data-waitfor` opt-in**: the exporter reads `[data-waitfor]` selectors and waits for them (plus fonts) before snapshotting.
- [x] CLI flags align with Slidev's: `--range`, `--dark`, `--with-clicks`, `--with-toc`, `--per-slide`, `--scale`, `--omit-background`, `--executable-path`.
- [x] Tests cover: PDF `%PDF` validity + page selection, PNG magic-byte validity, print-route stacking, embed chrome-hiding, bundle zip round-trip, range/naming/discover helpers. *(Byte-snapshot / image-diff replaced with format-validity + count assertions — deterministic across Chromium versions.)*

## Locked decisions

- **In-browser export default; Playwright as the high-fidelity opt-in.** Slidev recommends in-browser; we follow.
- **Playwright location:** already installed via project-scoped `.claude/settings.json`. Phase 04 set up the test config. This phase adds the export-pipeline usage.
- **PDF manipulation:** `pdf-lib` for merging per-slide PDFs.
- **PDF TOC outlines:** `@lillallol/outline-pdf`.
- **HTML bundle:** `jszip` (already a transitive dep via PptxGenJS).
- **Progress UI for long exports:** `listr2` v10+.
- **Embed URL pattern:** `/<deck>/<n>?embed=1` strips chrome; `<iframe src="…?embed=1">` is the recommended embed.

## Tasks (planned)

- `/print` route (stacks all slides, applies `@page`)
- Playwright export pipeline (one-piece + per-slide)
- PNG export via `page.screenshot()`
- SPA build configuration
- Per-slide embed pages (minimal chrome variant)
- HTML bundle zipper
- `data-waitfor` wait logic in exporter
- CLI flag set + documentation in `--help`
- `listr2` progress integration
- Tests for each format (PDF, PNG, SPA, embed)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| `/print` route + SPA build | parallel — they don't interact |
| **Playwright pipeline, PNG export, HTML bundle, embed pages** | parallel — independent exporters |
| `data-waitfor` integration | after Playwright pipeline |
| Tests | parallel with implementations |

## Dependencies

- Phase 03 (Astro integration — the SPA build)
- Phases 04-09 (everything must render correctly before we snapshot it)

## Risks

- **Playwright Chromium download is ~300 MB.** Provide `--executable-path` override for CI / constrained environments.
- **`@page` size CSS support varies subtly.** Test with Chromium 120+, Safari 17+, Firefox 122+.
- **Per-slide PDF mode loses cross-slide links.** Document the trade-off.
- **PNG export at high `--scale` can OOM.** Default scale 2; document max safe scale.

## Notes

Reference: `docs/reference-applications/slidev.md` § *Export: PDF, PNG, PPTX, MD, SPA* and § *PDF export via Playwright*. `docs/reference-applications/mdx-deck.md` § *Code patterns worth studying* / *`/print` route + Puppeteer*.

## Notes / decisions

- **Export lives in the CLI's self-contained `main.ts`, not `packages/core`.** The bin runs
  `main.ts` under Node's type-stripping, which can't resolve the workspace's `.js` import
  specifiers to `.ts` at runtime — so the CLI may only import bare (JS) deps. An initial
  `packages/core/src/export/` was written + removed once this surfaced; the pure helpers are
  re-exported from `main.ts` and unit-tested in the CLI package.
- **One render, then slice.** PDF renders the whole-deck `/print` page once (`page.pdf`,
  `preferCSSPageSize`), then pdf-lib keeps the `--range` pages / splits `--per-slide` — faster
  and more consistent than N navigations. `--with-toc` adds an outline via `@lillallol/outline-pdf`.
- **PNG uses embed pages.** Per-slide/-click PNGs navigate `/<deck>/<n>?embed=1[&step=k]` and
  screenshot `.as-viewport`; `--scale` is the device-pixel-ratio, `--with-clicks` reads the
  step count from `data-steps` in the DOM.
- **Embed mode is client-side.** Prerendered routes can't see `?embed=1` at build, so the
  runtime adds `.as-embed` from `location.search` and CSS hides the chrome.
- **`/` redirect + `404.html`.** A `/` index route redirects to the first slide; an
  `astro:build:done` hook copies `index.html`→`404.html` so refreshed deep links resolve on
  static hosts (GitHub Pages).
- **Playwright is an optional peer of the CLI** (large Chromium binary); lazy-imported with an
  actionable error if absent. `--executable-path` for BYO binaries / CI.
- **`data-waitfor`** selectors + `document.fonts.ready` gate each snapshot.

## Outcome

Shipped every web export format. `/print/[deck]` route (stacked, `@page`, all clicks revealed)
+ `?embed=1` minimal chrome + `/`→first-slide redirect + `404.html` SPA fallback. CLI `export`
(inline in the self-contained `main.ts`) builds → previews → drives headless Chromium: PDF
(one-piece / `--per-slide` via pdf-lib, `--with-toc`), PNG (per-slide / `--with-clicks`), and an
offline `html` zip (jszip); `listr2` progress; full Slidev-compatible flag set. Verified live:
3-page PDF from `--range 1-3`, valid PNG, 2.3 MB HTML bundle. Gates: typecheck clean, biome clean
(0 warnings), **241 unit** (+9), **27 e2e** (+4: print route, embed, `page.pdf`, PNG screenshot).
Distilled to `docs/built/12-export-web.md`.
