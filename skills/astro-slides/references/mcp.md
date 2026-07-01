# MCP server

astro-slides ships a first-class Model Context Protocol server so any MCP-aware client
(Claude Code, Cursor, Windsurf, Continue, custom agents) can read, author, present, and
export decks through tools instead of editing files blind.

## Starting the server

```bash
# stdio (default) — how local clients spawn it
astro-slides mcp-server [project-dir]

# Streamable HTTP — for network / remote clients
astro-slides mcp-server . --transport http --host 127.0.0.1 --port 4444

# publish-only: read + present + export, no authoring
astro-slides mcp-server . --read-only
```

Register it with a client the usual way — for Claude Code, add it to `.mcp.json`:

```json
{
  "mcpServers": {
    "astro-slides": { "command": "astro-slides", "args": ["mcp-server", "."] }
  }
}
```

## Transports & auth

- **stdio** (default): local clients spawn the process; the OS process boundary is the trust
  boundary, so no token.
- **Streamable HTTP** (`--transport http`): replaces the deprecated SSE transport. Loopback
  (`127.0.0.1`) binds without a token; a **non-loopback host requires a bearer token** via
  `--token <secret>` or the `ASTRO_SLIDES_MCP_TOKEN` env var (sent as
  `Authorization: Bearer <secret>`). OAuth 2.1 + PKCE is a deferred follow-up.

## Tool surface

Deck ids come from `list_decks`; slide numbers are **1-based**. Read a slide before editing it.

### Read

| Tool | Args | Returns |
| --- | --- | --- |
| `list_decks` | — | decks with title, slide count, summaries |
| `list_slides` | `deck` | per-slide summaries (no, title, layout, click steps) |
| `get_slide` | `deck`, `no` | full slide: frontmatter, content, notes, layout |
| `get_speaker_notes` | `deck`, `no` | the slide's notes (Markdown) |
| `list_layouts` | — | built-in + project layouts |
| `list_themes` | — | built-in + project themes |

### Write (omitted under `--read-only`)

| Tool | Args | Effect |
| --- | --- | --- |
| `add_slide` | `deck`, `content`, `frontmatter?`, `at?` | insert a slide (append, or before `at`) |
| `update_slide` | `deck`, `no`, `content?`, `frontmatter?` | replace body / merge frontmatter |
| `delete_slide` | `deck`, `no` | remove a slide |
| `set_frontmatter` | `deck`, `frontmatter`, `no?` | merge into a slide, or deck headmatter |
| `set_theme` | `deck`, `theme` | set the deck's theme |

Writes go through a single-writer queue and rewrite the whole deck file, so the dev server's
HMR picks the change up live. Untouched slides keep their formatting byte-for-byte; only the
edited slide is reserialized.

### Navigate (drives a live presentation)

`goto_slide`, `next_slide`, `prev_slide`, `set_step` — these require a running dev server with
its sync gateway (`astro-slides dev --remote`), passed to the MCP server via `--sync-gateway`
(and `--sync-token` if the gateway is password-protected). Without a gateway they return a
clear "no running presentation" error.

### Export & capture

`export_pdf`, `export_png`, `export_pptx`, `export_md`, `screenshot_slide` — these spawn the
CLI's export pipeline (Playwright). `export_*` accept `output` and format-specific flags
(`withClicks`, `perSlide`, `range`, `rasterize`). Playwright must be installed for the
PDF/PNG/PPTX/screenshot paths.

## Typical agent flow

```
list_decks → list_slides(deck) → get_slide(deck, n)   # understand
update_slide(deck, n, {content})                        # edit
list_slides(deck)                                       # confirm
export_pdf(deck)                                        # deliver
```

## Not in v1

- **Recording tools** (`start_recording`/`stop_recording`) — recording is an interactive
  presenter-view action (browser capture), not exposed over MCP in v1.
- **OAuth 2.1 + PKCE** for non-loopback HTTP — bearer token only for now.
