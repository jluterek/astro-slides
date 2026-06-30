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

Transports: **stdio** (for Claude Code, Cursor, Windsurf, Continue) and **SSE** / **WebSocket** (for remote / web-based MCP clients) — same tool surface, different transport.

Tool surface (initial set):

| Category | Tools |
| --- | --- |
| Read | `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`, `list_themes` |
| Write | `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme` |
| Navigate | `goto_slide`, `next_slide`, `prev_slide`, `set_step` |
| Capture | `screenshot_slide`, `start_recording`, `stop_recording` |
| Export | `export_pdf`, `export_pptx`, `export_png`, `export_md` |

Tool definitions are **generated from TypeScript types** (see ADR-0003) — the same `SlidesAction` / `SlidesQuery` types that the runtime uses. The MCP layer is a transport for those types, not a parallel schema.

A **skill bundle** ships alongside (`skills/astro-slides/SKILL.md` + structured per-feature reference markdown) for clients without MCP support.

## Consequences

- Any MCP-aware client can author and drive decks. Claude Code, Cursor, Windsurf, Continue, custom agents — same interface.
- The MCP server can run alongside the Vite dev server during development, so AI edits are reflected via HMR (same Vite plugin layer that handles file watches).
- Tool contract never drifts from the runtime contract because both come from the same TS types.
- Trade-off: ongoing maintenance of the MCP tool surface as features evolve. Mitigated by keeping the tool list small and stable; new features go through new tool versions, not surface expansion.
- Trade-off: security model — an MCP client connected over the network can mutate decks. Mitigated by binding to localhost by default; remote/network MCP requires an explicit flag and an auth token.
