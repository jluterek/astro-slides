---
title: Phase 14 — MCP server and skill bundle
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Ship the real MCP server promised by ADR-0009 (amended after research). A CLI subcommand `astro-slides mcp-server` exposes tools over **stdio** (default) and **Streamable HTTP** (for remote clients). Tool schemas are authored as Zod (Standard Schema compliant); TypeScript types are *inferred from* Zod, and JSON Schemas are *generated from* Zod for editor IntelliSense and frontmatter validation. A structured skill bundle ships alongside for clients without MCP support.

## Exit criteria

- [x] `astro-slides mcp-server` CLI subcommand boots an MCP server on stdio by default.
- [x] `--transport http` switches to Streamable HTTP; `--port` and `--host` configurable.
- [x] Non-loopback HTTP requires a static bearer token (`--token` or `ASTRO_SLIDES_MCP_TOKEN` env). OAuth 2.1 + PKCE deferred to a follow-up (gap documented).
- [~] Tool surface implemented per `docs/architecture/mcp-tools.md` — **all except recording**:
  - **Read:** `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`, `list_themes` ✅
  - **Write:** `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme` ✅
  - **Navigate:** `goto_slide`, `next_slide`, `prev_slide`, `set_step` ✅ (need a live `dev --remote` gateway)
  - **Capture:** `screenshot_slide` ✅; ~~`start_recording`, `stop_recording`~~ descoped (interactive browser capture, not MCP-exposable in v1)
  - **Export:** `export_pdf`, `export_pptx`, `export_png`, `export_md` ✅ (spawn the CLI pipeline)
- [x] Tool schemas authored as Zod with `.describe()` for LLM-visible field descriptions.
- [x] `--read-only` flag disables write tools (for "publishing" the deck to an MCP audience without authoring).
- [x] Write tools update files (whole-file writes → HMR picks up). **Text-level** edits via the splitter with reparse-verify — the parser has no AST serializer, so we don't round-trip through it (documented).
- [x] Skill bundle at `skills/astro-slides/SKILL.md` plus per-feature reference markdown in `skills/astro-slides/references/` (8 references).
- [x] `.claude-plugin/` plugin manifest + marketplace manifest (installable as a Claude Code plugin).
- [x] E2E test: an in-process MCP client (real SDK `Client` ↔ real server over `InMemoryTransport`) runs list → get → add → update → delete → set_theme, with disk writes asserted. The subprocess/HTTP path was verified live (not in CI — needs the tsup bundle built).

## Locked decisions

- **MCP SDK:** `@modelcontextprotocol/sdk`. Target v2.x if GA at phase start (2026-07-28); v1.29 acceptable as bridge.
- **Transports:** stdio (default) + Streamable HTTP. **No SSE** (deprecated). **No WebSocket** (not in spec).
- **HTTP server:** `Hono` v4.12+ with `@hono/mcp` v0.3+ for Streamable HTTP. Server can be shared with Phase 11's mobile-remote gateway.
- **Schema language:** `Zod` v4+. SDK accepts directly via Standard Schema. JSON Schema generation via Zod 4's built-in `z.toJSONSchema()` (or `zod-to-json-schema` for v1.x SDK).
- **TS types inferred from Zod schemas** (not the other way around). The `@astro-slides/types` package re-exports `z.infer<typeof X>` types.
- **Frontmatter JSON Schema** generated from Zod at build time, published as `@astro-slides/types/schemas/frontmatter.json`.
- **Single-writer concurrency:** the MCP server is the canonical writer when running. Writes funnel through a queue; last-write-wins for v1. CRDT collab is a post-v1 path.
- **Auth (v1):** static bearer token via `--token`/env var. OAuth 2.1 + PKCE deferred.
- **Skill bundle structure:** modeled on Slidev's at `reference-applications/slidev/skills/slidev/`. Our content, their organization.

## Tasks (planned)

- MCP server scaffold (`packages/mcp-server/src/index.ts`) using `@modelcontextprotocol/sdk`
- Tool Zod schema definitions (one file per tool category in `packages/mcp-server/src/tools/`)
- Tool implementations dispatching to parser + runtime
- TS type inference from Zod (in `@astro-slides/types`)
- Zod → JSON Schema build script for frontmatter
- Stdio transport wiring
- Streamable HTTP transport via `@hono/mcp` (shared Hono server with Phase 11)
- Bearer token auth gate for non-loopback HTTP
- `--read-only` mode
- Write-path: AST mutation → serialize → file write → HMR picks up
- Skill bundle: SKILL.md + structured references covering syntax, layouts, animations, code, math/diagrams, presenter, export
- Claude Code plugin manifest (`.claude-plugin/`)
- E2E test with a synthetic MCP client

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Server scaffold + Zod schema design | first |
| After schemas | **Tool implementations** — each tool category is independent (5 categories → 5 parallel agents) |
| Stdio transport + HTTP transport | parallel after scaffold |
| Auth gate | after HTTP transport |
| Skill bundle authoring | parallel — 8 reference markdown files possible |
| E2E test | after a usable subset of tools exists |

## Dependencies

- All earlier phases — the MCP server is the AI-facing skin over everything we've built.

## Risks

- **MCP SDK v1 → v2 transition.** v2.0 GA is 2026-07-28. We may need to ship against v1.29 and migrate. Both supported during a 6-month window post-v2.
- **OAuth 2.1 + PKCE complexity.** Implementing the full spec is a non-trivial effort. v1 ships with bearer-token auth; users who need OAuth wait for the follow-up phase. Document the gap.
- **Standard Schema versioning.** Zod 4 has breaking changes vs Zod 3. Start fresh; don't try to share with codebases pinned to Zod 3.
- **Write tool concurrency.** Two MCP clients connected simultaneously may race. Single-writer queue mitigates, but document the model.
- **Streamable HTTP spec stability.** The spec was rev'd in 2025-03; further changes possible. Monitor.

## Notes

This is the AI-native differentiator. See `docs/decisions/0009-mcp-server-first-class.md` and `docs/architecture/mcp-tools.md` for the full spec.

The skill bundle isn't busywork — see `docs/reference-applications/slidev.md` § *MCP plugin (Claude Code)* for what Slidev shipped (~47 reference markdown files). We do similar but cover our richer feature set.

### Decisions made while building

- **The server is a tsup-bundled package the CLI `import()`s, not inline code.** The CLI runs type-stripped and can't import workspace TS (the parser) at runtime — the same wall the export pipeline hit. tsup bundles the workspace deps (`@astro-slides/parser`, `@astro-slides/types`) into one plain-JS `dist/index.js`; `tsc` emits only the `.d.ts` (`emitDeclarationOnly`, different extension → no collision). A root `pnpm build` produces the bundle; CI's typecheck job runs it. Verified live: `mcp-server --transport http` boots the bundle and answers `initialize`.
- **Writes are text-level, not AST-serialized.** No AST→source serializer exists; a faithful MDX one is out of scope. The write engine slices the source into verbatim per-slide blocks by the splitter's `startLine` boundaries (so `join("\n")` reconstructs the file byte-for-byte), reserializes only the edited block, and **reparse-verifies** the result's slide count before returning — a malformed edit throws instead of corrupting the deck.
- **Navigate tools are a WS client to the Phase 11 sync gateway** (`/__astro-slides/sync?deck=&token=`), sending `{type:"goto",no,step}`; `next`/`prev` do a `hello`→`state` round-trip. Best-effort — requires `dev --remote`.
- **Export/capture spawn the CLI** (reusing the tested Phase 12/13 pipeline) rather than re-implementing Playwright inside the server; the MCP server is handed the CLI's own bin path.
- **Recording descoped**; **skill bundle lives at repo root** (`.claude-plugin/` + `skills/`) as a Claude Code plugin rather than inside the CLI package.

## Outcome

Shipped a first-class MCP server (`@astro-slides/mcp-server`, bundled by tsup so the type-stripped CLI can import it) exposing 20 tools — read/write/navigate/export/capture — over stdio and Streamable HTTP, with bearer-token auth off-loopback and a `--read-only` mode. Write tools edit deck files at the text level (verbatim block slicing + reparse-verify, since the parser has no serializer) so untouched slides stay byte-identical and HMR sees the change. A companion Claude Code skill bundle (`SKILL.md` + 8 references, grounded in the `docs/built/` distillations) plus `.claude-plugin/` manifests make it installable. Tool schemas are Zod with `.describe()`. Descoped: recording tools (interactive browser capture), OAuth 2.1 + PKCE, and a subprocess MCP test in CI (the in-process client e2e covers the protocol; the subprocess/HTTP path was verified live). **283 unit tests** (+33) and **28 e2e** green; typecheck + Biome clean; the tsup bundle builds. Distilled to `docs/built/14-mcp-server.md`; merged via PR #14.
