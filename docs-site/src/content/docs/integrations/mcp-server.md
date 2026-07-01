---
title: MCP server
description: Drive astro-slides decks from any MCP-aware AI agent — read, author, present, and export over the Model Context Protocol.
---

astro-slides ships a **first-class [Model Context Protocol](https://modelcontextprotocol.io) server** as a CLI subcommand. Any MCP-aware client — Claude Code, Cursor, Windsurf, Continue, or a custom agent — can connect to list, read, author, present, and export your decks. This is a real protocol server, not just a documentation bundle: the agent can actually *drive* the framework.

The decision to ship a server rather than only a skill bundle is recorded in [ADR-0009](https://github.com/jluterek/astro-slides/blob/main/docs/decisions/0009-mcp-server-first-class.md). The server is bundled from the CLI, so there is nothing extra to install once you have `astro-slides`.

## Running the server

The MCP server is the `mcp-server` subcommand. By default it speaks **stdio**, which is what local agents (Claude Code, Cursor, Windsurf, Continue) expect — they spawn the process and talk to it over stdin/stdout.

```bash
astro-slides mcp-server
```

You can point it at a specific project directory with a positional argument (defaults to the current working directory):

```bash
astro-slides mcp-server ./my-deck-project
```

### Streamable HTTP mode

For remote clients, switch the transport to **Streamable HTTP** (the MCP spec's modern HTTP transport, which replaces the deprecated SSE transport). WebSocket is not supported in v1.

```bash
astro-slides mcp-server --transport http --port 4444
```

The server listens on `http://127.0.0.1:4444/mcp` by default. Relevant flags:

| Flag | Default | Purpose |
| --- | --- | --- |
| `--transport <stdio\|http>` | `stdio` | Transport to serve. |
| `--host <host>` | `127.0.0.1` | HTTP bind host. |
| `--port <n>` | `4444` | HTTP port. |
| `--token <secret>` | — | Bearer token for HTTP auth (or `ASTRO_SLIDES_MCP_TOKEN`). |
| `--read-only` | `false` | Disable the write tools. |
| `--sync-gateway <url>` | — | Running dev-server sync gateway URL for the navigate tools. |
| `--sync-token <token>` | — | Token for the sync gateway. |

:::caution[Bearer token required off-loopback]
Loopback binds (`127.0.0.1`, `localhost`, `::1`) are open. Binding to a **non-loopback** host without a token is refused — you must pass `--token <secret>` (or set `ASTRO_SLIDES_MCP_TOKEN`). When a token is set it is enforced on loopback too. Clients send it as an `Authorization: Bearer <token>` header. OAuth 2.1 + PKCE is a documented follow-up; v1 uses a static bearer token.
:::

```bash
# Remote / networked: token is mandatory
astro-slides mcp-server --transport http --host 0.0.0.0 --port 4444 --token "$MY_SECRET"
```

## Tool surface

The server exposes 20 tools across five categories. Schemas are authored in Zod and described inline, so clients get self-documenting tool listings.

| Category | Tools |
| --- | --- |
| **Read** | `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`, `list_themes` |
| **Write** | `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme` |
| **Navigate** | `goto_slide`, `next_slide`, `prev_slide`, `set_step` |
| **Export** | `export_pdf`, `export_png`, `export_pptx`, `export_md` |
| **Capture** | `screenshot_slide` |

A few things worth knowing about how these behave:

- **Write tools are text-level.** The parser has no AST-to-source serializer, so writes slice the deck file into verbatim per-slide blocks and reserialize only the edited block — untouched slides stay byte-for-byte identical. Every mutation is reparse-verified against the expected slide count before it returns, so a write that would corrupt structure is refused. Whole files are written back, so a running dev server picks up changes via HMR.
- **`--read-only` drops the write tools** entirely, leaving only read/navigate/export/capture. Use it when you want an agent that can inspect and present but never mutate.
- **Navigate tools need a live sync gateway.** `goto_slide`, `next_slide`, `prev_slide`, and `set_step` drive a presented deck over a WebSocket to the Phase 11 sync gateway, which only runs under `astro-slides dev --remote`. Point the server at it with `--sync-gateway` (and `--sync-token` if the gateway is protected). Without a running gateway the navigate tools are inert.
- **Export and capture spawn the CLI**, reusing the same tested Playwright pipeline as `astro-slides export`.

:::note
`start_recording` / `stop_recording` are **not** exposed over MCP in v1 — recording is an interactive browser-capture action in the presenter view. This is a documented gap.
:::

## Configuring an MCP client

For a stdio client such as Claude Code, register the server as a command that spawns `astro-slides mcp-server` in your project directory:

```json
{
  "mcpServers": {
    "astro-slides": {
      "command": "astro-slides",
      "args": ["mcp-server", "."]
    }
  }
}
```

This is exactly the configuration shipped in the bundled Claude Code plugin (see below). Adjust the `args` path if your deck project lives elsewhere.

## Skill bundle & Claude Code plugin

For clients without MCP support — or to give an MCP agent richer grounding — astro-slides ships a **skill bundle** at the repo root: `skills/astro-slides/SKILL.md` plus eight per-feature reference documents (syntax, layouts, animations, code, math-and-diagrams, presenter-and-remote, export, mcp).

The repo root also carries a **Claude Code plugin** (`.claude-plugin/plugin.json` + `marketplace.json`) that bundles *both* the skill and the MCP server, so installing the plugin gives an agent the reference docs and a ready-wired `astro-slides mcp-server .` connection in one step.

:::tip
If your client supports MCP, prefer the server — the agent can actually read, author, and drive decks. The skill bundle is the fallback for context-only clients, and complements the server by teaching the agent the framework's authoring conventions.
:::

## Source

- `docs/decisions/0009-mcp-server-first-class.md` — the decision to ship an MCP server.
- `docs/built/14-mcp-server.md` — the distilled phase writeup.
- `packages/cli/src/main.ts` — the `mcp-server` subcommand and its flags.
- `packages/mcp-server/src/index.ts` — `runMcpServer` entry point.
- `packages/mcp-server/src/server.ts` — tool registration and the read-only gate.
- `packages/mcp-server/src/tools/{read,write,navigate,media}.ts` — the tool categories.
- `packages/mcp-server/src/transports.ts` — stdio + Streamable HTTP + the auth gate.
- `packages/mcp-server/src/write-engine.ts` — text-level write engine with reparse-verify.
- `skills/astro-slides/` — skill bundle (`SKILL.md` + eight references).
- `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — the Claude Code plugin.
