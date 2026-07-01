---
title: CLI
description: The astro-slides command reference — dev, build, export, and mcp-server.
---

The `astro-slides` CLI drives every stage of a deck's life: developing, building,
exporting, and serving the MCP server. Run it through pnpm (`pnpm astro-slides
<command>`) or via the `bin` if the package is installed globally.

```bash
astro-slides <command> [root] [flags]
```

Every command takes an optional positional `root` — the project directory. It
defaults to the current working directory.

## `dev`

Start the Astro dev server and watch the deck. Hot reload is scoped per slide.

```bash
astro-slides dev [root] [--remote[=<password>]]
```

| Flag | Description |
| --- | --- |
| `--remote` | Bind to `0.0.0.0` and stand up the mobile-remote sync gateway. The URL is open on your LAN — anyone with it can drive the deck. |
| `--remote=<password>` | Same, but derives an access token from the password so only holders of the tokenized URL can connect. |

With `--remote`, the CLI prints a QR code and the `/entry` URL a phone opens to
become a touch remote.

### In-TTY shortcuts

While `dev` is running in an interactive terminal, single keypresses trigger
actions. Press `?` to reprint the list.

| Key | Action |
| --- | --- |
| `r` | restart the dev server |
| `o` | open the deck in your browser |
| `e` | open the deck source in your editor |
| `c` | clear the console |
| `m` | toggle the MCP server |
| `q` | quit |
| `?` | show the shortcut list |

`Ctrl+C` also quits.

## `build`

Build the deck to static output via Astro's build. Produces a `dist/` directory
you can host anywhere (GitHub Pages, Netlify, etc.).

```bash
astro-slides build [root]
```

## `export`

Build the deck, start a preview server, and drive headless Chromium to render an
export. Supports PDF, PNG, editable PPTX, and an offline HTML bundle.

```bash
astro-slides export [root] --format <pdf|png|pptx|html> [flags]
```

:::caution[Playwright required]
Export drives Chromium through Playwright. Install it first:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```
:::

| Flag | Default | Description |
| --- | --- | --- |
| `--format <fmt>` | `pdf` | Output format: `pdf`, `png`, `pptx`, or `html`. |
| `--output <path>` | per-format | Output file or directory (see below). |
| `--range <spec>` | all slides | Subset of slides to include, e.g. `"1,3-5,8"`. |
| `--per-slide` | `false` | PDF: write one file per slide instead of one combined document. |
| `--with-clicks` | `false` | PNG: emit one image per click step, not just per slide. |
| `--with-toc` | `false` | PDF: add a document outline (bookmarks) from slide titles. |
| `--rasterize` | `false` | PPTX: rasterize every slide to a full-slide image instead of extracting editable shapes. |
| `--dark` | `false` | Force the dark color scheme. |
| `--scale <n>` | PNG DPR `2` | Render scale — PNG device-pixel-ratio / PDF page scale. |
| `--omit-background` | `false` | PNG: transparent background. |
| `--executable-path <path>` | bundled | Use a custom Chromium binary. |

**Output paths.** When `--output` is omitted, PDF writes `<deck>.pdf`, PPTX writes
`<deck>.pptx`, PNG writes into a `<deck>-png/` directory, and HTML writes
`dist.zip`. For `--per-slide` PDF the `--output` value is treated as a directory.

```bash
# Combined PDF of the whole deck
astro-slides export --format pdf --output talk.pdf

# One PNG per slide, only slides 1, 3-5 and 8, at 3x DPR
astro-slides export --format png --range "1,3-5,8" --scale 3

# Editable PowerPoint
astro-slides export --format pptx --output talk.pptx

# Offline HTML bundle (zipped dist/)
astro-slides export --format html --output talk.zip
```

:::note[`--range` syntax]
A range spec is a comma-separated list of 1-based slide numbers and `from-to`
ranges: `"1,3-5,8"` selects slides 1, 3, 4, 5, and 8. Values are sorted, deduped,
and clamped to the deck's bounds; reversed ranges (`5-3`) are normalized.
:::

## `mcp-server`

Run the astro-slides MCP server so an MCP-aware client (Claude Code, Cursor,
Windsurf, custom agents) can read, write, navigate, and export decks. Defaults to
stdio transport; use `--transport http` for Streamable HTTP.

```bash
astro-slides mcp-server [root] [--transport <stdio|http>] [flags]
```

| Flag | Default | Description |
| --- | --- | --- |
| `--transport <t>` | `stdio` | Transport: `stdio` or `http` (Streamable HTTP). |
| `--host <ip>` | `127.0.0.1` | Bind host (HTTP only). |
| `--port <n>` | `4444` | Port (HTTP only). |
| `--token <secret>` | — | Bearer token. Also read from `ASTRO_SLIDES_MCP_TOKEN`. Required for HTTP over a non-loopback host. |
| `--read-only` | `false` | Disable the write tools (read/navigate/export only). |
| `--sync-gateway <url>` | — | URL of a running `dev` sync gateway, so navigate tools can drive a live deck. |
| `--sync-token <token>` | — | Token for the sync gateway. |

```bash
# stdio (for a local agent that spawns the process)
astro-slides mcp-server

# HTTP with a bearer token
astro-slides mcp-server --transport http --port 4444 --token "$(openssl rand -hex 16)"
```

:::caution[Tokens over the network]
When serving HTTP on a non-loopback host, a token is required. Pass it with
`--token` or set `ASTRO_SLIDES_MCP_TOKEN`. Use `--read-only` to expose a
server that cannot modify deck source.
:::

## Source

- `packages/cli/src/main.ts` — every command, flag, and the in-TTY shortcut map (`SHORTCUTS`).
- `docs/architecture/cli.md` — the CLI surface design spec.
