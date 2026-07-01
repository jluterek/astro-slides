---
title: PowerPoint export
description: Export to editable PPTX.
---

`astro-slides export --format pptx` produces a **real, editable PowerPoint file**
— not a deck of slide screenshots. Text is real text frames, lists are real
bullets, tables are native tables, and speaker notes carry over. Your colleague
can open the `.pptx` in PowerPoint, Keynote, LibreOffice, or Google Slides and
edit it directly.

```bash
astro-slides export --format pptx
```

The default output file is `<deck>.pptx` in the project directory. Use
`--output` to choose a path:

```bash
astro-slides export --format pptx --output quarterly-review.pptx
```

The exporter is built on [PptxGenJS](https://gitbrent.github.io/PptxGenJS/), which
writes genuine OOXML. See [ADR-0007](https://github.com/jluterek/astro-slides/blob/main/docs/decisions/0007-pptxgenjs-for-editable-pptx.md) for the rationale behind
choosing editable OOXML over rasterized slides.

:::caution[Playwright is required]
Like PDF and PNG export, PPTX export drives headless Chromium through Playwright,
an **optional peer dependency** of the CLI. Install it before your first export:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```
:::

## What maps to editable shapes

The exporter reads each **rendered** slide and maps its content to native OOXML
shapes:

| Slide content | Becomes |
| --- | --- |
| Headings and paragraphs | Editable text frames |
| `ul` / `ol` lists | Native bulleted lists (with indent levels) |
| Tables | Native, editable tables |
| Images | Inlined images (embedded as data URLs) |
| Inline links | Text-run hyperlinks |
| Speaker notes | The slide's Notes pane |

Positions and font sizes are derived from each element's on-screen rectangle, so
the layout of the exported slide follows what the deck actually renders.

## What falls back to a screenshot

Some content can't be expressed as editable OOXML. Those pieces are rasterized —
captured as an image and placed on the slide:

- **Code blocks** — syntax highlighting doesn't round-trip to OOXML text runs, so
  each code block is screenshotted and placed as an image.
- **Slides marked `exportAs: image`** — the whole slide is rasterized (see below).
- **Every slide, when `--rasterize` is passed** — see below.

### `--rasterize`

Rasterize **every** slide to a full-slide image. Use this when editability
doesn't matter and you want pixel-faithful reproduction of custom CSS, web
components, or effects that OOXML can't represent:

```bash
astro-slides export --format pptx --rasterize
```

### Per-slide `exportAs: image`

To rasterize a **single** slide while keeping the rest editable, set
`exportAs: image` in that slide's frontmatter:

```markdown
---
exportAs: image
---

# This slide is rendered as a picture

Because it uses a custom animation OOXML can't represent.
```

## Other flags

PPTX honors the shared export flags:

- `--range "1,3-5,8"` — export a subset of slides (Slidev-style spec, 1-indexed).
- `--output <path>` — output `.pptx` path (default `<deck>.pptx`).
- `--dark` — force the dark color scheme.
- `--executable-path <path>` — bring your own Chromium binary.

```bash
astro-slides export --format pptx --range 1-10 --output deck.pptx
```

## Setting expectations

:::note[Editable, not pixel-perfect]
The goal is a `.pptx` you can *edit*, not a byte-for-byte visual clone. Text
reflows, positions are approximated from the rendered layout, and screenshotted
content (code blocks, rasterized slides) won't be editable. If you need exact
visual fidelity over editability, use `--rasterize` or export to
[PDF/PNG](/export/web/) instead.
:::

Out of scope for the current exporter:

- **Charts** — no embedded-Excel chart mapping (there's no chart primitive in the
  deck format yet).
- **Theme palette** — colors are applied per-shape; there's no full design-token
  → OOXML document-theme palette mapping.
- **Animations and slide transitions** — these do not survive the OOXML round trip.

## Source

- `packages/cli/src/main.ts` (PPTX section) — `pxToIn` / `inToEmu` /
  `parseCssColor`, the `PptxRun` / `PptxElement` / `SlideModel` types,
  `buildPptxSlide` / `buildDeckPptx` mapper, the in-browser `DOM_WALKER`, and
  `exportDeckPptx`.
- `packages/core/src/routes/slide.astro` — the `as-notes-data` speaker-notes
  payload and per-slide `data-export-as="image"` attribute the exporter reads.
- `packages/cli/package.json` — `@playwright/test` declared as an optional peer.
- `docs/decisions/0007-pptxgenjs-for-editable-pptx.md` — the editable-OOXML decision.
- `docs/built/13-export-pptx.md` — phase notes.
- `docs/architecture/cli.md` — full CLI flag surface.
