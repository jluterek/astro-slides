# Roadmap

The phase index. Always current. Update when a phase starts or ends.

## Active

- _None. Phase 11 closed (drawing + recording + mobile remote); Phase 12 (web export) is next up._

## Planned

Phases are listed in dependency order. They can be re-sequenced if a later phase becomes a higher priority, but dependencies must be honored.

| # | Phase | One-liner |
| --- | --- | --- |
| 12 | [`12-export-web`](./12-export-web/README.md) | PDF, PNG, standalone HTML, SPA build, per-slide embeds |
| 13 | [`13-export-pptx`](./13-export-pptx/README.md) | Real editable PPTX via PptxGenJS, image-rasterized fallback per slide |
| 14 | [`14-mcp-server`](./14-mcp-server/README.md) | MCP server CLI subcommand, tool surface, stdio + SSE transports, skill bundle |
| 15 | [`15-marp-slidev-compatibility`](./15-marp-slidev-compatibility/README.md) | Marp directive support, Slidev component shims, gap documentation |
| 16 | [`16-default-theme`](./16-default-theme/README.md) | "Cosmic" flagship theme: WebSlides-quality design DNA, dark/light variants |
| 17 | [`17-docs-and-examples`](./17-docs-and-examples/README.md) | Starlight docs site, sample decks, CLI in-TTY shortcuts |
| 18 | [`18-v1-release`](./18-v1-release/README.md) | Changesets release tooling, npm publish, GitHub release |

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

---

**Conventions** — see `todo/README.md` for the full ways of working.
- Add a phase to *Planned* when it's sketched.
- Move to *Active* when the phase folder exists and work begins.
- Move to *Done* when the folder is archived and the distilled doc exists.
