# Export

`astro-slides export [entry] --format <fmt>` builds the deck, previews it, and drives headless Chromium to produce PDF, PNG, offline HTML, or editable PPTX output.

## How it works

The `export` command runs `astro build`, starts `astro preview`, and drives headless Chromium against the prerendered pages:

- **PDF** renders the `/print/<deck>` page (all slides stacked, all click steps revealed).
- **PNG / PPTX** navigate per-slide embed pages and read/screenshot each rendered slide.
- **HTML** just zips the built `dist/` — no browser render needed.

Every snapshot waits on `document.fonts.ready` and any `data-waitfor` selectors before capturing.

### Playwright is an optional peer

Chromium is driven through Playwright, which is an **optional peer dependency** of the CLI (it's a large binary, so it isn't bundled). If it isn't installed, the command prints an actionable install message. Install it, or point at your own browser binary with `--executable-path`.

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

## Shared flags

These apply across formats (see per-format notes for exceptions):

- `--output <path>` — output location. A **file** for one-piece PDF, the HTML zip, or PPTX; a **directory** for PNG and `--per-slide` PDF.
- `--range "1,3-5,8"` — export only a subset of slides.
- `--dark` — force the dark color scheme.
- `--scale <n>` — PDF scale, or PNG device-pixel-ratio (PNG DPR defaults to 2).
- `--executable-path <path>` — bring-your-own Chromium binary instead of Playwright's download.

> Note: `--dark` currently sets an env var (`ASTRO_SLIDES_COLOR_SCHEME`) but the theme doesn't yet fully read it at build time, so dark export is best-effort until the theme wires it up.

## PDF (default)

Engine: Playwright `page.pdf` + pdf-lib. The whole `/print` page renders once (`preferCSSPageSize`, page size from the deck's aspect ratio), then pdf-lib keeps the `--range` pages and writes one document — or splits per slide.

```bash
# Whole deck to one PDF
astro-slides export slides.mdx --format pdf --output deck.pdf

# A slide subset
astro-slides export slides.mdx --format pdf --range "1,3-5" --output subset.pdf
```

PDF-only flags:

- `--with-toc` — add a PDF outline (bookmarks) built from slide titles.
- `--per-slide` — write one PDF file per slide (split from the single render). `--output` is treated as a directory.

```bash
# Table-of-contents outline
astro-slides export slides.mdx --format pdf --with-toc --output deck.pdf

# One file per slide into a directory
astro-slides export slides.mdx --format pdf --per-slide --output pdfs/
```

> `--per-slide` PDFs lose cross-slide links (a documented trade-off of splitting).

## PNG

Screenshots each slide's `.as-viewport` from its `?embed=1` page. PNG is **always per-slide** — output is a directory. (`--per-slide` is a PDF-only flag; it does nothing here.)

```bash
# One PNG per slide
astro-slides export slides.mdx --format png --output pngs/
```

PNG-only flags:

- `--with-clicks` — emit one frame per click step (reads the step count from `data-steps`, navigating `?embed=1&step=k`).
- `--scale <n>` — device-pixel-ratio for the screenshot (default 2).
- `--omit-background` — transparent background.

```bash
# Per-click-step frames at 3x DPR, transparent background
astro-slides export slides.mdx --format png \
  --with-clicks --scale 3 --omit-background --output pngs/
```

## HTML

Zips the built `dist/` SPA into a single offline bundle (jszip). No Chromium render — this is the static build packaged for handoff. `--output` is the zip file.

```bash
astro-slides export slides.mdx --format html --output deck.zip
```

The SPA build includes a `/` → first-slide redirect and copies `index.html` to `404.html`, so refreshed deep links resolve when hosted (e.g. GitHub Pages).

## PPTX

Engine: PptxGenJS (v4). Produces a **real, editable** `.pptx` — native OOXML shapes, not just images. Per slide, a browser-side DOM walker reads the rendered slide into a model:

- headings / paragraphs → text frames
- `ul` / `ol` → bulleted lists (with indent level)
- `table` → native tables
- `img` → images (inlined as data URLs)
- inline links → text-run hyperlinks

Positions come from bounding rects in design pixels, converted to inches then EMU. Slide width is pinned to 13.333in (16:9), height derived from the deck's design ratio.

```bash
astro-slides export slides.mdx --format pptx --output deck.pptx
```

**Speaker notes** are carried over: they ride an `as-notes-data` JSON script embedded in the slide route and are attached to each slide.

### What rasterizes (image fallback)

Some content can't round-trip to editable OOXML text and becomes an image instead:

- **Code blocks** are always screenshotted (Shiki's token spans don't survive as OOXML runs) and placed as images.
- A **whole slide** rasterizes to a single full-slide image when either:
  - the run passes `--rasterize` (rasterize every slide), or
  - a slide's frontmatter sets `exportAs: image` (opt in per slide).

```yaml
---
exportAs: image
---
```

```bash
# Force every slide to a full-slide image
astro-slides export slides.mdx --format pptx --rasterize --output deck.pptx
```

### PPTX limitations

- No embedded-Excel charts (no chart primitive exists in the deck format yet).
- Theme → OOXML palette mapping is minimal; colors are applied per-shape, not as a document theme.
- Standalone shapes aren't extracted — links only ride on text runs.

## Format quick reference

| `--format` | Engine | `--output` is | Notable flags |
| --- | --- | --- | --- |
| `pdf` (default) | Playwright + pdf-lib | file (or dir with `--per-slide`) | `--with-toc`, `--per-slide` |
| `png` | Playwright screenshots | directory | `--with-clicks`, `--scale`, `--omit-background` |
| `html` | jszip | file (zip) | — |
| `pptx` | PptxGenJS | file | `--rasterize` (+ `exportAs: image` frontmatter) |

All formats also accept `--output`, `--range`, `--dark`, and `--executable-path`.
