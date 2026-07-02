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
| MDX integration | `@astrojs/mdx` v4 (Astro 5) + `@astrojs/react` v4 + `react`/`react-dom` v19 | Slides compile as Astro-native MDX; added by `astroSlides()` itself (integration-adds-integrations). Per-slot sources emitted to temp `.mdx` under `<root>/.astro-slides/`. | Added Phase 06. React components used in MDX SSR to static HTML (no client JS) unless a `client:*` directive is set. |
| Markdown AST utilities | `unist-util-visit` v5 (installed), `mdast-util-*`, `hast-util-*` | The unified ecosystem; `remark-clicks` uses `visit`/`SKIP` to resolve click steps. | — |
| unified pipeline | `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify` | Core's standalone Markdown→HTML render path (`render.ts`) for notes/summaries outside the Astro MDX pipeline. | Versions ride the unified v11 line. |
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
| Keyboard shortcuts (React UI) | `react-hotkeys-hook` v5 (installed v5.3) | Component-scoped binding for the presenter view (`S`/`B`/`F` + nav). | — |
| Presenter pane resizing | `react-resizable-panels` **v2.1** | Resizable three-pane grid with `autoSaveId` localStorage persistence. | **Pinned to v2, not v4** — v4 renamed the API to `Group`/`Separator` and dropped `autoSaveId` auto-persistence. |
| Touch / swipe | Pointer Events (Phase 04); `@use-gesture/core` reserved for Phase 11 | Swipe-to-navigate is one horizontal gesture — raw Pointer Events are zero-dep and jsdom-testable. | `@use-gesture` earns its place with multi-touch (drawing/pinch-zoom) in Phase 11; `react-swipeable` is a fallback. |
| Command palette | `cmdk` v1.1 (installed v1.1.1) | Unstyled, composable, ships its own fuzzy scorer. Powers the presenter jump-to-slide palette. | React-only — fine since interactive UI is React islands. |
| Auto-fit text | `fitty` (installed v2.4.2) | What reveal.js uses; tiny. Wraps `<FitText>`. | RAF poll has constant CPU — opt-in per element, not global. Default export; top-level `types`. |
| Fragment animation helper | `@formkit/auto-animate` v0.9 | Drop-in for list/grid mutation reveals. | Optional — most click animations are CSS-only; this is the "I added a list item" case. |
| Icons | `unplugin-icons` (installed v0.21.0) + `@iconify-json/carbon` v1.2 | Tree-shakes per-icon; wired via the integration as `Icons({ compiler: "astro" })` → `~icons/carbon/*`. | astro-icon is Astro-only and stale; skip it. Author-facing use in slides waits on the MDX gap (Phase 05 note); usable in layouts now. |

## Code / math / diagrams (already locked via ADRs)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Syntax highlighting | `shiki` v4+ (installed v4.3) via `@shikijs/rehype` | ADR-0011. Build-time highlighting as a rehype plugin over the emitted MDX; Astro's built-in highlight is disabled (`markdown.syntaxHighlight: false`). Dual themes (`github-dark`/`github-light`). | — |
| Highlight transformers | `@shikijs/transformers` v4.3 | Meta line highlight `{1,3-5}`, notation transformers. Our own transformer adds per-click `{1|2-3}` line reveals wired to the click model. | — |
| Animated code diffs | `@shikijs/magic-move` v4.3 | ADR-0011. **Ships React/Solid/Svelte wrappers** — consumed via `@shikijs/magic-move/react`; build-time tokenization via `/core`. | Tokenization is theme-coupled; theme changes invalidate the artifact. |
| TS hover in code | `@shikijs/twoslash` v4.3 | ADR-0011, opt-in via the `twoslash` fence flag. | Needs a TS project context (`tsconfig`); plain-MD-without-TS can't infer types. |
| Math | `katex` v0.17 | ADR-0011. Rendered at build time to HTML; the stylesheet is linked only when `deck.features.katex` (conditional include). | KaTeX's `.woff2` fonts ship with the package (no CDN). |
| Math delimiters | `remark-math` v6 (`micromark-extension-math`) | Tokenizes `$…$`/`$$…$$` at the micromark level so LaTeX braces (`e^{i\pi}`) aren't parsed as MDX expressions — the reason a hand-rolled remark port isn't viable under MDX. `remark-katex` then renders the nodes. | — |
| Diagrams (Mermaid) | `mermaid` v11 | ADR-0011. Rendered client-side; lazily imported only when a `.as-mermaid` element exists (code-split), mounted in a Shadow DOM for CSS isolation, scheme-aware. | Large — must stay lazy. |
| Diagrams (PlantUML) | `plantuml-encoder` v1.4 + configurable server URL | ADR-0011. Build-time deflate+base64 encode → `<server>/svg/<encoded>` `<img>`; default public plantuml.com, `plantumlServer` option to self-host. | Color-scheme response limited to what the server renders. |
| Compression for embedded code | `lz-string` v1.5 | Compresses the build-time Magic Move token payload embedded in the output; decompressed at runtime. | Dormant since 2023, but feature-complete. |

## Drawing / recording

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Drawing overlay | `drauu` v1.0 (installed v1.0.0) | Framework-agnostic vanilla TS — created directly in the **vanilla deck runtime** (`packages/client/src/drawing/`), not a React island, so it layers over the existing deck without hydrating a per-page island. | No official React wrapper — created against a `<svg>` ref. |
| Recording (camera + screen) | `recordrtc` v5.6 (installed v5.6.2) | `MediaRecorder` wrapper used by Slidev. | **Lazy-imported only when recording starts** (`packages/client/src/recording/recorder.ts`); MIME is negotiated at runtime (`mime.ts`). `@types/recordrtc` is a dev dep. |
| WebM duration fix | `@fix-webm-duration/fix` (installed v1.0.1) | Repairs `MediaRecorder` WebM duration metadata (Chrome writes an unknown duration). | Also lazy-imported alongside recordrtc. |

## Mobile remote / sync (Phase 11)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| QR code | `uqr` v0.1 (installed v0.1.3) | UnJS, terminal-friendly. `renderANSI()` prints the LAN URL QR to the dev TTY under `--remote`. | — |
| HTTP server (for MCP HTTP transport and mobile remote) | `Hono` v4.12 (installed v4.12.27) | Modern, embeddable, runs anywhere. Pairs with `@hono/mcp` v0.3+ for MCP. Serves `/entry` + the sync WebSocket as dev-server middleware. | WebSocket on Hono/Node needs `@hono/node-ws` (installed v1.3.1). |
| Node WebSocket adapter | `@hono/node-ws` v1.3 (installed v1.3.1) | Attaches Hono `upgradeWebSocket` routes to the Vite dev server's Node `httpServer`. | **Peers on `@hono/node-server@^1.19`, not v2** — installed v1.19.14 (used only via `getRequestListener` to mount Hono as Connect middleware). |

## MCP server (Phase 14)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| MCP SDK | `@modelcontextprotocol/sdk` (installed v1.29.0) | Official. `registerTool` takes a **ZodRawShape** `inputSchema` (object of validators), not a `z.object`; server class at `server/mcp.js`. | v2 not GA at phase start; on v1.29 until then. |
| Transport (local) | stdio (SDK built-in) — `StdioServerTransport` | Trusted process boundary. | — |
| Transport (network) | Streamable HTTP via `@hono/mcp` (installed v0.3.0) — `StreamableHTTPTransport` on `@hono/node-server` | Replaces deprecated SSE. Stateless per-request (fresh server per request). | OAuth 2.1 + PKCE for non-loopback deferred; v1 uses a static bearer token. |
| Server bundling | `tsup` (already dev-dep) | `@astro-slides/mcp-server` bundles workspace deps into one plain-JS `dist/index.js` so the type-stripped CLI can `import()` it; `tsc` emits `.d.ts` only. | Needs `pnpm build`; CI runs it in the typecheck job. |
| Tool schemas | `Zod` v4+ with `.describe()` | Standard Schema compliant, SDK accepts directly. Built-in `z.toJSONSchema()` for editor schemas. | Zod 4 has breaking changes vs Zod 3 — start fresh. |

## Schema generation (frontmatter IntelliSense)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| TS types → JSON Schema | `zod-to-json-schema` (or Zod 4's `z.toJSONSchema()`) | One source (Zod) drives both runtime validation and editor IntelliSense. | We pick Zod over TypeBox so we don't ship two schema systems. |

## Export pipeline (already locked)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| PDF/PNG generation (high fidelity) | `Playwright` (`@playwright/test` v1.61, installed) | ADR via plan. Phase 12 drives it against a built+previewed deck; `page.pdf()` on the `/print` route, `page.screenshot()` per slide. | Chromium download is large — an **optional peer** of `@astro-slides/core` (lazy-imported); `--executable-path` for BYO binary. |
| PDF manipulation / merging | `pdf-lib` (installed v1.17.1) | Merges `--per-slide` PDFs into one document. | — |
| PDF TOC outlines | `@lillallol/outline-pdf` (installed v4.0.0) | `--with-toc` adds slide-title bookmarks. | ESM; called via dynamic import. |
| PPTX generation | `PptxGenJS` (installed v4.0.1) | ADR-0007. Phase 13 maps rendered-DOM extraction → editable OOXML (text/lists/tables/images/notes); code + `exportAs:image`/`--rasterize` fall back to screenshots. | Theme palette beyond per-shape colors requires forking OOXML theme XML (descoped). Default export is a class+namespace merge — construct via `(mod.default ?? mod)`. |
| ZIP packaging | `JSZip` (installed v3.10.1) | Packages the offline `--format html` bundle (dist + assets). | Also a transitive dep of PptxGenJS. |
| Export progress UI | `listr2` (installed v10.2.2) | Multi-step export progress in the CLI (`build → preview → render → write`). | — |

## Image / media

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Image processing | Astro's `astro:assets` | Native, handles modern formats. | — |
| (If we need raw sharp ops) | `sharp` | Standard. | Only pull if `astro:assets` doesn't cover the use case. |

## Fonts / theming (Phase 16)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Body font | `@fontsource-variable/inter` v5 | Self-hosted OFL (no Google CDN). Variable weight axis. Used by the Cosmic theme's body text. | `@import`ed from `cosmic/theme.css` (client owns the dep), not the deck route — pnpm can't resolve it from `@astro-slides/core`. woff2 downloads only when the family is rendered. |
| Display font | `@fontsource/space-grotesk` v5 | Self-hosted OFL geometric display face for Cosmic headings (500 + 700). | Same `@import`-from-theme resolution as Inter. |
| Color space | `oklch()` (native CSS) | Perceptually uniform palette across starter + Cosmic. | No PostCSS hex fallback — oklch is universal in 2026 (Chrome 111+/Safari 16.4+/Firefox 113+). |

Themes are folders of CSS (ADR-0005). Bundled themes (starter, cosmic, marp-*) live in
`packages/client/src/themes/` and are imported by the deck + print routes; a deck opts in via
`theme:` headmatter, which stamps `data-theme` and scopes non-default tokens under `[data-theme]`.

## Docs site + scaffolder (Phase 17)

| Category | Library | Why | Caveat |
| --- | --- | --- | --- |
| Docs framework | `@astrojs/starlight` v0.37 | Dogfood Astro. Sidebar, search (Pagefind), MDX. | **Pinned to 0.37** — the last line peering on Astro 5; 0.38+ requires Astro 6. Lives in `docs-site/` (a workspace app, not a composite-TS package). |
| Docs image processing | `sharp` v0.34 | Starlight/Astro asset optimization. | — |
| Scaffolder prompts | `@clack/prompts` v1.6 | Interactive `pnpm create astro-slides` UI (target → theme). | Locked since Phase 00; first used here. Bin runs TS via Node type-stripping (no build). |

The docs site deploys to GitHub Pages via `.github/workflows/docs.yml` (`base: /astro-slides/`).
Enabling Pages is a one-time repo setting. `create-astro-slides` is published separately from
`@astro-slides/cli` (the `pnpm create *` convention).

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
- 2026-07-01 — Phase 16: added Fontsource `@fontsource-variable/inter` + `@fontsource/space-grotesk` (self-hosted OFL) for the Cosmic theme; recorded the oklch-no-fallback and `@import`-from-theme decisions.
- 2026-07-01 — Phase 17: added `@astrojs/starlight` v0.37 (pinned for Astro 5) + `sharp` for the docs site, and `@clack/prompts` for the `create-astro-slides` scaffolder.
