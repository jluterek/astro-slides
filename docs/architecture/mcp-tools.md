# MCP tool surface

- **Status:** shipped (Phase 14). See `docs/built/14-mcp-server.md` for what was built + descoped.
- **Owner phase:** Phase 14

> **Shipped deltas from this draft:** recording tools (`start_recording`/`stop_recording`) are
> descoped (interactive browser capture); write tools are **text-level** (splitter block
> slicing + reparse-verify), not AST serialization — the parser has no serializer; the schema
> pipeline authors Zod (frontmatter JSON Schema from Zod stays in `@astro-slides/types`). The
> server ships as a tsup-bundled package the CLI imports.

The complete MCP server contract: tools, transports, schemas, auth.

## Server identity

- **Name:** `astro-slides`
- **Version:** matches `@astro-slides/mcp-server` package version.
- **SDK:** `@modelcontextprotocol/sdk` (target v2.x when GA on 2026-07-28; v1.29 acceptable as bridge).

## Transports

| Transport | Default | When |
| --- | --- | --- |
| **stdio** | yes | Local clients (Claude Code, Cursor, Windsurf, Continue) spawn the server. No auth — process trust boundary. |
| **Streamable HTTP** | opt-in via `--transport http` | Network / remote clients. Replaces deprecated SSE per spec 2025-03-26. |

WebSocket is **not** in v1 — not in the official spec yet.

## Authentication

| Transport | Loopback (`127.0.0.1`) | Non-loopback |
| --- | --- | --- |
| stdio | n/a (no network) | n/a |
| Streamable HTTP | Allowed without token (configurable to require one) | Token required — bearer in `Authorization` header. Long-term: OAuth 2.1 + PKCE per MCP spec. v1 supports a static `--token` bearer; OAuth migration deferred. |

## Tools

The MCP server's tool surface. Schemas live in `packages/mcp-server/src/tools/<tool>.ts` and are Zod schemas (Standard Schema compliant) so the SDK can validate input. Tool descriptions on Zod `.describe()` become LLM-visible.

### Read

| Tool | Args | Returns |
| --- | --- | --- |
| `list_decks` | — | `{ decks: DeckSummary[] }` |
| `list_slides` | `{ deck: string }` | `{ slides: SlideSummary[] }` (no, title, layout, totalClicks) |
| `get_slide` | `{ deck: string, no: number }` | `{ slide: Slide }` — full AST + frontmatter + notes |
| `get_speaker_notes` | `{ deck: string, no: number }` | `{ notes: string }` (markdown) |
| `list_layouts` | — | `{ layouts: LayoutDescriptor[] }` |
| `list_themes` | — | `{ themes: ThemeDescriptor[] }` |

### Write

| Tool | Args | Returns |
| --- | --- | --- |
| `add_slide` | `{ deck: string, at?: number, content: string, frontmatter?: object }` | `{ slide: SlideSummary }` |
| `update_slide` | `{ deck: string, no: number, content?: string, frontmatter?: object }` | `{ slide: SlideSummary }` |
| `delete_slide` | `{ deck: string, no: number }` | `{ ok: true }` |
| `set_frontmatter` | `{ deck: string, no?: number, frontmatter: object }` | `{ slide?: SlideSummary, deck: DeckSummary }` |
| `set_theme` | `{ deck: string, theme: string }` | `{ deck: DeckSummary }` |

### Navigate

| Tool | Args | Returns |
| --- | --- | --- |
| `goto_slide` | `{ deck: string, no: number }` | `{ ok: true }` (drives via sharedState) |
| `next_slide` | `{ deck: string }` | `{ no: number }` |
| `prev_slide` | `{ deck: string }` | `{ no: number }` |
| `set_step` | `{ deck: string, no: number, step: number }` | `{ ok: true }` |

### Capture

| Tool | Args | Returns |
| --- | --- | --- |
| `screenshot_slide` | `{ deck: string, no: number, step?: number, format?: "png" \| "jpeg" }` | `{ path: string }` |
| `start_recording` | `{ kind: "screen" \| "camera" \| "both" }` | `{ id: string }` |
| `stop_recording` | `{ id: string }` | `{ path: string }` |

### Export

| Tool | Args | Returns |
| --- | --- | --- |
| `export_pdf` | `{ deck: string, output?: string, withClicks?: boolean, perSlide?: boolean, range?: string }` | `{ path: string }` |
| `export_pptx` | `{ deck: string, output?: string }` | `{ path: string }` |
| `export_png` | `{ deck: string, output?: string, withClicks?: boolean, range?: string }` | `{ paths: string[] }` |
| `export_md` | `{ deck: string, output?: string }` | `{ path: string }` |

## Concurrency / write model

- **Single writer:** the MCP server is the canonical writer when running. Multiple connected clients funnel writes through the server's queue.
- **File-level atomicity:** every write produces a complete new file (`fs.writeFile`), no partial states visible to file watchers.
- **No cross-client locking:** last write wins. Clients are expected to read before modifying. Future improvement: optimistic locking with a slide-level revision number.
- **HMR awareness:** writes go through the parser → AST → serialize cycle, then the file change triggers Astro/Vite HMR which the connected browser sees.

## Schema generation strategy

Per MCP research (June 2026): the SDK accepts Standard Schema (Zod, Valibot, ArkType). Our pipeline:

1. Tool args defined as Zod schemas (with `.describe()`).
2. Tool returns typed via TypeScript types in `@astro-slides/types`.
3. Frontmatter JSON Schema generated from the TS types via `ts-json-schema-generator` (build step) so VS Code IntelliSense works for authors.
4. The Zod schemas and TS types live side-by-side in `packages/mcp-server/src/tools/` — they're authored once; drift is impossible because they're the same source.

This amends ADR-0009's "schemas generated from TS types" — practically, **Zod is authored manually but matches TS types**, and frontmatter JSON Schema is a separate build-step derivation.

## Skill bundle (companion)

- Path: `skills/astro-slides/SKILL.md` + `skills/astro-slides/references/*.md`.
- Mirrors Slidev's structure (see `docs/reference-applications/slidev.md` § *MCP plugin (Claude Code)*).
- Shipped inside the `@astro-slides/cli` package via `package.json::files` so any client (including those without MCP support) can discover it.
- Also published as a Claude Code plugin via `.claude-plugin/marketplace.json`.

## Open questions

- Do we expose `start_recording` / `stop_recording` over stdio only, or also over HTTP? Recording requires the browser context — the MCP server can drive a Playwright instance, but that's heavy.
- Tool versioning: do tools carry their own `version` field for forward-compatibility?
- OAuth 2.1 + PKCE migration timing.

## Change history

- 2026-06-30 — initial spec, research-grounded (MCP SDK research from claude-code-guide agent).
