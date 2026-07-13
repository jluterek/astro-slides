# Roadmap

The phase index. Always current. Update when a phase starts or ends.

## Active

_No phase is active._

## Planned

Phases are listed in dependency order. They can be re-sequenced if a later phase becomes a higher priority, but dependencies must be honored.

_Nothing further sketched. Post-19 candidates: VS Code extension; the deliberate 1.0.0 cut._

## Done

| # | Phase | Distilled summary |
| --- | --- | --- |
| 01 | `01-foundation` | [`docs/built/01-foundation.md`](../docs/built/01-foundation.md) — monorepo, strict TS, Biome, Vitest, Husky, CI (closed 2026-06-30) |
| 02 | `02-parser` | [`docs/built/02-parser.md`](../docs/built/02-parser.md) — MDX/MD → typed slide AST; Zod frontmatter; parser package (closed 2026-06-30) |
| 03 | `03-astro-integration` | [`docs/built/03-astro-integration.md`](../docs/built/03-astro-integration.md) — Astro integration, virtual modules, per-slide routes, CLI, demo (closed 2026-06-30) |
| 04 | `04-runtime-core` | [`docs/built/04-runtime-core.md`](../docs/built/04-runtime-core.md) — in-browser runtime: state machine, navigation, URL/keyboard/touch, scaling, overview, Playwright e2e (closed 2026-06-30) |
| 05 | `05-themes-and-layouts` | [`docs/built/05-themes-and-layouts.md`](../docs/built/05-themes-and-layouts.md) — 21 layouts, 8 primitives, `--slide-*` tokens + starter theme, layered layout resolver, unplugin-icons (closed 2026-06-30) |
| 06 | `06-click-model` | [`docs/built/06-click-model.md`](../docs/built/06-click-model.md) — MDX+React foundation (slides compile as MDX); parse-time `<Click>`/`<After>`/`<Clicks>` resolution; runtime stepping (closed 2026-06-30) |
| 07 | `07-transitions` | [`docs/built/07-transitions.md`](../docs/built/07-transitions.md) — CSS slide transitions + `<Morph>` object continuity; same-document VTA (single-page runtime) with reveal.js-style FLIP fallback (closed 2026-07-01) |
| 08 | `08-code-rendering` | [`docs/built/08-code-rendering.md`](../docs/built/08-code-rendering.md) — build-time Shiki highlighting (dual themes), static + click-stepped line highlight, `<<<` snippet imports, Twoslash, Magic Move (closed 2026-07-01) |
| 09 | `09-math-and-diagrams` | [`docs/built/09-math-and-diagrams.md`](../docs/built/09-math-and-diagrams.md) — build-time KaTeX (inline/block/stepped via remark-math), lazy Shadow-DOM Mermaid, PlantUML server images; conditional inclusion (closed 2026-07-01) |
| 10 | `10-presenter-mode` | [`docs/built/10-presenter-mode.md`](../docs/built/10-presenter-mode.md) — presenter view (3 panes, next-preview, notes, timer), BroadcastChannel sync, blackout, cmdk palette (closed 2026-07-01) |
| 11 | `11-drawing-and-recording` | [`docs/built/11-drawing-and-recording.md`](../docs/built/11-drawing-and-recording.md) — drauu drawing overlay + laser, RecordRTC capture, Hono/WebSocket sync gateway + `/entry` phone remote, `--remote` QR (closed 2026-07-01) |
| 12 | `12-export-web` | [`docs/built/12-export-web.md`](../docs/built/12-export-web.md) — `/print` route + `@page` PDF, Playwright `export` (PDF/PNG/HTML), `?embed=1` pages, SPA `/` redirect + `404.html` (closed 2026-07-01) |
| 13 | `13-export-pptx` | [`docs/built/13-export-pptx.md`](../docs/built/13-export-pptx.md) — editable PPTX via PptxGenJS from rendered-DOM extraction (text/lists/tables/images/notes), code + `exportAs:image`/`--rasterize` fallback (closed 2026-07-01) |
| 14 | `14-mcp-server` | [`docs/built/14-mcp-server.md`](../docs/built/14-mcp-server.md) — first-class MCP server (`astro-slides mcp-server`): 20 read/write/navigate/export tools, stdio + Streamable HTTP + bearer auth, tsup-bundled package, text-level write engine, Claude Code skill bundle (closed 2026-07-01) |
| 15 | `15-marp-slidev-compatibility` | [`docs/built/15-marp-slidev-compatibility.md`](../docs/built/15-marp-slidev-compatibility.md) — `v-click` remark aliases, Marp image shorthand (`![bg]`/`![w:N]`), 6 Slidev component shims, 3 Marp theme ports; documented gaps (closed 2026-07-01) |
| 16 | `16-default-theme` | [`docs/built/16-default-theme.md`](../docs/built/16-default-theme.md) — "Cosmic" flagship theme (oklch dark/light palette, self-hosted Space Grotesk + Inter, 8px rhythm, FlexBlock cards, CSS starfield) + theme-by-name switching via `[data-theme]` scoping (closed 2026-07-01) |
| 17 | `17-docs-and-examples` | [`docs/built/17-docs-and-examples.md`](../docs/built/17-docs-and-examples.md) — Starlight docs site (17 source-linked pages, GH Pages workflow), 4 new example decks, `create-astro-slides` scaffolder, wired `dev` in-TTY shortcuts, CI apps job (closed 2026-07-01) |
| 19 | `19-audience-engagement` | [`docs/built/19-audience-engagement.md`](../docs/built/19-audience-engagement.md) — live polls (`<Poll>`, one revisable vote/device, persisted), `/audience` QR page with server-side role scoping, Q&A moderation panel + on-deck banner, reactions overlay; fixed the Phase 11 gateway/Vite-HMR upgrade conflict (closed 2026-07-13) |
| 18 | `18-v1-release` | [`docs/built/18-v1-release.md`](../docs/built/18-v1-release.md) — first public release: Changesets + OIDC publish automation, all 7 packages live on npm at 0.1.0/0.1.1 with provenance, clean-room install verified, GitHub release, open-source meta files; shipped 0.1.0 (not 1.0.0) deliberately (closed 2026-07-04) |

---

**Conventions** — see `todo/README.md` for the full ways of working.
- Add a phase to *Planned* when it's sketched.
- Move to *Active* when the phase folder exists and work begins.
- Move to *Done* when the folder is archived and the distilled doc exists.
