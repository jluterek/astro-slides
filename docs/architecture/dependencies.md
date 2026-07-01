# Dependencies — locked library picks

- **Status:** stable (Phase 01 prep, research-grounded)
- **Owner phase:** Phase 01 (initial); updated as new picks are validated

Canonical map of "what library do we use for X". The point of this file is to **stop reinventing wheels**. If a category appears here, the choice is locked — use the named library unless an ADR overturns it.

Every entry includes the package, current version (June 2026 snapshot), why it wins, and one short caveat.

## Build / tooling

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Package manager | `pnpm` v10+ (workspaces) | ADR-0004. Catalog versioning, hard links, fast. | Corepack removed in Node 25+ — install pnpm standalone and pin via `packageManager` field. |
| Build per package | `tsup` v8.5 | Zero-config dual ESM/CJS + `.d.ts`, esbuild-fast watch. | esbuild d.ts emitter can stumble on exotic generics — fall back to `rollup-plugin-dts` for any package that breaks. |
| Lint + format | `Biome` (latest) | One tool, fast, ADR-aligned strict defaults. | If a TS rule we want isn't in Biome yet, add ESLint as a supplement (not a replacement). |
| Git hooks | `Husky` v9 + `lint-staged` v15 | Familiar, deterministic. | `simple-git-hooks` is lighter; use only if install footprint becomes an issue. |
| TS compiler | `typescript` (latest stable) | ADR-0003. | Pinned in catalog. |
| Test runner | `Vitest` (latest) | First-class TS, fast, snapshot diffs out of the box (`@vitest/snapshot`). | Workspace mode for monorepo discovery. |
| DOM test env | `jsdom` v25 | Per-file `@vitest-environment jsdom` for client runtime unit tests (state machine, DeckController). | Added Phase 04. Default env stays `node`. |
| E2E / visual | `@playwright/test` v1 | Drives e2e (deck navigation) + exports. Root `playwright.config.ts`, tests in `e2e/`. | Added as a dev dep Phase 04 (beyond the `.claude/settings.json` project plugin). CI `e2e` job installs `--with-deps chromium`. |

## CLI / process

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| CLI framework | `citty` v0.2+ (UnJS) | TS-native, lazy-loaded subcommands (matters for `build` vs `dev` startup). | Pre-1.0 — API can shift. Watch upstream. |
| TTY shortcuts | `node:readline` keypress events | No lib needed. citty doesn't bind keys; we read the TTY ourselves. | — |
| Terminal output | `picocolors` | Tiny, fast, the PostCSS/Vite standard. | — |
| Interactive prompts | `@clack/prompts` v1.6 | Modern multi-step prompt UX (init scaffolder). | — |
| Task runner (progress UI) | `listr2` v10+ | Best-of-class progress for multi-step exports. | Pull in only where needed; not for trivial commands. |
| File watching | `chokidar` v5 (with `tinyglobby` for globs) | The standard. v5 is ESM-only. | — |

## Parser / markdown pipeline

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| MDX compiler | `@mdx-js/mdx` v3+ | Astro 5+'s peer. | — |
| Markdown AST utilities | `unist-util-visit` v5, `mdast-util-*`, `hast-util-*` | The unified ecosystem; what `@astrojs/mdx` is built on. | — |
| Frontmatter (MDX) | `remark-frontmatter` v5 + `gray-matter` | `remark-frontmatter` for the MDX pipeline; `gray-matter` for ad-hoc reads. | — |
| YAML | `yaml` v2+ | Pure JS, full spec. | — |
| Source-preserving rewrites | `magic-string` | Standard for codemods/transforms. | — |
| Marp directive parser | hand-rolled (in `packages/parser`) | Marp's directive grammar is small and stable; no third-party lib worth pulling in. | — |

## Astro integration

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| View transitions | `<ClientRouter />` from `astro:transitions` | **Renamed from `<ViewTransitions />`** in Astro 5; latter removed in Astro 6. | Pair elements via `transition:name`. Astro handles `prefers-reduced-motion` natively. |
| Content collections | Astro's native `getCollection` / Zod schemas | First-class. | Per-collection remark plugins are **not** supported; we register plugins globally and key behavior off the file path. |
| Cross-island state | `nanostores` (installed v0.11.4) | Astro's documented recommendation. | Locked-decision note said "v1.4+"; the current published line is 0.11.x. Each deck owns its own store. |
| Integration hook for routes | `injectRoute` + `astro:routes:resolved` (new in v5) | Lets us inspect resolved routes and generate per-slide deep links. | — |

## Runtime UI primitives

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Keyboard shortcuts (global) | `tinykeys` (installed v2.1.0) | Framework-agnostic, ~650 B, works in any island. Matches on `event.code`, so `Space`/letters bind reliably. | Ships no `types` condition in `exports` → local ambient decl in `packages/client`. |
| Keyboard shortcuts (React UI) | `react-hotkeys-hook` v5+ | Component-scoped binding for the presenter / editor panels. | — |
| Touch / swipe | Pointer Events (Phase 04); `@use-gesture/core` reserved for Phase 11 | Swipe-to-navigate is one horizontal gesture — raw Pointer Events are zero-dep and jsdom-testable. | `@use-gesture` earns its place with multi-touch (drawing/pinch-zoom) in Phase 11; `react-swipeable` is a fallback. |
| Command palette | `cmdk` v1.1+ (paco) | Unstyled, composable, ships its own fuzzy scorer. | React-only — fine since interactive UI is React islands. |
| Auto-fit text | `fitty` v2.4+ | What reveal.js uses; tiny. | RAF poll has constant CPU — opt-in per slide, not global. |
| Fragment animation helper | `@formkit/auto-animate` v0.9 | Drop-in for list/grid mutation reveals. | Optional — most click animations are CSS-only; this is the "I added a list item" case. |
| Icons | `unplugin-icons` v23 (with `@iconify-json/*` collections) | Tree-shakes per-icon, MDX-friendly (`<Icon name="carbon:edit"/>`). | astro-icon is Astro-only and stale; skip it. |

## Code / math / diagrams (already locked via ADRs)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Syntax highlighting | `shiki` v4+ | ADR-0011. | — |
| Animated code diffs | `@shikijs/magic-move` v1.4+ | ADR-0011. **Ships React/Solid/Svelte wrappers** — no porting needed. | Tokenization is theme-coupled; theme changes invalidate the artifact. |
| TS hover in code | `@shikijs/twoslash` | ADR-0011, opt-in. | — |
| Math | `katex` v0.17+ | ADR-0011. | Self-host fonts to avoid CDN dependency. |
| Diagrams (Mermaid) | `mermaid` v11+ | ADR-0011. | Mount inside a Shadow DOM for CSS isolation. |
| Diagrams (PlantUML) | `plantuml-encoder` + configurable server URL | ADR-0011. | — |
| Compression for embedded code | `lz-string` v1.5 | Used by Magic Move's payload. | Dormant since 2023, but feature-complete. |

## Drawing / recording

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Drawing overlay | `drauu` v1.0 | Framework-agnostic, vanilla TS. Used directly in client islands. | No official React wrapper — wire to a `ref`. |
| Recording (camera + screen) | `recordrtc` v5.6+ | `MediaRecorder` wrapper used by Slidev. | Lazy-import only when recording starts. |
| WebM duration fix | `@fix-webm-duration/fix` | Repairs `MediaRecorder` WebM duration metadata. | — |

## Mobile remote / sync (Phase 11)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| QR code | `uqr` v0.1+ | UnJS, terminal-friendly. | — |
| HTTP server (for MCP HTTP transport and mobile remote) | `Hono` v4.12+ | Modern, embeddable, runs anywhere. Pairs with `@hono/mcp` v0.3+ for MCP. | WebSocket on Hono/Node needs `@hono/node-ws` — not bundled. |

## MCP server (Phase 14)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| MCP SDK | `@modelcontextprotocol/sdk` v1.29 (target v2.x when GA 2026-07-28) | Official. | Targets latest stable when Phase 14 starts. |
| Transport (local) | stdio (SDK built-in) | Trusted process boundary. | — |
| Transport (network) | Streamable HTTP via `@hono/mcp` (or SDK's `StreamableHTTPServerTransport`) | Replaces deprecated SSE. | OAuth 2.1 + PKCE for non-loopback — implementing minimally for v1, full OAuth deferred. |
| Tool schemas | `Zod` v4+ with `.describe()` | Standard Schema compliant, SDK accepts directly. Built-in `z.toJSONSchema()` for editor schemas. | Zod 4 has breaking changes vs Zod 3 — start fresh. |

## Schema generation (frontmatter IntelliSense)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| TS types → JSON Schema | `zod-to-json-schema` (or Zod 4's `z.toJSONSchema()`) | One source (Zod) drives both runtime validation and editor IntelliSense. | We pick Zod over TypeBox so we don't ship two schema systems. |

## Export pipeline (already locked)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| PDF generation (high fidelity) | `Playwright` | ADR via plan. | Chromium download is large — bring-your-own-binary supported. |
| PDF manipulation / merging | `pdf-lib` | Slidev's choice. | — |
| PDF TOC outlines | `@lillallol/outline-pdf` | Slidev's choice. | — |
| PPTX generation | `PptxGenJS` v4+ | ADR-0007. | Theme palette beyond fonts requires forking OOXML theme XML. |
| ZIP packaging | `JSZip` (transitive via PptxGenJS) | Already a transitive dep. | — |

## Image / media

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Image processing | Astro's `astro:assets` | Native, handles modern formats. | — |
| (If we need raw sharp ops) | `sharp` | Standard. | Only pull if `astro:assets` doesn't cover the use case. |

## Things we are NOT pulling in

Recording these so we don't accidentally regress:

- **No styled-components / styled-system / theme-ui.** Vanilla CSS + custom properties (ADR-0005).
- **No `kbar`.** `cmdk` overtook it.
- **No `mousetrap`.** `tinykeys` is smaller and modern.
- **No `astro-icon`.** `unplugin-icons` wins on tree-shaking and freshness.
- **No `commander` / `yargs`.** `citty` wins on TS-native subcommands.
- **No `ora`.** `@clack/prompts` covers spinners as part of the prompt set.
- **No `UnoCSS` lock-in.** Authors bring their own atomic CSS (Tailwind / Panda / vanilla) — we don't ship one.
- **No `Monaco` by default.** Optional addon. Shiki + textarea is enough for 95% of demos.
- **No `socket.io` / `Y.js` in v1.** Plain WebSocket via `@hono/node-ws`. CRDT collab is a post-v1 path that fits the same `syncState` seam.

## Change history

- 2026-06-30 — initial spec, three research agents grounded the picks (MCP SDK, Astro ecosystem, NPM library landscape).
