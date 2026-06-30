# 0009. Ship an MCP server, not just a skill bundle

- **Status:** accepted
- **Date:** 2026-06-30

## Context

AI integration in the reference field:

- **Skill bundle** (Slidev) — a `skills/slidev/SKILL.md` plus ~47 reference markdown files loaded into Claude Code as context. Documentation only — the AI reads about the framework but can't drive it.
- **VS Code language model tools** (Slidev) — `languageModelTools` in the VS Code extension expose `getActiveSlide`, `getSlideContent`, etc., to GitHub Copilot Chat. Effectively an MCP-shaped surface but locked to Copilot inside VS Code.
- **No AI integration** — every other framework.

No web deck framework ships a real MCP server. This is the biggest greenfield differentiator we have. Anthropic's MCP standard is the right interface — any MCP-aware client (Claude Code, Cursor, Windsurf, Continue, custom agents) can connect.

The pull is that AI authoring is now table stakes for new dev tooling. If you can't tell an agent "split this slide in two, move the chart to the right, and tighten the second bullet", you're behind.

## Decision

Ship a real MCP server as a CLI subcommand:

```bash
astro-slides mcp-server
```

Transports: **stdio** by default (for Claude Code, Cursor, Windsurf, Continue, which spawn the server). For remote clients, **Streamable HTTP** (the MCP spec's modern HTTP transport, which replaces deprecated SSE) via `@hono/mcp` or the SDK's `StreamableHTTPServerTransport`. WebSocket is **not** in v1 — not yet in the official MCP spec.

Library choices (research-verified June 2026):
- SDK: `@modelcontextprotocol/sdk` v1.29 currently, migrating to v2.0 when GA on 2026-07-28.
- HTTP server: `Hono` + `@hono/mcp`.
- Tool schemas: `Zod` v4 (Standard Schema compliant; SDK accepts directly).

Tool surface (initial set):

| Category | Tools |
| --- | --- |
| Read | `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`, `list_themes` |
| Write | `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme` |
| Navigate | `goto_slide`, `next_slide`, `prev_slide`, `set_step` |
| Capture | `screenshot_slide`, `start_recording`, `stop_recording` |
| Export | `export_pdf`, `export_pptx`, `export_png`, `export_md` |

Tool schemas are authored as **Zod definitions** that double as TypeScript type sources (Zod 4's inference + `z.toJSONSchema()`). The runtime types in `@astro-slides/types` and the MCP tool schemas are co-located in `packages/mcp-server/src/tools/`, so drift between the runtime contract and the MCP contract is impossible — they're literally the same declaration. Frontmatter JSON Schema is similarly generated from Zod for editor IntelliSense.

This amends an earlier framing of "schemas generated from TS types" — practically, **schemas are authored as Zod**, TypeScript types are *inferred from* Zod, and JSON Schema is *generated from* Zod. The directionality is `Zod → TS types → editor IntelliSense / runtime validation / MCP schemas`. This was research-verified: the MCP SDK accepts Standard Schema (Zod/Valibot/ArkType), not raw JSON Schema, and there is no native "TS interface → MCP tool schema" pipeline.

A **skill bundle** ships alongside (`skills/astro-slides/SKILL.md` + structured per-feature reference markdown) for clients without MCP support.

## Consequences

- Any MCP-aware client can author and drive decks. Claude Code, Cursor, Windsurf, Continue, custom agents — same interface.
- The MCP server can run alongside the Vite dev server during development, so AI edits are reflected via HMR (same Vite plugin layer that handles file watches).
- Tool contract never drifts from the runtime contract because both come from the same TS types.
- Trade-off: ongoing maintenance of the MCP tool surface as features evolve. Mitigated by keeping the tool list small and stable; new features go through new tool versions, not surface expansion.
- Trade-off: security model — an MCP client connected over the network can mutate decks. Mitigated by binding to localhost by default; remote/network MCP requires an explicit flag and an auth token. v1 supports a static bearer token (`--token <secret>` or `ASTRO_SLIDES_MCP_TOKEN`). **OAuth 2.1 + PKCE** is the MCP-spec-mandated approach for non-loopback Streamable HTTP — implementation is deferred to a follow-up because the spec, the SDK, and our threat model are still settling. Document the gap in `docs/built/14-mcp-server.md`.
