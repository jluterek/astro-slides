---
title: Phase 13 — Export to PPTX
status: pending
started:
ended:
---

## Goal

Implement editable PPTX export per ADR-0007: map the slide AST to PptxGenJS API calls so users get a real `.pptx` with editable text frames, tables, and charts — not just a slideshow of images. Fall back to image-rasterized PPTX per slide for content that can't be expressed in OOXML.

## Exit criteria

- [ ] `astro-slides export --format pptx` produces a `.pptx` that opens cleanly in PowerPoint, Keynote, LibreOffice Impress, and Google Slides (via import).
- [ ] Mapping coverage: headings, paragraphs, lists, code blocks (rasterized — code highlighting doesn't survive natively), images, tables, basic shapes, hyperlinks, speaker notes.
- [ ] Theme colors and fonts mapped to OOXML theme palette where possible; documented gaps captured in `docs/built/13-export-pptx.md`.
- [ ] Per-slide fallback flag: a slide can opt into image rasterization via frontmatter (`exportAs: image`) when its content can't be expressed editable.
- [ ] Coordinate translation: our viewport (CSS px) → OOXML EMU correctly.
- [ ] Embedded Excel for charts so PowerPoint's "Edit in Excel" works.
- [ ] Snapshot tests: known input AST → expected PptxGenJS calls.
- [ ] Round-trip smoke test: export → open in headless LibreOffice → assert basic structural integrity.

## Planned tasks

- AST → PptxGenJS mapper (`packages/cli/src/exporters/pptx.ts`)
- Coordinate translation utilities (px ↔ EMU, accounting for deck dimensions)
- Theme → OOXML color/font mapping
- Per-element mappers: text, list, code, image, table, shape, link, notes
- Image-rasterization fallback per slide (use the PNG path from Phase 12)
- Chart mapper (with embedded Excel data)
- Fidelity-gap documentation (what doesn't survive, with screenshots)
- Snapshot tests

## Dependencies

- Phase 12 (export-web — image fallback uses the same PNG capture path)
- All earlier phases must produce a stable AST (this exporter consumes it)

## Notes

PptxGenJS docs and gaps are captured in `docs/reference-applications/PptxGenJS.md`. Key constraints to expect:
- No animation/transition API in OOXML — we drop them, documented.
- Theme palette beyond fonts requires forking the theme XML. May need an upstream contribution or a fork-and-patch.
- Placeholders for images aren't fully supported in PptxGenJS — workaround uses absolute positioning.

We accept the fidelity gaps because editable PPTX is the differentiator vs. image-only competitors.

## Outcome

_Fill in when the phase closes._
