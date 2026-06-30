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

## Locked decisions

- **PPTX engine:** `PptxGenJS` v4+. Direct dependency.
- **Coordinate space:** CSS pixels → EMU (`914400 EMU per inch`, slide width 1920 px = 20 in default). Wrapper utility in `packages/cli/src/exporters/pptx/units.ts`.
- **Fallback path:** image rasterization uses the same PNG capture pipeline from Phase 12 — call it directly when `exportAs: image` is set or when an element type isn't natively expressible.
- **Theme palette mapping:** map our `--slide-*` tokens to OOXML theme colors at export time. Fonts pass through. Document the gaps (gradients beyond 2-stop linear/radial, CSS filters, etc.).
- **Chart embedding:** use PptxGenJS's chart API with embedded Excel data so PowerPoint's "Edit in Excel" works.
- **Progress UI:** `listr2`.

## Tasks (planned)

- AST → PptxGenJS mapper (`packages/cli/src/exporters/pptx/index.ts`)
- Coordinate translation utilities (`units.ts`)
- Theme → OOXML color/font mapping (`theme.ts`)
- Per-element mappers — **independent files, parallel-friendly:**
  - `text.ts` (heading, paragraph, list)
  - `code.ts` (rasterized via image fallback)
  - `image.ts`
  - `table.ts` (with auto-paging)
  - `shape.ts` (basic shapes, hyperlinks)
  - `chart.ts` (with embedded Excel)
  - `notes.ts` (speaker notes)
- Image-rasterization fallback per slide (uses Phase 12 PNG capture)
- Fidelity-gap documentation (what doesn't survive, with screenshots)
- Snapshot tests
- LibreOffice headless smoke test (CI)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Coordinate utils + theme mapper | first |
| **Per-element mappers (text, code, image, table, shape, chart, notes)** | **highly parallel** — seven independent files |
| AST walker that dispatches to mappers | after all mappers exist |
| Image-rasterization fallback | parallel with mappers |
| Snapshot tests + LibreOffice smoke | parallel with mappers |

## Dependencies

- Phase 12 (export-web — image fallback uses the same PNG capture path)
- All earlier phases must produce a stable AST (this exporter consumes it)

## Risks

- **PptxGenJS string-concat XML internally.** Typos in property names produce malformed XML and PowerPoint's "needs repair" dialog. Mitigation: snapshot tests on every mapper output.
- **PptxGenJS theme palette gap.** Theme palette beyond fonts requires forking OOXML theme XML. Document; consider upstream PR.
- **Image placeholders only partially supported** (text placeholders work; image placeholders incomplete). Workaround: absolute positioning.
- **LibreOffice headless dependency in CI:** install in the GitHub Action or skip the smoke test for fast runs.

## Notes

Full PptxGenJS API surface is in `docs/reference-applications/PptxGenJS.md`. The mapping is mostly mechanical for text/image/table/chart; the complexity is in edge cases (CSS-only effects, web components, animations don't survive — these become image fallbacks).

## Outcome

_Fill in when the phase closes._
