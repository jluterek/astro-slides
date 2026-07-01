# astro-slides — for Claude

A web-native presentation framework built on Astro, TypeScript, and MDX, with a first-class MCP server. Slide decks authored in Markdown/MDX, exported to PDF/PNG/PPTX, presented in the browser, driveable by an AI agent.

## Read these first

| File | Purpose |
| --- | --- |
| `readme.md` | Vision, feature scope, library choices. |
| `todo/README.md` | **Ways of working** — how we plan, execute, archive, and document work without a ticket tracker. Read this before doing any task. |
| `todo/ROADMAP.md` | Current phases. Active work lives here. |
| `docs/decisions/README.md` | Index of architecture decision records (ADRs). |
| `docs/architecture/README.md` | Cross-cutting design specs (AST shape, frontmatter schema, CLI surface, MCP tools, theme tokens, layout primitives, sync state, directory conventions, **dependencies**). |
| `docs/architecture/dependencies.md` | **Canonical library matrix.** Before pulling in a new lib, check here. If it's not listed, propose an addition. |
| `docs/reference-applications/00-overview.md` | Synthesis of the prior-art research. Cross-references the per-app deep dives. |

## How to work in this repo

- **Find the active phase.** Read `todo/ROADMAP.md` → the relevant `todo/NN-phase/README.md` → the next pending task file.
- **Don't read `todo/archive/` casually.** Completed work is distilled into `docs/built/NN-phase-name.md`. That's the right entry point for outcomes from finished phases.
- **Read ADRs that touch your work.** If you're picking an animation library, library choice, or architectural pattern, check `docs/decisions/` first — there's likely an ADR that already decided.
- **Update task files in real time.** As you make decisions while working a task, write them into the task's *Notes / decisions* section. Not retroactively.
- **When a phase finishes, follow the lifecycle.** Distill to `docs/built/`, move the folder to `todo/archive/`, update `ROADMAP.md`. See `todo/README.md` § *Completing a phase*.

## Coding conventions

These are project-specific. General defaults from your own instructions still apply.

- **TypeScript strict end-to-end.** `strict: true`, `noUncheckedIndexedAccess: true`. No `any` without a comment explaining why.
- **pnpm** is the only supported package manager. Don't use `npm` or `yarn` commands. **No Corepack** (removed in Node 25+) — install pnpm standalone.
- **Zod** authoring is canonical. TS types are *inferred from* Zod schemas via `z.infer`; JSON Schemas are *generated from* Zod via `z.toJSONSchema()`. Don't write parallel TS interfaces — derive them from Zod.
- **Public types live in `packages/types/`.** Re-exported `z.infer<typeof X>` types from Zod schemas in the parser / MCP server.
- **MDX is the primary author format.** Marp/Slidev-compatible `.md` is the secondary format. Astro components (`.astro`) are an escape hatch.
- **Astro view-transitions:** use `<ClientRouter />` from `astro:transitions` (the new name; `<ViewTransitions />` is removed in Astro 6).
- **Themes are folders, not packages.** See `docs/decisions/0005-themes-as-folders.md`.
- **Click steps resolve at MDX compile time**, not at component mount. See `docs/decisions/0008-parse-time-click-resolution.md`.
- **No animation library for slide transitions.** View Transitions API + FLIP fallback. See `docs/decisions/0006-view-transitions-with-flip-fallback.md`.
- **PPTX export goes through PptxGenJS.** See `docs/decisions/0007-pptxgenjs-for-editable-pptx.md`.
- **MCP server is shipped from the CLI.** Streamable HTTP (not SSE/WebSocket) for remote. Zod schemas. See `docs/decisions/0009-mcp-server-first-class.md`.
- **Code highlighting is build-time Shiki in a remark plugin** (`packages/core/src/code/`), emitting `<CodeBlock html=…>` — NOT a rehype plugin (remark-rehype drops fence `meta`) and NOT Astro's built-in highlighter (disabled via `markdown.syntaxHighlight: false`). Dual themes use `defaultColor: false` CSS vars. Magic Move is the one hydrated code island. See `docs/decisions/0011-shiki-and-magic-move-for-code.md` + `docs/built/08-code-rendering.md`.
- **Math is build-time KaTeX** (`packages/core/src/math/`) via `remark-math` (delimiter tokenization — mandatory under MDX, or LaTeX `{}` parses as JS) + our `remark-katex` → `<KaTeX html=…>`. **Mermaid** renders client-side, lazily imported + Shadow-DOM mounted (`packages/client/src/diagrams/`); **PlantUML** encodes at build time to a server `<img>`. Diagram fences convert to components in `remark-diagrams` *before* remark-code. Conditional inclusion: KaTeX CSS via `deck.features.katex`, Mermaid via code-split. See `docs/built/09-math-and-diagrams.md`.
- **Library picks are locked.** Always check `docs/architecture/dependencies.md` before adding a dependency. Notable picks: `citty` (CLI), `Hono` + `@hono/mcp` (HTTP/MCP), `Zod v4`, `tsup` (per-package build), `tinykeys` + `@use-gesture/core` (input), `cmdk` (palette), `nanostores` (state), `unplugin-icons`, `chokidar v5`, `picocolors`, `@clack/prompts`, `listr2`.

## Things not to do

- Don't read `reference-applications/` source directly when looking up patterns. Read `docs/reference-applications/<app>.md` first — it has the file paths and line numbers if you need to drill in.
- Don't commit `reference-applications/` content. It's gitignored.
- Don't pull in a styling-system runtime (styled-components, styled-system, theme-ui). Themes are folders of plain CSS/Astro files driven by CSS custom properties.
- Don't add a third package manager or workspace tool. pnpm workspaces only.
- Don't pull in `kbar`, `mousetrap`, `astro-icon`, `commander`, `yargs`, `Monaco` (default), `UnoCSS` (lock-in), `socket.io`. See `docs/architecture/dependencies.md` § *Things we are NOT pulling in*.
- Don't author TypeScript interfaces for things that have Zod schemas — use `z.infer`. Single source of truth.
- Don't enable Corepack — installs pnpm via standalone install.
- Don't write code without a corresponding active task. If there's no task, the work isn't ready — either it needs a task or it needs an ADR first.

## When to update this file

- A coding convention changes → update the *Coding conventions* section in the same change.
- A cross-cutting decision is made → write an ADR in `docs/decisions/` and add a one-line reference here under *Coding conventions*.
- A new top-level doc is added → add it to *Read these first*.

This file is canonical for "how to work in this repo". If it disagrees with anything else, this wins.
