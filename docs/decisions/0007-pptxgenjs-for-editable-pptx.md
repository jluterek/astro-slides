# 0007. PptxGenJS for editable PPTX export

- **Status:** accepted
- **Date:** 2026-06-30

## Context

PPTX export options:

- **PptxGenJS** — pure code-to-`.pptx` generator. Real OOXML. Editable text, editable tables, editable charts. One runtime dep (JSZip). Active (v4.0.1, 2025-06). First-class TypeScript types (2,679-line `.d.ts`).
- **Image-rasterized PPTX** (Slidev's `genPagePptx`, Marp's `--pptx`) — each slide becomes a PNG, embedded as a slide background. Fast to implement, faithful pixel rendering. But the output isn't editable — opening in PowerPoint and trying to fix a typo means rebuilding from source.
- **No PPTX export** — skip the feature. Lose the audience that needs to hand a deck off to a colleague using PowerPoint.

The "editable" path matters because a common workflow is "I make slides in astro-slides, my coworker tweaks them in PowerPoint before presenting." That requires real OOXML text frames, not an image-of-a-slide.

PptxGenJS does have honest limitations:
- No animation API — animations and slide-level transitions don't survive.
- Theme palette beyond fonts requires forking the OOXML theme XML.
- Limited placeholder support (text only; image placeholders incomplete).
- No vector / SVG embedding fidelity — SVG passes through and PowerPoint rasterizes.

See `/Users/jluterek/code/jluterek/slides/docs/reference-applications/PptxGenJS.md` for the full surface and weakness inventory.

## Decision

- **Direct runtime dependency on PptxGenJS** for our PPTX exporter.
- Map our slide AST to PptxGenJS API calls in `packages/cli/src/exporters/pptx.ts` (or similar).
- **Fall back to image-rasterized PPTX per slide** for content that can't be expressed in OOXML (CSS-only effects, web components, embedded interactive demos, slides exceeding OOXML's expressivity).
- **Document fidelity gaps prominently** in the user-facing export docs.

## Consequences

- Users get a `.pptx` that's truly editable in PowerPoint / Keynote / LibreOffice / Google Slides.
- The AST → PptxGenJS mapping is mechanical for most slide constructs (text, images, tables, charts, basic shapes).
- We will likely contribute upstream or fork-and-patch for theme palette control, which we need for design-token-driven decks.
- Trade-off: animations, transitions, CSS effects, web components do not survive. We tell users this up front and offer per-slide image rasterization as the escape valve.
- Trade-off: ongoing maintenance of the AST-to-PptxGenJS mapping. Bundled into a dedicated phase.
- Trade-off: PptxGenJS uses string-concat XML internally — typos in property names produce malformed XML and PowerPoint's "needs repair" dialog. We mitigate with snapshot tests on the exporter output.
