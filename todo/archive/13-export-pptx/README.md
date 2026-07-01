---
title: Phase 13 — Export to PPTX
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Implement editable PPTX export per ADR-0007: map the slide AST to PptxGenJS API calls so users get a real `.pptx` with editable text frames, tables, and charts — not just a slideshow of images. Fall back to image-rasterized PPTX per slide for content that can't be expressed in OOXML.

## Exit criteria

- [x] `astro-slides export --format pptx` produces a structurally valid `.pptx` (well-formed OOXML: `presentation.xml` + one `slide<N>.xml` + `notesSlide<N>.xml` per slide). Verified live against `examples/minimal`.
- [x] Mapping coverage: headings, paragraphs, lists, code blocks (rasterized), images, tables, hyperlinks (on text runs), speaker notes. _Basic standalone shapes not mapped — see loose ends._
- [x] Per-slide fallback flag: `exportAs: image` frontmatter (and a deck-wide `--rasterize`) rasterize a slide to a full-slide image.
- [x] Coordinate translation: design-pixel bounding rects → inches (`pxToIn`) → EMU (`inToEmu`), unit-tested.
- [~] Theme colors mapped per-shape via `parseCssColor`; a full `--slide-*` token → OOXML **theme palette** mapping (needs forking theme XML) is descoped. Gaps documented in `docs/built/13-export-pptx.md`.
- [ ] ~~Embedded Excel for charts~~ — descoped: no chart primitive in the deck format yet, nothing to map. Deferred until a chart component exists.
- [~] Snapshot tests: extraction is DOM-based (the parser AST is unreachable at CLI runtime), so the pure mapper is tested against a **fake slide recorder** (`SlideModel` → recorded PptxGenJS calls) rather than "AST → calls".
- [~] Round-trip structural integrity asserted via a **valid-zip test** (`buildDeckPptx` → JSZip → assert parts) instead of a headless-LibreOffice CI smoke test (descoped `soffice` in CI).

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

### Decisions made while building

- **Extract from the rendered DOM, not the parser AST.** The planned `packages/cli/src/exporters/pptx/` layout assumed the exporter walks the slide AST. It can't: the CLI bin runs `main.ts` under Node type-stripping and cannot import workspace-TS packages at runtime (the wall Phase 12 hit). So the exporter reads the *rendered* slide via `page.evaluate` (`DOM_WALKER`) — headings/paragraphs → text, lists → bullets, tables → native tables, images inlined as data URLs; code + `exportAs: image` → screenshots. All export code is inline in `main.ts`; the pure `buildPptxSlide`/`buildDeckPptx` mapper is exported for tests.
- **Speaker notes are embedded in the deck route** as an `as-notes-data` JSON script (parser AST unreachable at runtime), read from the DOM by the exporter.
- **Per-shape colors, not a document theme.** `parseCssColor` normalizes computed colors onto shapes; the OOXML theme palette isn't authored (would require forking theme XML).
- **DOM lib added to `cli/tsconfig.json`** so the in-browser walker type-checks; wrapped in `/* c8 ignore */` (never runs under coverage).

## Outcome

Shipped editable PPTX export via PptxGenJS v4, driven by rendered-DOM extraction rather than the AST (runtime constraint). `astro-slides export --format pptx` emits a structurally valid `.pptx` with text frames, lists, tables, images, hyperlinks, and speaker notes; code blocks and `exportAs: image` / `--rasterize` slides fall back to full-slide screenshots. Coordinate translation (design-px → in → EMU), CSS-color parsing, the pure mapper, and a valid-zip structural check are unit-tested (+9, 250 total); an e2e (+1, 28 total) asserts the DOM surface the exporter reads. Descoped from the original plan: embedded-Excel charts (no chart primitive yet), a full theme-palette mapping, and a headless-LibreOffice CI smoke test. Distilled to `docs/built/13-export-pptx.md`. All gates green (typecheck, Biome, 250 unit, 28 e2e); merged via PR #13.
