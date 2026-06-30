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
- [ ] **PDF (Playwright)**: `astro-slides export --format pdf` drives Playwright (from the project-scoped plugin) against the dev server. Both one-piece and `--per-slide` modes.
- [ ] **PNG**: `--format png` writes one image per slide. `--with-clicks` writes one image per click step.
- [ ] **SPA build**: `astro-slides build` produces a static SPA via Astro's build. Copies `index.html` to `404.html` for GitHub Pages.
- [ ] **Per-slide embeds**: each slide has a permanent URL and an embeddable variant (`<iframe>`-friendly minimal chrome).
- [ ] **HTML bundle**: a self-contained ZIP with all assets for offline presenting.
- [ ] **`data-waitfor` opt-in**: authors can declare `<div data-waitfor=".mermaid svg" />` so the exporter waits before snapshotting.
- [ ] CLI flags align with Slidev's for familiarity: `--range "1,3-5"`, `--dark`, `--with-clicks`, `--with-toc`, `--per-slide`, `--scale`, `--omit-background`.
- [ ] Tests cover: PDF byte-snapshot for a sample deck, PNG image-diff per slide, SPA build artifact integrity.

## Planned tasks

- `/print` route (stacks all slides, applies `@page`)
- Playwright export pipeline (one-piece + per-slide)
- PNG export via `page.screenshot()`
- SPA build configuration
- Per-slide embed pages
- HTML bundle zipper
- `data-waitfor` wait logic in exporter
- CLI flag set + documentation in `--help`
- Tests for each format

## Dependencies

- Phase 03 (Astro integration — the SPA build)
- Phase 04, 05, 06, 07, 08, 09 (everything must render correctly before we snapshot it)

## Notes

The in-browser export is the recommended default; Playwright is the high-fidelity fallback. We mirror Slidev's pattern but lead with the lighter path.

Reference: `docs/reference-applications/slidev.md` § *Export: PDF, PNG, PPTX, MD, SPA* and § *PDF export via Playwright*. `docs/reference-applications/mdx-deck.md` § *Code patterns worth studying* / *`/print` route + Puppeteer*.

`pdf-lib` for merging per-slide PDFs; `@lillallol/outline-pdf` for TOC outlines.

## Outcome

_Fill in when the phase closes._
