# Roadmap

The phase index. Always current. Update when a phase starts or ends.

## Active

- _None. Phase 01 closed; Phase 02 (parser) is next up._

## Planned

Phases are listed in dependency order. They can be re-sequenced if a later phase becomes a higher priority, but dependencies must be honored.

| # | Phase | One-liner |
| --- | --- | --- |
| 02 | [`02-parser`](./02-parser/README.md) | MDX/MD → slide AST: frontmatter, separators, slot sugar, snippet imports, slide imports |
| 03 | [`03-astro-integration`](./03-astro-integration/README.md) | Astro integration, Vite plugins, virtual modules, content collections, per-slide routes |
| 04 | [`04-runtime-core`](./04-runtime-core/README.md) | Slide rendering, navigation, URL state, keyboard/touch, the `past/present/future` state machine |
| 05 | [`05-themes-and-layouts`](./05-themes-and-layouts/README.md) | Filesystem-layered themes, built-in layouts, CSS-custom-property tokens |
| 06 | [`06-click-model`](./06-click-model/README.md) | Parse-time click resolution, `<Click>` / `<Clicks>` / `<After>` components, click runtime |
| 07 | [`07-transitions`](./07-transitions/README.md) | View Transitions API + FLIP fallback for slide morphs |
| 08 | [`08-code-rendering`](./08-code-rendering/README.md) | Shiki, Magic Move, Twoslash, line-step reveals |
| 09 | [`09-math-and-diagrams`](./09-math-and-diagrams/README.md) | KaTeX, Mermaid, PlantUML with click-step reveals |
| 10 | [`10-presenter-mode`](./10-presenter-mode/README.md) | Speaker view, BroadcastChannel sync, timer, notes, next-slide preview |
| 11 | [`11-drawing-and-recording`](./11-drawing-and-recording/README.md) | Drauu drawing overlay, RecordRTC capture, mobile remote (QR + WebSocket) |
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

---

**Conventions** — see `todo/README.md` for the full ways of working.
- Add a phase to *Planned* when it's sketched.
- Move to *Active* when the phase folder exists and work begins.
- Move to *Done* when the folder is archived and the distilled doc exists.
