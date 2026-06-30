# CLI surface

- **Status:** draft
- **Owner phase:** Phase 03 onwards (each phase adds its command)

The complete `astro-slides` command surface. Each subcommand maps to one or more phases.

## Subcommands

| Command | Phase | Purpose |
| --- | --- | --- |
| `astro-slides dev [entry]` | 03 | Start the Vite dev server with our Astro integration loaded. |
| `astro-slides build [entry]` | 12 | Static SPA build via Astro's build. Copies `index.html` to `404.html` for GH Pages SPA mode. |
| `astro-slides export [entry] --format <fmt>` | 12, 13 | Export to PDF / PNG / PPTX / MD. |
| `astro-slides mcp-server` | 14 | Start the MCP server on stdio (default) or Streamable HTTP (`--transport http`). |
| `astro-slides init [target]` | 17 | Scaffold a new deck project (delegates to `create-astro-slides`). |
| `astro-slides format [entry]` | 17 | Format the deck source via the parser's normalize→serialize round trip. |

## Global flags

- `--config <path>` — explicit Astro config path.
- `--log <level>` — `silent | error | warn | info | debug`. Default `info`.
- `--no-color` — disable colored output.
- `--version`, `--help`.

## Per-command flags

### `dev`

- `--port <n>` (default 3030)
- `--open` — open the browser on start
- `--host <ip>` — defaults to `127.0.0.1`; pass `0.0.0.0` for LAN
- `--remote [password]` — alias for `--host 0.0.0.0` and starts the mobile-remote WebSocket gateway (Phase 11). Optional shared-secret password.
- `--force` — clear Vite cache before starting

### `build`

- `--out <dir>` (default `dist`)
- `--base <path>` (default `/`)

### `export`

- `--format pdf | png | pptx | md` (required)
- `--output <path>` (default `<cwd>/exports/<deck>.<ext>`)
- `--range "1,3-5,8"` — subset of slides
- `--with-clicks` — emit per-click-step frames
- `--with-toc` — include outline in PDF
- `--per-slide` — Playwright-driven per-slide pipeline (PDF only)
- `--scale <n>` — output scale (PNG/PDF)
- `--dark` — force dark color scheme
- `--omit-background` — transparent background where supported
- `--executable-path <path>` — Playwright Chromium override

### `mcp-server`

- `--transport stdio | http` (default `stdio`)
- `--port <n>` (default 4444) — `http` only
- `--host <ip>` (default `127.0.0.1`) — `http` only
- `--token <secret>` — required for `http` over non-loopback (per ADR-0009 + Phase 14 research)
- `--read-only` — disable write tools

### `init`

- `--template <name>` — scaffolder template (default `minimal`)
- `--theme <name>` — preselect theme

## In-TTY shortcuts (during `dev`)

| Key | Action |
| --- | --- |
| `r` | restart the dev server |
| `o` | open the deck URL in the default browser |
| `e` | edit the entry in `$EDITOR` |
| `q` / `Ctrl+C` | quit |
| `c` | print the LAN URL + QR (when `--remote`) |
| `m` | toggle the MCP server alongside dev |
| `?` | show this list |

## Open questions

- Should `astro-slides dev` also start the MCP server by default (with `--no-mcp` to opt out)? Probably yes for the AI-first experience, but it adds resource cost.
- Multi-deck workspaces: does `dev [entry]` accept a directory and serve all decks, or one entry per invocation?

## Change history

- 2026-06-30 — initial spec (Phase 01 prep).
