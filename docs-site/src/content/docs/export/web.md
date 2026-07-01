---
title: Web export
description: Export to PDF, PNG, and an offline HTML bundle.
---

The `astro-slides export` command turns a deck into a shareable artifact. Three
web formats are supported — a single PDF, one PNG per slide, or a self-contained
offline HTML bundle — all driven by the same command:

```bash
astro-slides export --format pdf   # single PDF, one page per slide
astro-slides export --format png   # one image per slide
astro-slides export --format html  # offline SPA bundle (zip)
```

`--format` defaults to `pdf`. The command builds the deck, starts a preview
server, and (for PDF/PNG) drives a headless Chromium browser to render each
slide.

:::caution[Playwright is required for PDF and PNG]
PDF and PNG export drive headless Chromium through Playwright, which ships as an
**optional peer dependency** of the CLI — it is not installed by default. Before
your first PDF/PNG export, install it and download the browser:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

If Playwright is missing, the export fails with:

> Export needs Playwright. Install `@playwright/test` and run `playwright install chromium`.

HTML export does **not** need Playwright — it just zips the built site.
:::

## PDF

```bash
astro-slides export --format pdf
```

Produces a single PDF with **one page per slide**. Every click step is revealed,
so animated builds appear fully expanded in the output. The default file is
`<deck>.pdf` in the project directory.

Under the hood the PDF is rendered from the deck's `/print/<deck>` route (see
[The `/print` route](#the-print-route) below), which stacks all slides as
page-sized blocks, then sliced to the requested range with `pdf-lib`.

Useful PDF-only flags:

- `--with-toc` — add a PDF outline (bookmarks) built from slide titles.
- `--per-slide` — write one PDF file per slide instead of a single document. When
  set, `--output` is treated as a **directory**. Note that splitting drops
  cross-slide links.
- `--scale <n>` — render scale.

```bash
# A5-range PDF with a table of contents
astro-slides export --format pdf --range 1-10 --with-toc --output intro.pdf

# One PDF per slide into ./handout/
astro-slides export --format pdf --per-slide --output handout/
```

## PNG

```bash
astro-slides export --format png
```

Produces **one PNG image per slide**. Images are captured from each slide's
`?embed=1` page (chrome-free — see [`?embed=1`](#embed-mode)). The default output
is a `<deck>-png/` directory.

Useful PNG-only flags:

- `--with-clicks` — emit one image per click step, so animated builds export as a
  frame sequence.
- `--scale <n>` — device-pixel-ratio for the screenshots (default `2`, i.e. 2×
  resolution).
- `--omit-background` — transparent background instead of the deck background.

```bash
# High-res PNGs of slides 3-5, one frame per click step
astro-slides export --format png --range 3-5 --with-clicks --scale 3 --output frames/
```

## HTML

```bash
astro-slides export --format html
```

Zips the built `dist/` into a single offline HTML bundle (default `dist.zip`).
The bundle is a self-contained SPA — open `index.html` in a browser with no
server required. This format does not use Playwright.

```bash
astro-slides export --format html --output my-deck.zip
```

## Common flags

These apply across the web formats:

| Flag | Applies to | Purpose |
| --- | --- | --- |
| `--format <fmt>` | all | `pdf` \| `png` \| `html` (default `pdf`). |
| `--output <path>` | all | Output file (pdf / html / single pdf) or directory (png / `--per-slide` pdf). |
| `--range "1,3-5,8"` | pdf, png | Subset of slides to include (see below). |
| `--dark` | pdf, png | Force the dark color scheme. |
| `--executable-path <path>` | pdf, png | Use your own Chromium binary instead of Playwright's. |

### `--range`

`--range` accepts a Slidev-style spec: a comma-separated list of slide numbers
and inclusive ranges. Slides are 1-indexed. Out-of-bounds and duplicate entries
are ignored, and the result is sorted.

```bash
astro-slides export --format pdf --range "1,3-5,8"
```

Exports slides 1, 3, 4, 5, and 8.

## The `/print` route

Every deck exposes a `/print/<deck>` route that renders **all slides stacked as
page-sized blocks**, one per page, with **all click steps revealed**. This is the
page PDF export renders (once) before slicing to the requested range with
`pdf-lib`. It reuses the deck's own layouts and components, so the print output
matches the live deck. You can open it in a browser and use the browser's own
"Print → Save as PDF" as a manual alternative to the CLI.

## Embed mode

Appending `?embed=1` to a slide URL adds an `.as-embed` class that hides
presentation chrome (help overlay, status bar, drawing tools) while keeping the
slide navigable. PNG export screenshots these embed pages so exported images are
free of UI chrome. `?embed=1` is also handy for embedding a live slide in an
`<iframe>`.

:::note
`--dark` currently sets the `ASTRO_SLIDES_COLOR_SCHEME=dark` environment variable
for the build. Full dark-mode export depends on the theme reading that value, so
treat dark export as best-effort until your theme wires it up.
:::

## Source

- `packages/cli/src/main.ts` — the `export` command plus `parseRange`,
  `slideUrl`, `printUrl`, `discoverDecks`, `exportDeckPdf`, `exportDeckPng`, and
  `zipDirectory` (web-export pipeline is self-contained in the CLI).
- `packages/cli/package.json` — `@playwright/test` declared as an optional peer.
- `packages/core/src/routes/print.astro` — the stacked `/print/<deck>` page.
- `packages/client/src/styles/print.css` — page sizing + reveal-all-clicks.
- `packages/core/src/integration.ts` — `/`, `/print`, and the `404.html` build hook.
- `docs/built/12-export-web.md` — phase notes.
- `docs/architecture/cli.md` — full CLI flag surface.
