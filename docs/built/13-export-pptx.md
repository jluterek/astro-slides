---
phase: 13-export-pptx
status: distilled
distilled: 2026-07-01
---

# Phase 13 — PPTX export (editable OOXML, image fallback)

`astro-slides export --format pptx` produces a real, editable `.pptx` — text frames, lists,
tables, and images as native OOXML shapes, with speaker notes — plus a per-slide image
fallback (`exportAs: image` frontmatter or `--rasterize`). Engine is PptxGenJS (ADR-0007).
Archived task notes: `todo/archive/13-export-pptx/`.

## What shipped

**PPTX export** — inline in `packages/cli/src/main.ts` (PPTX section)
- `astro-slides export --format pptx` builds the deck, starts `astro preview`, drives headless
  Chromium (`listr2` progress), and writes `<deck>.pptx`.
- **Editable path** — per slide, a browser-side DOM walker (`DOM_WALKER`, run via
  `page.evaluate`) reads the rendered slide into a serializable model: headings/paragraphs →
  text frames, `ul`/`ol` → bulleted lists (with indent level), `table` → native tables, `img`
  → images (inlined as data URLs). Positions come from bounding rects in **design pixels**,
  converted to inches via `pxToIn` (→ EMU under the hood).
- **Rasterized path** — code blocks (Shiki highlighting doesn't survive as OOXML text) are
  screenshotted per `.as-code` locator and placed as images; a whole slide rasterizes to a
  full-slide image when it sets `exportAs: image` or the run passes `--rasterize`.
- **Speaker notes** — embedded per slide in the deck route as an `as-notes-data` JSON script
  (the exporter has no parser AST at runtime), read from the DOM and attached via `addNotes`.
- **Slide geometry** — design size (`data-design-width/height`) read once fixes the slide
  aspect; width pinned to 13.333in (16:9 widescreen), height derived from the design ratio.

**Deck-route surface** — `packages/core/src/routes/slide.astro`
- Added the `as-notes-data` JSON payload and `data-export-as="image"` per-section attribute —
  the two hooks the exporter reads from the rendered page.

**Pure mapper** — `buildPptxSlide` / `buildDeckPptx` in `main.ts`
- `SlideModel` → PptxGenJS calls is pure over a minimal `PptxSlideLike` slide interface, so
  it's unit-tested against a fake recorder. `buildDeckPptx` defines a custom `DECK` layout and
  writes a `nodebuffer`.

## How to navigate the result

- `packages/cli/src/main.ts` (PPTX section) — `pxToIn`/`inToEmu`/`parseCssColor` units+color,
  the `PptxRun`/`PptxElement`/`SlideModel` types, `buildPptxSlide`/`buildDeckPptx` mapper,
  `DOM_WALKER`, and `exportDeckPptx` (extraction + rasterization + wiring).
- `packages/core/src/routes/slide.astro` — `as-notes-data` payload + `data-export-as`.
- `packages/cli/src/__tests__/pptx.test.ts` — unit conversions, color parsing, the mapper
  against a fake slide, and a valid-zip structural check.
- `e2e/export.spec.ts` — asserts the DOM surface (design dims + notes JSON) the exporter reads.

## Key decisions

- **Extract from the rendered DOM, not the AST.** ADR-0007 and the phase plan assumed the
  exporter walks the parser AST. But the CLI runs `main.ts` under Node type-stripping and
  **cannot import workspace-TS packages at runtime** (the same wall Phase 12 hit) — so the
  parser AST is unreachable. Instead the exporter reads the *rendered* slide via
  `page.evaluate`. Upside: it maps exactly what the audience sees, including layout primitives
  and theme CSS. Trade-off: it sees computed DOM, not source semantics.
- **Design-pixel rects → inches → EMU.** One conversion (`pxToIn`) maps every bounding rect
  onto the slide; font sizes convert px→in→pt (`*72`, floored at 6pt). PptxGenJS handles EMU.
- **Code + opt-in slides rasterize.** Shiki's token spans don't round-trip to editable OOXML
  runs, so code blocks become images; `exportAs: image` / `--rasterize` rasterize a whole slide.
- **Pure mapper, faked slide.** `buildPptxSlide` touches only a 4-method `PptxSlideLike`, so
  mapping is unit-tested by recording calls — no real PptxGenJS instance, no file I/O.
- **PptxGenJS default-export is a class+namespace merge.** Constructed via
  `((mod.default ?? mod)) as unknown as new () => PptxApp` behind a narrow `PptxApp` interface.

## What surprised us

- **DOM lib in a Node package.** The walker uses `document`/`HTMLElement`, so
  `packages/cli/tsconfig.json` adds `"DOM", "DOM.Iterable"` to `lib` — the walker is typed
  against the browser even though the CLI runs in Node. `/* c8 ignore */` around it since it
  never executes under coverage.
- **PptxGenJS constructs malformed XML silently.** A wrong property name yields a "needs
  repair" file, not an error — hence the structural valid-zip test (asserts
  `ppt/presentation.xml`, N `slide<N>.xml`, N `notesSlide<N>.xml`).

## Loose ends (descoped from the plan)

- **No embedded-Excel charts.** The plan wanted PptxGenJS's chart API with editable Excel data;
  no chart primitive exists in the deck format yet, so there's nothing to map. Deferred until a
  chart component lands.
- **Theme → OOXML palette mapping is minimal.** `parseCssColor` normalizes colors for shapes;
  a full `--slide-*` token → OOXML theme-palette mapping (which needs forking theme XML) is not
  done. Colors are per-shape, not a document theme.
- **No LibreOffice headless CI smoke test.** Structural validity is asserted via the zip test +
  live export instead; adding `soffice` to CI was out of scope for this pass.
- **Snapshot tests are call-shape, not AST-driven.** Since extraction is DOM-based, the mapper
  is tested by recording PptxGenJS calls from a `SlideModel`, not "known AST → expected calls".
- **Basic shapes / hyperlink-only mapping** beyond inline text-run links isn't wired — links
  ride on text runs (`hyperlink`), but standalone shapes aren't extracted.

## Stats

PPTX export (~440 lines) inline in `cli/src/main.ts`: units/color, element types, the pure
`buildPptxSlide`/`buildDeckPptx` mapper, the in-browser `DOM_WALKER`, and `exportDeckPptx`.
Deck-route hooks (`as-notes-data`, `data-export-as`) in `slide.astro`. `cli/tsconfig.json` gains
the DOM lib. Dep: `pptxgenjs` v4 (CLI). **250 unit tests** (+9: px→in / in→EMU, CSS-color parse,
mapper-against-fake, valid-zip structure) + **28 Playwright e2e** (+1: exporter DOM surface).
Verified live against `examples/minimal`: 3-slide editable `.pptx` (text + 3 `notesSlide` parts)
and a 2-slide `--rasterize` `.pptx` (full-slide PNGs in `ppt/media/`).

---

**Workflow:** Created at phase close, before `todo/13-export-pptx/` moved to `todo/archive/`.
See `todo/README.md` § *Completing a phase*.
