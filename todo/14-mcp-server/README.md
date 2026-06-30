---
title: Phase 14 — MCP server and skill bundle
status: pending
started:
ended:
---

## Goal

Ship the real MCP server promised by ADR-0009. A CLI subcommand `astro-slides mcp-server` exposes tools to any MCP-aware client (Claude Code, Cursor, Windsurf, Continue) over stdio and SSE/WebSocket. Tool definitions are generated from the TypeScript types we've been building all along — no parallel schema, no drift. A structured skill bundle ships alongside for clients without MCP support.

## Exit criteria

- [ ] `astro-slides mcp-server` CLI subcommand boots an MCP server on stdio by default.
- [ ] `--transport sse` and `--transport ws` switch to network transports; `--port` and `--host` configurable.
- [ ] Network transports require a token (`--token` or `ASTRO_SLIDES_MCP_TOKEN` env) by default; localhost stdio is unrestricted.
- [ ] Tool surface implemented (minimum set):
  - **Read:** `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`, `list_themes`
  - **Write:** `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme`
  - **Navigate:** `goto_slide`, `next_slide`, `prev_slide`, `set_step`
  - **Capture:** `screenshot_slide`, `start_recording`, `stop_recording`
  - **Export:** `export_pdf`, `export_pptx`, `export_png`, `export_md`
- [ ] Tool schemas generated from `packages/types/` so the surface stays in sync with the runtime.
- [ ] Write tools update files via the parser's serialization path; HMR picks the changes up live in the dev server.
- [ ] Skill bundle at `skills/astro-slides/SKILL.md` plus per-feature reference markdown in `skills/astro-slides/references/`.
- [ ] `.claude-plugin/` plugin manifest + marketplace manifest (so the skill is installable as a Claude Code plugin).
- [ ] E2E test: spawn the MCP server, run through a representative tool sequence (list → get → update → next).

## Planned tasks

- MCP server scaffold using Anthropic's MCP SDK
- Tool type system (`SlidesAction` / `SlidesQuery` discriminated unions)
- Tool implementations (one task per tool category)
- TS-types-to-MCP-schema generator
- Stdio transport
- SSE / WebSocket transport
- Auth token gate for network transports
- Skill bundle: SKILL.md + structured references covering syntax, layouts, animations, code, math/diagrams, presenter, export
- Claude Code plugin manifest
- E2E test with a synthetic MCP client

## Dependencies

- All earlier phases — the MCP server is the AI-facing skin over everything we've built.

## Notes

This is the AI-native differentiator. Slidev ships only a skill bundle + VS Code language-model tools; we go further with a real MCP server. See `docs/decisions/0009-mcp-server-first-class.md`.

The skill bundle drafts can be modeled on Slidev's at `reference-applications/slidev/skills/slidev/SKILL.md` and its `references/` directory — same structure, our content.

Security: localhost stdio is trusted; network transports require an explicit token. Document the threat model in the *Outcome*.

## Outcome

_Fill in when the phase closes._
