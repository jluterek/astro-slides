---
title: Phase 12 — Export (PDF, PNG, SPA, embeds)
status: pending
started:
ended:
---

## Goal

Ship every web-format export: PDF (browser-native print first, Playwright fallback), PNG (per-slide and per-click), standalone HTML bundles, the SPA build, and embeddable single-slide pages. PPTX is Phase 13.

## Exit criteria

- [ ] **PDF (in-browser)**: a `/print` route renders every slide stacked into one document with `@page` sized to the deck's aspect ratio. `window.print()` produces a usable PDF.
- [ ] **PDF (Playwright)**: `astro-slides export --format pdf` drives Playwright (already installed at project scope) against the dev server. Both one-piece and `--per-slide` modes.
- [ ] **PNG**: `--format png` writes one image per slide. `--with-clicks` writes one image per click step.
- [ ] **SPA build**: `astro-slides build` produces a static SPA via Astro's build. Copies `index.html` to `404.html` for GitHub Pages.
- [ ] **Per-slide embeds**: each slide has a permanent URL and an embeddable variant (`<iframe>`-friendly minimal chrome via a `?embed=1` query).
- [ ] **HTML bundle**: a self-contained ZIP with all assets for offline presenting.
- [ ] **`data-waitfor` opt-in**: authors can declare `<div data-waitfor=".mermaid svg" />` so the exporter waits before snapshotting.
- [ ] CLI flags align with Slidev's for familiarity: `--range "1,3-5"`, `--dark`, `--with-clicks`, `--with-toc`, `--per-slide`, `--scale`, `--omit-background`.
- [ ] Tests cover: PDF byte-snapshot for a sample deck, PNG image-diff per slide, SPA build artifact integrity, embed iframe layout.

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

## Outcome

_Fill in when the phase closes._
