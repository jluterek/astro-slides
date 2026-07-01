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
- **PPTX export extracts from the rendered DOM, not the parser AST (Phase 13).** The CLI can't import the workspace-TS parser at runtime (same wall as web export), so `--format pptx` runs an in-browser `DOM_WALKER` (`page.evaluate`) that maps rendered slides → editable OOXML shapes (headings/paragraphs → text, lists → bullets, tables → native, images inlined as data URLs); code blocks + `exportAs: image`/`--rasterize` slides fall back to screenshots. Speaker notes ride an `as-notes-data` JSON script embedded in `slide.astro` (`data-export-as` marks image slides). Positions: design-px rects → inches (`pxToIn`) → EMU. The pure `buildPptxSlide`/`buildDeckPptx` mapper is unit-tested against a fake `PptxSlideLike`. `cli/tsconfig.json` includes the DOM lib for the walker (CLI runs in Node). Descoped: embedded-Excel charts, full theme-palette mapping. See `docs/built/13-export-pptx.md`.
- **MCP server is shipped from the CLI.** Streamable HTTP (not SSE/WebSocket) for remote. Zod schemas. See `docs/decisions/0009-mcp-server-first-class.md`.
- **Marp/Slidev compat is parser-level (Phase 15).** Slidev `v-click`/`v-after`/`v-clicks` (element AND attribute forms) are rewritten to `<Click>`/`<After>`/`<Clicks>` by `remark-slidev` (`packages/core/src/compat/`) **before** remark-clicks. Marp image shorthand (`![bg]`→`background`, `![w:N]`→sized `<img>`) is `extractMarpImages` in the parser, run only in `marp:true` mode. Slidev component shims live **flat in `packages/client/components/`** (Youtube/Tweet/Toc/VDrag/AutoFitText/LightOrDark) — a nested `src/compat/` path does NOT resolve as MDX components. **Deck components are registered in TWO places — `slide.astro` AND `print.astro` — keep both `COMPONENTS` maps in sync** (a shim missing from print.astro throws "component not defined" only when the build prerenders `/print/<deck>`). Marp themes are shipped under `themes/marp-*/` but don't auto-apply until theme-by-name switching lands (Phase 16). See `docs/built/15-marp-slidev-compatibility.md`.
- **Theme-by-name switching + Cosmic flagship theme (Phase 16).** A deck opts into a bundled theme via `theme:` headmatter; the deck + print routes stamp `data-theme={config.theme ?? "starter"}` on `.as-deck`/`.as-print` and import every bundled theme CSS. **starter** sets tokens on `:root` (the global default); non-default themes (cosmic, marp-*) scope their `--slide-*` tokens under a **bare `[data-theme="<name>"]`** selector (route-agnostic — matches both `.as-deck` and `.as-print`; nearest-ancestor wins for inherited custom props, so opted-in subtrees override `:root`). **Cosmic** (`packages/client/src/themes/cosmic/theme.css`) is the flagship: dark-primary oklch palette + full light variant, self-hosted **Space Grotesk** (display) + **Inter** (body) via Fontsource **`@import`ed from the theme CSS itself** (client owns the deps; core routes can't resolve them), 8px rhythm, FlexBlock cards, pure-CSS starfield. No PostCSS hex fallback (oklch is universal). **MDX gotcha:** a line starting with `export` parses as an ESM export — reword deck content that begins a line with "export". See `docs/built/16-default-theme.md`.
- **MCP server is a tsup-bundled package the CLI imports, not inline code (Phase 14).** `@astro-slides/mcp-server` bundles its workspace deps (parser/types) into one plain-JS `dist/index.js` so the type-stripped CLI can `import()` it (same wall as export); `tsc` emits only `.d.ts` (`emitDeclarationOnly` — different extension, no collision). Build via `pnpm build` (CI runs it in the typecheck job). 20 tools (read/write/navigate/export/capture; recording descoped) over stdio + Streamable HTTP; non-loopback HTTP needs a bearer token (`--token`/`ASTRO_SLIDES_MCP_TOKEN`), `--read-only` drops write tools. **Write tools are text-level** (`splitSlides` verbatim block slicing + reparse-verify) — the parser has no AST serializer, so writes don't round-trip through it; untouched slides stay byte-identical. Navigate tools are a WS client to the Phase 11 gateway (need `dev --remote`); export/capture spawn the CLI. Skill bundle + Claude Code plugin at repo root (`skills/astro-slides/`, `.claude-plugin/`). See `docs/built/14-mcp-server.md`.
- **Code highlighting is build-time Shiki in a remark plugin** (`packages/core/src/code/`), emitting `<CodeBlock html=…>` — NOT a rehype plugin (remark-rehype drops fence `meta`) and NOT Astro's built-in highlighter (disabled via `markdown.syntaxHighlight: false`). Dual themes use `defaultColor: false` CSS vars. Magic Move is the one hydrated code island. See `docs/decisions/0011-shiki-and-magic-move-for-code.md` + `docs/built/08-code-rendering.md`.
- **Math is build-time KaTeX** (`packages/core/src/math/`) via `remark-math` (delimiter tokenization — mandatory under MDX, or LaTeX `{}` parses as JS) + our `remark-katex` → `<KaTeX html=…>`. **Mermaid** renders client-side, lazily imported + Shadow-DOM mounted (`packages/client/src/diagrams/`); **PlantUML** encodes at build time to a server `<img>`. Diagram fences convert to components in `remark-diagrams` *before* remark-code. Conditional inclusion: KaTeX CSS via `deck.features.katex`, Mermaid via code-split. See `docs/built/09-math-and-diagrams.md`.
- **Cross-window sync is `BroadcastChannel`** (`packages/client/src/sync/`, ADR-0010) — a pure `reduce` over a `SharedState`; local `dispatch` broadcasts, remote actions reduce without re-posting (echo-guarded). Timer syncs epoch + elapsed-before-pause, never a computed elapsed (no clock drift). Presenter view is a React island (`packages/client/components/presenter/`) on the `/presenter/<deck>/<n>` route; slide/next panes are **iframes pointed at the normal deck route** (`?as-preview` = follow-only). Panes use `react-resizable-panels` **v2** (v4 renamed the API + dropped `autoSaveId`). See `docs/architecture/sync-state.md` + `docs/built/10-presenter-mode.md`.
- **Web export (Phase 12).** The `export` command + Playwright/pdf-lib/jszip pipeline live **inline in `packages/cli/src/main.ts`** (self-contained, bare-deps only) — NOT in `packages/core`, because the bin runs `main.ts` under Node type-stripping, which can't resolve the repo's `.js` import specifiers to workspace `.ts` at runtime. PDF renders the `/print/[deck]` route once (`page.pdf`, `preferCSSPageSize`) then slices with pdf-lib; PNG screenshots `?embed=1` slide pages. `/print` reveals all clicks via **specificity, not `!important`** (it loads after `click.css`). Embed mode is **client-side** (`.as-embed` from `location.search` — prerendered routes can't read the query). The SPA build adds a `/`→first-slide redirect route and an `astro:build:done` hook copying `index.html`→`404.html`. `@playwright/test` is an **optional peer** of the CLI (lazy-imported). See `docs/built/12-export-web.md` + `docs/architecture/cli.md`.
- **Drawing/recording/remote (Phase 11).** `SyncChannel` is a transport interface; a window fans one `dispatch` out to `BroadcastChannel` **and** (dev `--remote` only) a WebSocket to the sync gateway — all `draw`/`draw/clear`/`laser` actions are idempotent so double-delivery is safe. **Drawing + laser are vanilla runtime modules** (`packages/client/src/drawing/`), drauu on a design-coordinate `<svg>` (toggle `d`/`l`), NOT React islands. **Recording** (`packages/client/src/recording/`) lazy-imports `recordrtc` + `@fix-webm-duration/fix` on start; MIME negotiated at runtime; UI is a presenter island. The **sync gateway** (`packages/core/src/server/`: `SyncHub` relay + Hono/`@hono/node-ws`) serves `/entry`, drawing persistence, and the WS — mounted in `vite-plugin.ts` by **prepending onto Vite's Connect stack** (a `.use()` lands after Astro's 404 router) and **statically imported** (a runtime `import()` hits Vite's closed module runner). Gateway is advertised to the client only via the `@astro-slides/runtime-config` virtual module under `--remote`, so static builds never open a socket. Drawings persist to `<root>/.astro-slides/drawings/<deck>/` (gitignored). `@hono/node-server` pinned to v1.19 (node-ws peer). See `docs/built/11-drawing-and-recording.md`.
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
