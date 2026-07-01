# astro-slides 1.0 — release notes (DRAFT)

> Draft for the GitHub release + announcement post. Fill in the final version number, the live
> docs URL, and screenshots at publish time. Nothing here is published yet.

**astro-slides** is a web-native presentation framework built on Astro, TypeScript, and MDX, with
a first-class MCP server. Author decks in Markdown/MDX, present in the browser, export to
PDF/PNG/PPTX, and drive it with an AI agent.

## Highlights

- **Author in Markdown/MDX.** MDX-first, with Marp- and Slidev-compatible `.md` as a secondary
  path and `.astro` as an escape hatch. Layout primitives and components when you want them.
- **Web-native presenting.** View-Transition slide changes, click-stepped reveals, a live
  presenter view (next-slide preview, notes, timer), drawing + laser, screen recording, and a
  phone remote over your LAN.
- **21 built-in layouts + a theme system.** Themes are folders of plain CSS driven by `--slide-*`
  custom properties. The flagship **Cosmic** theme ships an oklch dark/light palette, self-hosted
  type, and landing-page-quality layouts — a five-minute deck looks ready to present.
- **Rich content.** Build-time Shiki highlighting (dual themes, line highlights, Magic Move,
  Twoslash), KaTeX math, and Mermaid / PlantUML diagrams.
- **Export everywhere.** One deck → PDF, PNG, an offline HTML bundle, and *editable* PPTX.
- **First-class MCP server.** Read, write, navigate, export, and capture tools over stdio or
  Streamable HTTP, plus a bundled Claude Code skill/plugin.
- **Get started in one command.** `pnpm create astro-slides my-deck`.

## Install

```bash
pnpm create astro-slides my-talk   # scaffold a new deck
# or add to an existing project:
pnpm add -D @astro-slides/cli
```

## Packages

| Package | Purpose |
| --- | --- |
| `@astro-slides/cli` | The `astro-slides` command — dev, build, export, MCP server. |
| `@astro-slides/core` | The Astro integration (routes, virtual modules, remark pipeline). |
| `@astro-slides/client` | Runtime UI — layouts, click runtime, transitions, presenter, themes. |
| `@astro-slides/parser` | Markdown/MDX → typed slide AST. |
| `@astro-slides/types` | Public Zod schemas + inferred types. |
| `@astro-slides/mcp-server` | The MCP server (bundled, imported by the CLI). |
| `create-astro-slides` | The `pnpm create astro-slides` scaffolder. |

## Docs

Full documentation: **<https://jluterek.github.io/astro-slides/>** (live once GitHub Pages is
enabled).

## Not in 1.0

- A VS Code extension (post-1.0 target).
- Embedded-Excel charts / full theme-palette mapping in PPTX export.
- Real-time multi-user collaboration (the sync seam supports it; CRDT collab is post-1.0).
