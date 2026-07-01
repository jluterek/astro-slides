---
phase: 14-mcp-server
status: distilled
distilled: 2026-07-01
---

# Phase 14 — MCP server & skill bundle

The AI-native surface (ADR-0009): a real Model Context Protocol server shipped from the CLI
(`astro-slides mcp-server`) plus a Claude Code skill bundle. Any MCP client can list, read,
author, present, and export decks. Archived task notes: `todo/archive/14-mcp-server/`.

## What shipped

**`@astro-slides/mcp-server`** — a real package (was a skeleton), bundled by **tsup**
- 20 tools across five categories, schemas authored as **Zod** with `.describe()`:
  - **Read** — `list_decks`, `list_slides`, `get_slide`, `get_speaker_notes`, `list_layouts`,
    `list_themes` (parse deck files from disk via the parser).
  - **Write** — `add_slide`, `update_slide`, `delete_slide`, `set_frontmatter`, `set_theme`
    (text-level edits through a single-writer queue; whole-file writes so HMR sees them).
  - **Navigate** — `goto_slide`, `next_slide`, `prev_slide`, `set_step` (WS client to the
    Phase 11 sync gateway; needs `dev --remote`).
  - **Export/Capture** — `export_pdf`, `export_png`, `export_pptx`, `export_md`,
    `screenshot_slide` (spawn the CLI's tested Playwright pipeline).
- Transports: **stdio** (default) and **Streamable HTTP** via `@hono/mcp` on
  `@hono/node-server`. Non-loopback HTTP requires a bearer token (`--token` /
  `ASTRO_SLIDES_MCP_TOKEN`); loopback is open. `--read-only` omits the write tools.

**CLI wiring** — `packages/cli/src/main.ts`
- The `mcp-server` subcommand dynamically `import()`s the bundled `@astro-slides/mcp-server`
  and calls `runMcpServer`, passing its own bin path so export/capture tools re-spawn the CLI.

**Write engine** — `packages/mcp-server/src/write-engine.ts`
- The parser has no AST→source serializer, so writes are **text-level**: `splitSlides`'
  `startLine` boundaries slice the source into verbatim per-slide blocks whose `join("\n")`
  reconstructs the file byte-for-byte. Only the edited block is reserialized (via `yaml`);
  every mutation is **reparse-verified** against an expected slide count before it's returned.

**Skill bundle** — `skills/astro-slides/` + `.claude-plugin/`
- `SKILL.md` + eight references (syntax, layouts, animations, code, math-and-diagrams,
  presenter-and-remote, export, mcp). A repo-root `.claude-plugin/plugin.json` +
  `marketplace.json` make it installable as a Claude Code plugin (skill + MCP server).

## How to navigate the result

- `packages/mcp-server/src/index.ts` — `runMcpServer` entry + public re-exports.
- `packages/mcp-server/src/server.ts` — `createDeckServer` (registers tools; read-only gate).
- `packages/mcp-server/src/tools/{read,write,navigate,media}.ts` — the tool categories.
- `packages/mcp-server/src/transports.ts` — stdio + Streamable HTTP + the auth gate.
- `packages/mcp-server/src/write-engine.ts` / `deck-loader.ts` / `discovery.ts` — the guts.
- `packages/mcp-server/src/__tests__/` — write-engine, in-process client e2e, helper tests.
- `packages/cli/src/main.ts` (`mcpServerCommand`) — the CLI subcommand.
- `skills/astro-slides/` + `.claude-plugin/` — the skill bundle + plugin.

## Key decisions

- **The server is a bundled package the CLI imports, not inline code.** The CLI runs
  type-stripped and can't import workspace TS (the parser). tsup bundles the workspace deps
  into one plain-JS `dist/index.js` the CLI can `import()`; `tsc` emits only the `.d.ts`
  (`emitDeclarationOnly`, different extension → no collision). Verified: the bundle loads and
  the live `mcp-server --transport http` responds to `initialize`.
- **Writes are text-level with reparse-verify, not AST serialization.** No serializer exists;
  building a faithful MDX one is out of scope. Verbatim block slicing keeps untouched slides
  byte-identical; the count check refuses any edit that would corrupt structure.
- **Auth follows the loopback trust boundary.** stdio has none (process boundary); HTTP is
  open on loopback but demands a bearer token off-loopback. OAuth 2.1 + PKCE deferred.
- **Export/capture spawn the CLI**, reusing the tested Phase 12/13 pipeline rather than
  re-implementing Playwright orchestration inside the server.
- **Skill bundle grounded in `docs/built/`.** The eight references were authored from the
  distilled phase docs; component/layout names were cross-checked against the real set.

## What surprised us

- **The SDK isn't hoisted.** pnpm keeps `@modelcontextprotocol/sdk` / `@hono/mcp` under the
  package, so probing their APIs meant resolving through `node_modules/.pnpm`. The SDK's
  `registerTool` takes a **ZodRawShape** `inputSchema` (an object of validators), not a
  `z.object`, and its default export lives at `server/mcp.js`.
- **`exactOptionalPropertyTypes` vs. optional passthrough.** Options like `cliBin`/`token`
  can't be set to an explicit `undefined`; they're conditionally spread instead.

## Loose ends (descoped from the plan)

- **Recording tools** (`start_recording`/`stop_recording`) — recording is an interactive
  browser-capture action in the presenter view, not exposed over MCP in v1. Documented.
- **OAuth 2.1 + PKCE** — bearer token only for non-loopback HTTP; OAuth is a follow-up.
- **Navigate tools need a live gateway** (`dev --remote`) and are best-effort — the WS URL +
  action shape are unit-tested, but the round-trip isn't exercised in CI (needs a running
  server). `next`/`prev` do a `hello`→`state` round-trip to learn the current slide.
- **Frontmatter JSON-Schema-from-Zod build step** wasn't added here (the tool schemas are
  Zod; the separate frontmatter schema lives in `@astro-slides/types`).
- **No subprocess MCP test in CI.** The in-process client e2e (real SDK `Client` ↔ real
  server over `InMemoryTransport`, real file writes) covers the protocol; the subprocess/HTTP
  path was verified live but isn't in CI (it needs the tsup bundle built first).
- **Write model is last-write-wins** within a single-writer queue; no cross-client locking.

## Stats

New `@astro-slides/mcp-server` package (~1000 lines): deck-loader, write-engine, discovery,
context, four tool modules, server factory, transports, index. CLI `mcpServerCommand`. Skill
bundle: `SKILL.md` + 8 references (~1200 lines) + 2 plugin manifests. Deps:
`@modelcontextprotocol/sdk` v1.29, `@hono/mcp` v0.3, `yaml` (mcp-server). Build: tsup bundle
(`pnpm build`), added to CI's typecheck job. **283 unit tests** (+33: write-engine round-trip
& ops, in-process client e2e across the tool surface, transport/auth/discovery helpers) + **28
Playwright e2e**. Verified live: the CLI `mcp-server --transport http` boots the bundle and
answers `initialize` with the correct server identity + tool capabilities.

---

**Workflow:** Created at phase close, before `todo/14-mcp-server/` moved to `todo/archive/`.
See `todo/README.md` § *Completing a phase*.
