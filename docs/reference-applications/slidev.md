# Slidev

## Summary

Slidev is a Markdown-driven presentation framework built by [Anthony Fu](https://github.com/antfu) and the slidevjs team. It is a Vue 3 + Vite + UnoCSS + TypeScript app distributed as a CLI (`@slidev/cli`) that takes a single `slides.md` (the *entry*) and produces an interactive, themable, browser-based deck with hot reload, presenter mode, drawing, recording, and rich export (PDF/PNG/PPTX/SPA). The design philosophy is overtly *developer-first*: authoring happens in a Markdown editor, embedded Vue and HTML are first-class, and the runtime ships opinionated defaults for code highlighting (Shiki + Twoslash + Magic Move + Monaco), math (KaTeX), diagrams (Mermaid, PlantUML), motion (`@vueuse/motion`), drawing (Drauu), and recording (RecordRTC). It is actively maintained (`v52.16.0` in this snapshot), MIT licensed, and the source lives at `/Users/jluterek/code/jluterek/slides/reference-applications/slidev`. It is the closest existing project to what we are building, so this doc goes deep into its internals.

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | Markdown with YAML frontmatter + embedded Vue/HTML + UnoCSS classes |
| Runtime stack | Vue 3, Vue Router, Vite, UnoCSS, TypeScript |
| Rendering approach | Vue components compiled from Markdown via `unplugin-vue-markdown`, rendered in DOM with `TransitionGroup` and View Transitions API |
| Status | Active (`v52.16.0`) |
| License | MIT |
| Package manager | `pnpm` workspaces (with catalog versioning) |
| Node engine | `>=20.12.0` |
| Entry CLI | `npx slidev` / `pnpm create slidev` |

## Monorepo layout

`pnpm-workspace.yaml` (`/Users/jluterek/code/jluterek/slides/reference-applications/slidev/pnpm-workspace.yaml`) declares the workspace globs `packages/*`, `demo/*`, `cypress/fixtures/*`, `docs`. Versions are managed via a *catalog* (`catalogs.dev`, `catalogs.frontend`, `catalogs.prod`, etc.) so all workspace packages stay aligned.

| Package | Path | Purpose |
| --- | --- | --- |
| `@slidev/cli` | `packages/slidev/` | The Node-side CLI + Vite plugin orchestrator. Owns `slidev`, `slidev build`, `slidev export`, `slidev format`, `slidev theme eject`, `slidev export-notes`. Implements the entire markdown→virtual-modules→Vite pipeline. |
| `@slidev/client` | `packages/client/` | The Vue 3 SPA that actually renders slides — pages, layouts, composables, directives, builtin components, presenter UI, drawing layer, recording UI. All HMR-aware. |
| `@slidev/parser` | `packages/parser/` | Pure parser: Markdown → SlidevMarkdown AST (slide separators, frontmatter, notes, feature detection). Sync + async variants. Used in CLI and in the prettier plugin. |
| `@slidev/types` | `packages/types/` | All shared TypeScript types: `SlidevConfig`, `Frontmatter`, `Headmatter`, `ClicksContext`, `SlideInfo`, `SlideRoute`, `BuiltinLayouts`, `SlidevPreparserExtension`, etc. |
| `create-slidev` | `packages/create-app/` | `npm init slidev` scaffolder — copies `template/` to a target directory and offers to run `dev`. |
| `create-slidev-theme` | `packages/create-theme/` | Scaffolder for a new theme package. |
| `vscode` | `packages/vscode/` | VS Code extension: language server, slide preview, "Slidev: Start Presenter", `languageModelTools` (Copilot tools) for `getActiveSlide`, `getSlideContent`, `getAllSlideTitles`, `findSlideNoByTitle`, `listEntries`, `getPreviewPort`. |
| `docs` | `docs/` | The VitePress site for sli.dev. |
| Demos | `demo/starter/`, `demo/composable-vue/`, `demo/vue-runner/` | Reference decks. `demo/starter/slides.md` is also the template seed. |

Top-level support: `cypress/`, `scripts/` (`publish.mjs`, `demo.mjs`, `update-versions.mjs`), `patches/`, `skills/slidev/` (the Claude Code skill bundle), `.claude-plugin/` (Claude Code marketplace + plugin manifests).

## Architecture

The end-to-end flow from `npx slidev slides.md` to a running browser is layered:

1. **CLI dispatch** — `packages/slidev/bin/slidev.mjs` (3 lines) just `import('../dist/cli.mjs')`. The real CLI is `packages/slidev/node/cli.ts` which uses `yargs` to define the commands. Default command is `slidev [entry]` → starts a dev server. Other commands: `build`, `export`, `format`, `theme eject`, `export-notes`.

2. **Options resolution** — `resolveOptions()` in `packages/slidev/node/options.ts` walks the user dir for an entry, locates the theme via `integrations/themes.ts`, loads markdown with `@slidev/parser`, resolves addons, computes `define` flags (`__SLIDEV_FEATURE_PRESENTER__`, `__SLIDEV_FEATURE_DRAWINGS__`, `__SLIDEV_HASH_ROUTE__`, etc.), and prepares utility caches (Shiki highlighter, KaTeX options, index.html, layouts globbed across `[clientRoot, ...themeRoots, ...addonRoots, userRoot]`).

3. **Markdown load (parser)** — `packages/parser/src/core.ts` splits Markdown by `---` separators that aren't inside fenced code blocks or HTML comments, runs YAML frontmatter through `yaml`, extracts the trailing `<!-- ... -->` as `note`, and emits a `SourceSlideInfo[]`. `packages/parser/src/fs.ts` then resolves `src:` imports (recursively, with frontmatter overrides), watches files, and produces the flat `SlideInfo[]` used downstream. Preparser extensions can `transformRawLines` / `transformSlide` / `transformNote` before AST construction.

4. **Vite server** — `commands/serve.ts` builds an inline Vite config from `commands/shared.ts` and `ViteSlidevPlugin()` (`vite/index.ts`) which composes ~20 plugins (see *Vite plugins* below). Default port 3030, with `--remote` to bind 0.0.0.0 + optional Cloudflare tunnel via `untun`. The CLI also watches files like `setup/shiki.ts`, `setup/preparser.ts`, `uno.config.ts`, `vite.config.{ts,js}` via Chokidar and *restarts* the server when those change.

5. **Virtual modules** — Slidev exposes its data to the client through `/@slidev/*` virtual modules (`packages/slidev/node/virtual/index.ts`):
   - `/@slidev/slides` — array of `{ no, meta, load, component }` per slide (lazy-loaded async components).
   - `/@slidev/layouts` — `{ layoutName: Component }` built by globbing `layouts/**` across all roots.
   - `/@slidev/configs` — flat config object exposed to client (theme, fonts, colorSchema, …).
   - `/@slidev/titles`, `/@slidev/global-layers`, `/@slidev/nav-controls`, `/@slidev/setups/*`, `/@slidev/monaco-types`, `/@slidev/monaco-run-deps`, `/@slidev/conditional-styles`.
   - Per-slide pseudo IDs `${filepath}__slidev_${n}.md` and `.frontmatter` (see `vite/loaders.ts`) for content + frontmatter modules, plus `/@slidev/slides/<n>/md` and `/<n>/frontmatter` *facade* IDs that re-export the source module.

6. **Vue compilation** — The Markdown loader (`vite/markdown.ts`) wraps `unplugin-vue-markdown` and feeds it through Slidev's syntax plugins (see *Markdown→slide pipeline*). The output is a Vue SFC. The layout wrapper plugin (`vite/layoutWrapper.ts`) then wraps that SFC's `<template>` body with `<InjectedLayout v-bind="_frontmatterToProps(...)">…</InjectedLayout>` and injects the slide context (`$clicksContext.setup()`, `$page`, `$slidev`, etc.).

7. **Client boot** — `packages/client/main.ts` → `setup/main.ts` creates a Vue app, registers the router (`setup/routes.ts`), installs the `v-click` / `v-after` / `v-click-hide` / `v-mark` / `v-drag` / `v-motion` directives, sets up Shiki / Monaco / Mermaid / shortcuts / code runners, and mounts. Routes:
   - `/:no` → `pages/play.vue` (presentation)
   - `/presenter/:no` → `pages/presenter.vue`
   - `/overview` → `pages/overview.vue`
   - `/notes` / `/notes-edit` → speaker notes views
   - `/print` → `pages/print.vue` (used by Playwright for PDF export)
   - `/export` → `pages/export.vue` (in-browser exporter)
   - `/entry` → mobile/remote QR entry

8. **Sync layer** — Presenter ↔ main window ↔ remote phone share state via a `BroadcastChannel` (same-origin) or `vite-plugin-vue-server-ref` (cross-origin remote). See `client/state/syncState.ts`, `client/state/shared.ts`. Drawings sync over the same machinery.

9. **Export** — Playwright drives a headless Chromium against a temporary Vite dev server. `commands/export.ts` navigates either to `/print` (one-piece, fastest) or per-slide URLs (PNG/PPTX, or PDF with `--per-slide`), waits for slide-loaded sentinels (`.slidev-slide-loading`, `data-waitfor`, Mermaid container) and emits PDF/PNG/PPTX/MD.

## Authoring format

A real example from `/Users/jluterek/code/jluterek/slides/reference-applications/slidev/demo/starter/slides.md`:

```md
---
theme: seriph
background: https://cover.sli.dev
title: Welcome to Slidev
class: text-center
drawings:
  persist: false
transition: slide-left
comark: true
duration: 35min
---

# Welcome to Slidev

Presentation slides for developers

<div @click="$slidev.nav.next" class="mt-12 py-1" hover:bg="white op-10">
  Press Space for next page <carbon:arrow-right />
</div>

<!--
The last comment block of each slide will be treated as slide notes.
-->

---
transition: fade-out
---

# What is Slidev?

- 📝 Text-based
- 🎨 Themable
```

Notes about the format:

- **Headmatter** (the first frontmatter block) holds deck-wide config (`theme`, `title`, `aspectRatio`, `canvasWidth`, `transition`, `drawings`, `monaco`, `fonts`, `seoMeta`, `colorSchema`, `routerMode`, `record`, `presenter`, …). See `packages/types/src/frontmatter.ts` for the full `HeadmatterConfig` and `packages/types/src/config.ts` for resolved config. Defaults live in `packages/parser/src/config.ts::getDefaultConfig()`.
- **Per-slide frontmatter** can override `layout`, `class`, `clicks`, `clicksStart`, `transition`, `level`, `routeAlias`, `zoom`, `hide`, `src` (import), `dragPos`, `clickAnimation`, `preload`, `hideInToc`.
- **Slide separator** is `---` on its own line. Parser is careful not to split inside fenced code blocks (it skips lines beginning with a matching backtick run) or HTML comments (`advanceHtmlCommentState`).
- **Two YAML styles** are supported: classic `---\n…\n---` and a *block-frontmatter* style (a leading ` ```yaml … ``` ` block) — see `parseSlide` in `packages/parser/src/core.ts` lines 75–104.
- **Notes** are the *last* HTML comment in a slide. Click-sync markers `[click]`, `[click:3]` inside notes are rewritten by `vite/loaders.ts::renderNote` to `<span class="slidev-note-click-mark" data-clicks="…"/>` so the presenter view can highlight notes that correspond to the current click.
- **Two-column slot sugar** uses `::name::` markers, transformed by `packages/slidev/node/syntax/slot-sugar.ts` into `<template v-slot:name="slotProps">…</template>`. This is what powers the `two-cols` layout's `::right::` syntax.
- **External code snippets** use `<<< @/snippets/file.ts#region {options}` — see `packages/slidev/node/syntax/snippet.ts`. Region markers in many syntaxes are recognised (`// #region foo … // #endregion foo`, `<!-- #region -->`, `(* #region *)`, etc.).
- **Slide imports** use `src:` in frontmatter: `src: ./pages/imported-slides.md`. The importer's frontmatter is merged into the imported slide (override semantics in `packages/parser/src/fs.ts::loadSlide`).
- **Embedded Vue/HTML** is fully allowed because Markdown is compiled to a Vue SFC. `<script setup>` blocks inside the Markdown become the slide's setup script (see the `motions` slide in `demo/starter/slides.md`).
- **UnoCSS attribute syntax** like `hover:bg="white op-10"` and atomic classes are valid because the project ships UnoCSS with `@unocss/extractor-mdc` and `@unocss/preset-mini`.

## Features (comprehensive catalog)

### Authoring & parser

- Slide separator + frontmatter + notes + block-frontmatter — `packages/parser/src/core.ts`.
- Slide imports (`src:`) with frontmatter merge — `packages/parser/src/fs.ts::loadSlide`.
- Range strings (`"1,3-5,8"`) for printing/exporting — `packages/parser/src/utils.ts::parseRangeString`.
- Time string parsing (`30min`, `2:05`, `+10s`) — `packages/parser/src/timesplit/`.
- Image extraction (used for preloading) — `packages/parser/src/core.ts::extractImagesUsage`.
- Auto-detected features for build-time tree shaking (KaTeX, Monaco, Tweet, BlueSky, Mermaid) — `packages/parser/src/core.ts::detectFeatures`.
- Preparser extensions — a deck can ship `setup/preparser.ts` that mutates raw lines, slide content, or notes before parsing. Wired in `packages/slidev/node/setups/preparser.ts` via `injectPreparserExtensionLoader`.

### Layouts (built-in)

All 21 built-in layouts live in `packages/client/layouts/` (each a single Vue SFC):

`404.vue`, `center.vue`, `cover.vue`, `default.vue`, `end.vue`, `error.vue`, `fact.vue`, `full.vue`, `iframe-left.vue`, `iframe-right.vue`, `iframe.vue`, `image-left.vue`, `image-right.vue`, `image.vue`, `intro.vue`, `none.vue`, `quote.vue`, `section.vue`, `statement.vue`, `two-cols-header.vue`, `two-cols.vue`.

The TypeScript union is `BuiltinLayouts` in `packages/types/src/builtin-layouts.ts`. Layouts are resolved by globbing `layouts/**` across `[clientRoot, ...themeRoots, ...addonRoots, userRoot]` in `packages/slidev/node/options.ts::getLayouts` — *later roots override earlier ones*, so a theme or addon can shadow `cover.vue` by shipping the same filename. The user's project takes top precedence.

Layout selection happens at compile time in `packages/slidev/node/vite/layoutWrapper.ts`:

```ts
let layoutName = rawLayoutName || (index === 0 ? 'cover' : 'default')
```

Two-column example (`packages/client/layouts/two-cols.vue`) uses `<slot/>` + `<slot name="right"/>` and `::right::` slot-sugar in the markdown produces the right slot.

### Click animations (`v-click` and friends)

The click model is the centerpiece of Slidev's runtime. Concepts (defined in `packages/types/src/clicks.ts`):

- `ClicksContext` — per-slide, carries `current` (the click index), `clicksStart`, `relativeSizeMap`, `maxMap`, and `calculate(at)` / `calculateRange(at)`.
- A *click* can be addressed as an absolute number (`v-click="3"`), a relative offset (`v-click="'+1'"`, `'+0'` = `v-after`), or a range `v-click="[2, 5]"`.

Three Vue directives are installed by `packages/client/modules/v-click.ts::createVClickDirectives`:

- `v-click` — resolves via `resolveClick()`, toggles classes `slidev-vclick-target`, `slidev-vclick-hidden`, `slidev-vclick-current`, `slidev-vclick-prior` and an animation class `slidev-vclick-{animation}` (e.g. `fade`, `up`, `scale`, composable: `v-click.fade.right.scale`).
- `v-after` — sugar for `v-click="'+0'"`.
- `v-click-hide` — *hides* the element when active (the inverse).

The matching components are in `packages/client/builtin/`:

- `VClick.ts` — wraps a single child via `<VClicks every={CLICKS_MAX}/>` so an entire VNode tree gets one click step. Has `wrapText` for wrapping bare text in `<span>`.
- `VClicks.ts` — assigns sequential click numbers to children, with `every` (chunk size), `depth` (recurse into lists), and special handling for `ul`/`ol`/`table`. After all children there's a `VClickGap.vue` to consume the remaining clicks if any.
- `VAfter.ts`, `VClickGap.vue`, `VSwitch.ts`.

Implementation of the click counter (`packages/client/composables/useClicks.ts::createClicksContextBase`):

```ts
get total() {
  return clicksTotalOverrides
    ?? (isMounted.value
      ? Math.max(0, ...maxMap.values())
      : 0)
},
```

So total clicks for a slide are inferred from all registered `v-click` directives unless the frontmatter sets `clicks:` explicitly. Each `register(el, info)` records the element's `delta` and `max`. `calculateSince` for relative `+1` uses the running `currentOffset` (sum of deltas) so things stack:

```ts
if (typeof at === 'string') {
  const offset = context.currentOffset
  const value = +at
  start = offset + value
  max = offset + value + size - 1
  delta = value + size - 1
}
```

Navigation (`packages/client/composables/useNav.ts`):

```ts
async function next() {
  if (clicksTotal.value <= queryClicks.value) await nextSlide()
  else queryClicks.value += 1
}
```

The current click is stored as a URL query param `?clicks=N` (`useRouteQuery('clicks', '0')`), so deep linking and back/forward survive.

### Slide transitions

`packages/types/src/frontmatter.ts::BuiltinSlideTransition` declares: `fade`, `fade-out`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `view-transition`. CSS lives in `packages/client/styles/transitions.css`.

Two implementations work in parallel:

- For most transitions, `SlidesShow.vue` (`packages/client/internals/SlidesShow.vue`) renders all slides inside a Vue `<TransitionGroup>` with `v-show` toggling, so leave/enter classes (`slide-left-enter-from`, etc.) play CSS transitions.
- For the `view-transition` name, `packages/client/composables/useViewTransition.ts` hooks `router.beforeResolve` and calls `document.startViewTransition(() => changeRoute())` after a 50ms tick (to let `TransitionGroup` collapse to a normal `div`). Falls back to a warning if unsupported.

The direction logic uses `transitionResolveMap` in `packages/client/logic/transition.ts` so `slide-left | slide-right` is also a valid name (forward | backward).

### Code: Shiki, Magic Move, Monaco, twoslash, line highlighting

- **Shiki** is the only highlighter (Prism is dropped — see `parser/src/config.ts` lines 107–109). Configured per-deck via `setup/shiki.ts` (`packages/slidev/node/setups/shiki.ts`). Themes, languages, and transformers are user-extensible. Slidev attaches its own transformer that adds `slidev-code` class and removes `tabindex`. Wrapper component: `packages/client/builtin/CodeBlockWrapper.vue` (line numbers, max-height, copy button).
- **Line highlighting** uses the standard `{1,3-5}` or click syntax `{1|2-3|all}` parsed via `normalizeRangeStr` in `packages/slidev/node/syntax/utils.ts` and applied at runtime via `updateCodeHighlightRange` in `packages/client/logic/utils.ts`.
- **Twoslash** is provided by `@shikijs/vitepress-twoslash` and `@shikijs/twoslash` (`packages/slidev/node/syntax/shiki.ts`). Triggered by `twoslash` flag in fence info. Conditional `v-menu` rewrite (`transformerTwoslashConditional`) hides hover popovers for non-active slides.
- **Magic Move** — the big-bang animated diff between code snippets. Powered by `@shikijs/magic-move`. The codeblock transformer at `packages/slidev/node/syntax/codeblock/magic-move.ts` matches a 4-backtick fence with info `md magic-move` and inner fenced code blocks. Each step is tokenized through Shiki and *keyed* via `toKeyedTokens(code, tokens, themeJsonKey, lineNumbers)`. All steps are lz-string-compressed and embedded in the rendered `<ShikiMagicMove>`:

  ```html
  <ShikiMagicMove v-bind="{lines: true}" steps-lz="..." :title='""' :step-ranges='[["1"], ["1-2"], ...]' />
  ```

  Runtime: `packages/client/builtin/ShikiMagicMove.vue` decompresses, registers `clickCounts = sum(rangeLengths)` clicks with the click context, watches `clicks.current`, and drives `<ShikiMagicMovePrecompiled :steps :step :options="{globalScale, duration, stagger}">`. It also re-applies line highlighting on each tick.

- **Monaco editor** — `packages/client/builtin/Monaco.vue`. Auto-triggered by fence info `{monaco}` (read-only edit), `{monaco-run}` (runnable, with output panel), or `{monaco-write}` (writes back to disk in dev). Types are loaded either locally from `node_modules` or via `@typescript/ata` (frontmatter `monacoTypesSource: 'cdn' | 'local' | 'none'`). The codeblock transformer at `packages/slidev/node/syntax/codeblock/monaco.ts` (linked from `index.ts`) lz-compresses code into the component prop.
- **Code groups** — `<CodeGroup>` component (`packages/client/builtin/CodeGroup.vue`); rendered via Comark directive `::code-group{…}` when `comark: true` is on.
- **Snippet import** — `<<< @/snippets/file.ts#region {options}` — `packages/slidev/node/syntax/snippet.ts`. Files are added to `watchFiles` so editing the source triggers per-slide HMR.

### Math (KaTeX)

`packages/slidev/node/syntax/katex.ts` is a port of `markdown-it-katex`. Inline `$x$` and block `$$ ... $$`. Block-level supports per-click reveal via `$$ {1|3|all}\n…\n$$` — the trailing range is parsed and emitted as `<KaTexBlockWrapper :ranges='…'>`. The wrapper (`packages/client/builtin/KaTexBlockWrapper.vue`) splits the rendered KaTeX into lines and re-applies highlighting per click step (same machinery as code blocks).

KaTeX is conditionally loaded (`detectFeatures.katex`) — slides without `$…$` don't pay the cost.

### Diagrams (Mermaid, PlantUML)

- **Mermaid** is processed in `packages/slidev/node/syntax/codeblock/mermaid.ts` (transformer) and rendered by `packages/client/builtin/Mermaid.vue` via the `renderMermaid` helper in `packages/client/modules/mermaid.ts`. The SVG is mounted inside a `<ShadowRoot>` to isolate Mermaid's CSS.
- **PlantUML** — `packages/client/builtin/PlantUml.vue`. Server-side renderer at the URL set in `config.plantUmlServer` (default `https://www.plantuml.com/plantuml`). The code is encoded with `plantuml-encoder`.

Both support `{theme: 'neutral', scale: 0.8}` options in fence info, parsed as YAML.

### Drawing/annotation overlay

Powered by **Drauu** (Anthony Fu's library). Composable: `packages/client/composables/useDrawings.ts`. Component: `packages/client/internals/DrawingLayer.vue`. Brush colors, modes (stylus/line/arrow/rectangle/ellipse/eraser), undo/redo, and keyboard shortcuts (`L` line, `A` arrow, `S` stylus, `R` rect, `E` ellipse, `C` clear, `1-7` color). Drawings persist as numbered SVG files in `.slidev/drawings/<deck>/` when `drawings.persist: true`. Server-side I/O at `packages/slidev/node/integrations/drawings.ts`. Sync across windows via the shared `BroadcastChannel` (presenter ↔ audience) when `syncAll: true`.

### Camera & recording

`packages/client/logic/recording.ts`. Uses **RecordRTC** (lazy-imported) plus `@fix-webm-duration/fix` to repair WebM duration. Supported MIME types: `video/webm`, `video/webm;codecs=h264` (→ mp4), `video/x-matroska;codecs=avc1` (→ mkv). Two streams are captured: camera+mic (`getUserMedia`) and screen (`getDisplayMedia` at user-chosen resolution/frameRate/bitrate). They're saved as two files. Camera-only avatar preview is `packages/client/internals/WebCamera.vue`. Devices are listed via `@vueuse/core::useDevicesList`. UI: `packages/client/internals/RecordingControls.vue`, `RecordingDialog.vue`.

### Presenter mode

`packages/client/pages/presenter.vue` (600 lines) renders three switchable grid layouts (current slide, next slide, notes, controls), all resizable, with persistent sizes in `useLocalStorage`. Specifics:

- The presenter window opens on the route `/presenter/:no` (see `setup/routes.ts`).
- Three-layout grid is keyboard-toggleable and adapts to wide / stacked / portrait aspect ratios via `useMediaQuery`.
- **Next-slide preview** renders a *separate* `ClicksContext` so the preview shows what the next click will produce, even mid-slide.
- **Speaker notes** — Markdown notes are rendered to HTML server-side (`packages/slidev/node/vite/loaders.ts::renderNote`) with click markers. Edit mode (`NoteEditable.vue`) POSTs back to the dev server (the loader plugin handles `POST /__slidev/slide/:no` and rewrites the source markdown via `parser.save`).
- **Timer / TimerBar** — `packages/client/composables/useTimer.ts`. Supports stopwatch and countdown modes. Duration comes from `duration: '35min'` in frontmatter and is parsed with `parseTimeString`. Timer state is part of `sharedState.timer` so the presenter, audience, and remote phone all stay in sync.
- **Camera mirror** — A presenter can flip the current slide pane to a screen-mirror of the audience window via `internals/ScreenCaptureMirror.vue`.
- **Sync** — All of this rides on `client/state/syncState.ts` (see below).

### Mobile remote control

`--remote` (CLI flag, optionally `--remote <password>`) binds the dev server to `0.0.0.0` and prints LAN URLs + a QR code (via `uqr`). The phone connects to `http://<lan-ip>:3030/entry?password=…`, which is `client/pages/entry.vue`. From there, the phone gets a touch-friendly NavControls + slider. Optional Cloudflare Quick Tunnel via `untun` when `--tunnel` is also passed (see `packages/slidev/node/cli.ts` lines 196–229).

### Themes

Theme system (`packages/slidev/node/integrations/themes.ts`):

```ts
const officialThemes: Record<string, string> = {
  'none': '',
  'default': '@slidev/theme-default',
  'seriph': '@slidev/theme-seriph',
  'apple-basic': '@slidev/theme-apple-basic',
  'shibainu': '@slidev/theme-shibainu',
  'bricks': '@slidev/theme-bricks',
}
```

A theme is a regular npm package with a `slidev` key in its `package.json` (its `SlidevThemeMeta`: `defaults`, `colorSchema`, `highlighter`) and any of:

- `layouts/*.vue` — shadows built-in layouts.
- `styles/index.ts` — global styles.
- `setup/*.ts` — hook into Shiki/Monaco/Mermaid/main/code-runners/preparser/transformers/shortcuts/routes.
- `components/*.vue` — auto-imported via `unplugin-vue-components`.
- `global-top.vue` / `global-bottom.vue` — persistent layers on every slide.

Theme resolution: `resolveTheme(themeRaw, entry)` (in `packages/slidev/node/resolver.ts`) tries (1) the user project, (2) globally installed packages, (3) installs on demand via `@antfu/ni`. `slidev theme eject` (`packages/slidev/node/cli.ts` lines 415–462) copies the entire theme package into the user project so they can edit it.

Engine compatibility is enforced via `engines.slidev` in the theme's `package.json` and `semver.satisfies(slidev.version, themeEngines.slidev)`.

### Addons

`packages/slidev/node/integrations/addons.ts`. Addons are also npm packages with `slidev` in their `package.json` and can ship `layouts/`, `components/`, `setup/`, `styles/`, etc. — exactly like themes, minus the `defaults`. Loaded from `headmatter.addons: ['my-addon']` or `package.json::slidev.addons`. Addons can declare nested addons.

### Components library (`@slidev/client/builtin`)

User-callable directly in markdown:

| Component | Purpose |
| --- | --- |
| `Arrow`, `VDragArrow` | SVG arrows. |
| `AutoFitText` | Auto-resizing text. |
| `BlueSky`, `Tweet`, `Youtube`, `SlidevVideo` | Embed social/media. |
| `CodeBlockWrapper`, `CodeGroup` | Code presentation. |
| `KaTexBlockWrapper` | Math reveal. |
| `LightOrDark` | Render different content per color scheme. |
| `Link` | Internal slide link with routing. |
| `Mermaid`, `PlantUml` | Diagram render. |
| `Monaco`, `ShikiMagicMove` | Code editors / animation. |
| `PoweredBySlidev` | Branding badge. |
| `RenderWhen` | Conditional render (slide / presenter / print / etc.). |
| `SlideCurrentNo`, `SlidesTotal` | Slide number display. |
| `Toc`, `TocList` | Auto-generated table of contents from slide titles. |
| `Transform` | Scale wrapper for arbitrary content. |
| `VClick`, `VAfter`, `VClicks`, `VClickGap`, `VSwitch` | Click animation primitives. |
| `VDrag`, `VDragArrow` | Draggable elements (positions stored in frontmatter `dragPos`). |

Plus auto-imported user components in `components/*.vue` (via `unplugin-vue-components`).

### Export: PDF, PNG, PPTX, MD, SPA

- **CLI** — `slidev export [entry..] --format pdf|png|pptx|md --output … --with-clicks --with-toc --per-slide --range "1,3-5" --dark --scale 2 --omit-background`. Source: `packages/slidev/node/commands/export.ts`.
- **PDF** has two modes:
  - *One-piece* (`/print` page): one `page.pdf()` call with all slides on one long page, leverages `preferCSSPageSize`. Faster, supports TOC outlines via `@lillallol/outline-pdf`, supports cross-slide links.
  - *Per-slide* (`--per-slide`): visit each `/:no?clicks=…` separately; better for global iframes, but no cross-links. PDFs are merged with `pdf-lib`.
- **PNG**: `page.screenshot()` on each `.print-slide-container` or per slide. Supports `--with-clicks` so each click becomes a separate frame.
- **PPTX**: generates PNGs, then composes via `pptxgenjs`, embedding each PNG as a slide background and the original markdown note as the speaker note.
- **MD**: emits PNGs in a folder and a Markdown file referencing them, with notes.
- **In-browser export** (`/export` route, `pages/export.vue`) — same idea, runs entirely in the user's browser, no Playwright needed. Now the recommended path (see CLI hint at lines 484–491 of `cli.ts`).
- **SPA** — `slidev build` builds a static SPA via Vite. Copies `index.html` to `404.html` (GitHub Pages SPA hack). Writes `_redirects` (Netlify). Optional `--download` bundles a PDF into the SPA. Optional OG image generation by exporting slide 1 as PNG via Playwright at build time. Source: `packages/slidev/node/commands/build.ts`.

### Hot reload (Vite)

`packages/slidev/node/vite/loaders.ts::handleHotUpdate` is the heart. Pseudo flow:

1. `chokidar` watches `slides.md` + imported files + theme/addon dirs.
2. On change, the loader re-parses with `serverOptions.loadData()` (the CLI re-resolves the config so it can detect "needs full restart" cases: theme change, `monaco`/`routerMode`/`fonts`/etc.).
3. For each slide it diff-checks `content`, `title`, `frontmatter`, `note`. Notes-only changes are sent via a custom HMR event `slidev:update-note`. Content changes emit `slidev:update-slide`. Module IDs for the virtual `/@slidev/slides` and per-slide `__slidev_*.frontmatter` are invalidated.
4. Markdown source IDs and frontmatter IDs are tracked separately so frontmatter-only edits don't reload the SFC.

This is what lets slide-scoped style edits, click animations, and frontmatter changes feel instant.

### VS Code extension

`packages/vscode/`. Highlights:

- Slide tree view + preview pane.
- Custom TextMate grammar `syntaxes/slidev.tmLanguage.json` (auto-injects into Markdown).
- Language server (`language-server/`) via `@volar/language-server` for YAML completion of frontmatter using a JSON schema generated by `ts-json-schema-generator`.
- **Copilot/AI tools** (`contributes.languageModelTools` in `packages/vscode/package.json`): `slidev_getActiveSlide`, `slidev_getSlideContent`, `slidev_getAllSlideTitles`, `slidev_findSlideNoByTitle`, `slidev_listEntries`, `slidev_getPreviewPort`. These are MCP-shaped tools exposed to GitHub Copilot Chat — the Slidev VS Code extension is effectively an MCP server living inside the editor.

### Type system

`packages/types/src/index.ts` re-exports everything. Notable files:

- `frontmatter.ts` — `Headmatter`, `HeadmatterConfig` (with full JSDoc — used to drive the VS Code JSON schema), `Frontmatter`, `BuiltinSlideTransition`, `TransitionOptions`, `SeoMeta`, `FontOptions`, `DrawingsOptions`.
- `config.ts` — `SlidevConfig`, `ResolvedExportOptions`.
- `types.ts` — `SlidevMarkdown`, `SourceSlideInfo`, `SlideInfo`, `SlidePatch`, `SlidevPreparserExtension`, `SlideRoute`, `RenderContext`, `SlidevDetectedFeatures`.
- `clicks.ts` — `RawAtValue`, `NormalizedAtValue`, `ClicksInfo`, `ClicksContext`.
- `builtin-layouts.ts` — the layout name union.
- `options.ts` — `ResolvedSlidevOptions`, `ResolvedSlidevUtils`, `SlidevEntryOptions`.
- `setups.ts`, `vite.ts`, `transform.ts`, `hmr.ts`, `code-runner.ts`, `cli.ts`, `context-menu.ts`, `toc.ts`.

### MCP plugin (Claude Code)

The repo contains `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — a Claude Code skill marketplace declaration:

```json
{
  "name": "slidev",
  "version": "1.0.0",
  "description": "Claude Code skill for creating and presenting Slidev slidedecks",
  ...
}
```

The actual skill content is in `skills/slidev/SKILL.md` + `skills/slidev/references/*.md` (about 47 reference markdown files covering syntax, layouts, animations, recording, exporting, etc.) — these are loaded by Claude Code as a context bundle when working with Slidev. The bundle is also exported with `@slidev/cli` via `package.json::files` ("`skills`" is included). There is also `skills/GENERATION.md` describing how the skill was generated.

Note: there is **no Node-side MCP server** in Slidev — the only MCP-shaped functionality is the *VS Code* `languageModelTools` exposed to Copilot.

## Authoring API (developer-facing)

Public client API (`packages/client/index.ts`):

- Composables: `useNav()`, `useDarkMode()`, `useDrawings()`.
- Slide context: `useSlideContext()` — returns `{ $slidev, $nav, $clicksContext, $clicks, $page, $route, $renderContext, $frontmatter, $scale, $zoom }`. Path: `packages/client/context.ts`.
- Slide lifecycle hooks: `onSlideEnter(fn)`, `onSlideLeave(fn)`, `useIsSlideActive()` — `packages/client/logic/slides.ts`.
- Drawing state: `drawingState`, `onDrawingUpdate`.
- Shared state across windows: `sharedState`, `onSharedUpdate`.
- Sync hooks: `addSyncMethod`, `createSyncState`, `disableBuiltinSync` — to plug in custom sync (Slack, WebRTC, …).
- Misc: `lockShortcuts`, environment (`configs`, `slidesTitle`).

User project structure (created by `create-slidev`):

```
slides.md
components/<MyComponent>.vue          # auto-imported
pages/<imported>.md                   # referenced via `src:`
snippets/<external>.ts                # referenced via `<<< @/snippets/...`
public/                               # static assets
setup/                                # custom setups: shiki.ts, katex.ts, …
layouts/<my-layout>.vue               # shadow / add layouts
global-top.vue / global-bottom.vue    # persistent global layers
styles/index.ts                       # extra styles
uno.config.ts                         # extend UnoCSS
vite.config.ts                        # extend Vite
```

Theme/addon project structure mirrors the user project with one addition: a `slidev` key in `package.json` declaring defaults and color scheme.

## Notable libraries & dependencies

Pulled from `packages/slidev/package.json`, `packages/client/package.json`, and `pnpm-workspace.yaml`'s catalog:

**Core**
- `vite` (`^8`) — bundler/dev server. `@vitejs/plugin-vue`, `@vitejs/plugin-vue-jsx`.
- `vue` (`^3.5.35`), `vue-router` (`^5`).
- `unplugin-vue-markdown` — turns `.md` into Vue SFCs.
- `unplugin-vue-components` — auto-imports user components.
- `unplugin-icons` + `@iconify-json/{carbon,mdi,ph,ri,svg-spinners}` — `<carbon-edit/>` syntax.
- `unocss` + `@unocss/extractor-mdc` + `@unocss/preset-mini` + `@unocss/reset` — Atomic CSS.

**Markdown pipeline**
- `markdown-exit` — the Markdown-It-compatible parser they use.
- `@shikijs/markdown-it`, `@hedgedoc/markdown-it-plugins` (task lists), `markdown-it-footnote`, `markdown-it-github-alerts`, `@comark/markdown-it` (MDC syntax).
- `magic-string`, `magic-string-stack` — source-preserving rewrites.
- `gray-matter`, `yaml`, `js-yaml` — frontmatter.

**Code/highlighting**
- `shiki` (`^4.2.0`), `@shikijs/magic-move`, `@shikijs/twoslash`, `@shikijs/vitepress-twoslash`, `@shikijs/monaco`, `tm-grammars`.
- `monaco-editor` (`^0.55`), `@typescript/ata` — Monaco runtime + ambient types from a CDN.
- `lz-string` — compress code embeds in the rendered HTML.

**Math/diagrams**
- `katex` (`^0.17`).
- `mermaid` (`^11`).
- `plantuml-encoder`.

**Drawing/motion**
- `drauu` (`^1`) — drawing.
- `@slidev/rough-notation` — `v-mark` rough annotations.
- `@vueuse/motion` (`^3`) — `v-motion`.
- `floating-vue` — tooltips for twoslash.

**Recording**
- `recordrtc` (`^5.6.2`).
- `@fix-webm-duration/fix`.

**Export**
- `playwright-chromium` (peer-optional). Resolution strategy at `commands/export.ts::importPlaywright` tries user root → workspace root → global → bundled.
- `pdf-lib`, `@lillallol/outline-pdf` — PDF mutation & TOC.
- `pptxgenjs` — PPTX generation.

**Server**
- `connect`, `sirv`, `get-port-please`, `chokidar`, `untun` (Cloudflare tunnel), `vite-plugin-vue-server-ref` (cross-window sync), `vite-plugin-remote-assets` (cache remote images locally), `vite-plugin-static-copy`, `vite-plugin-inspect`.
- `uqr` — terminal QR codes.

**Vue/utility**
- `@vueuse/core`, `@vueuse/math`, `@unhead/vue`.
- `@antfu/utils`, `@antfu/ni`, `mlly`, `local-pkg`, `jiti`, `picomatch`, `fast-glob`, `fast-deep-equal`.

## Code patterns worth studying

### Markdown → slide AST (parser package)

Self-contained in `packages/parser/src/core.ts`. The `parse()` function is ~100 lines and does only three things: skip fenced code blocks, skip HTML comments, slice on `---`. Frontmatter is YAML-parsed lazily (`noParseYAML` option). Two parallel APIs (`parse` async + `parseSync`) so prettier/eslint can be sync but the dev server can be async (preparser extensions can be async). The parser also computes `revision` (a tiny hash of trimmed raw) so HMR can detect "did this slide really change".

### Slide route generation (Vite plugin pattern)

`packages/slidev/node/virtual/slides.ts` builds a JS module like:

```js
import { defineAsyncComponent, shallowRef } from 'vue'
import SlideError from '<errorLayout>'
import SlideLoading from '@slidev/client/internals/SlideLoading.vue'
const componentsCache = new Array(N)
import { meta as f1 } from '/@slidev/slides/1/frontmatter'
const load1 = async () => { try { return componentsCache[0] ??= await import('/@slidev/slides/1/md') } catch (e) {…} }
…
const data = [{ no:1, meta:f1, load:load1, component: getAsyncComponent(0, load1) }, …]
if (import.meta.hot) {
  import.meta.hot.data.slides ??= shallowRef()
  import.meta.hot.data.slides.value = data
  import.meta.hot.dispose(() => componentsCache.length = 0)
  import.meta.hot.accept()
}
export const slides = import.meta.hot ? import.meta.hot.data.slides : shallowRef(data)
```

The clever bits: (1) `shallowRef` survives HMR via `hot.data`; (2) async components let slides be lazily imported; (3) each slide has *two* virtual modules (content `md` + `frontmatter`) so frontmatter HMR doesn't rebuild the SFC.

### Click counter implementation

See `packages/client/composables/useClicks.ts::createClicksContextBase` (already excerpted above). The key idea is **deferred total computation**: total clicks aren't known until all `v-click` directives have run their `mounted` hook and called `register`. Until `isMounted` is `true`, `total = 0`. After mount, `maxMap` becomes `shallowReactive` so subsequent registrations re-trigger totals. `relativeSizeMap` lets a relative `+1` *position* be computed from the cumulative size of preceding directives.

### `v-click` directive

In `packages/client/modules/v-click.ts` — uses `directiveInject` (Vue 3) to read the slide's `ClicksContext` and `Frontmatter` provides. Resolution result is cached on the element (`el.watchStopHandle`). The directive toggles four classes (`-target`, `-hidden`, `-current`, `-prior`) and an arbitrary number of animation classes derived from modifiers (`v-click.fade.right.scale` → `fade right scale`). Animation classes have CSS in `packages/client/styles/vclick.css`.

### View transitions implementation

`packages/client/composables/useViewTransition.ts` (excerpted above). Important detail: `setTimeout(..., 50)` is necessary because `TransitionGroup` is still active when `beforeResolve` fires — the timeout lets Vue swap to a plain `div` first so the View Transitions API sees a stable DOM. The route change happens *inside* `document.startViewTransition()`.

### Magic Move

The pipeline:

1. Build-time: `packages/slidev/node/syntax/codeblock/magic-move.ts` regexes out each inner fence. Each fence is tokenized via `shiki.codeToTokens` then keyed via `toKeyedTokens(code, tokens, themeJsonKey, lineNumbers)`. All steps are lz-string-compressed into a single Vue prop.
2. Runtime: `packages/client/builtin/ShikiMagicMove.vue` decompresses, calls `clicks.calculateSince(at, clickCount-1)` to register exactly `Σ rangeLengths` clicks, watches `clicks.current`, and forwards step + range to `<ShikiMagicMovePrecompiled>` (from `@shikijs/magic-move/vue`) which handles the FLIP-style enter/leave/move animations between identically-keyed tokens.

### Layout resolution & shadowing (theme overrides)

`packages/slidev/node/options.ts::getLayouts`:

```ts
const layoutPaths = await Promise.all(
  [resolved.clientRoot, ...resolved.roots]
    .map(root => fg('layouts/**/*.{vue,js,mjs,ts,mts}', { cwd: root, absolute: true })),
)
for (const layoutPath of layoutPaths.flat(1)) {
  const layoutName = path.basename(layoutPath).replace(RE_FILE_EXTENSION, '')
  layouts[layoutName] = layoutPath
}
```

Later roots silently overwrite earlier ones. Order is `[clientRoot, ...themeRoots, ...addonRoots, userRoot]`, so the user always wins; theme overrides defaults; addons can fill gaps. The 2-second cache (`_layouts_cache`) prevents repeated globbing during a single HMR cycle.

The layout is *injected* into the rendered SFC at compile time (`packages/slidev/node/vite/layoutWrapper.ts`):

```ts
return [
  templatePart.slice(0, bodyStart),
  `<InjectedLayout v-bind="_frontmatterToProps($frontmatter,${index})">\n${body}\n</InjectedLayout>`,
  templatePart.slice(bodyEnd),
  scriptPart.slice(0, setupTag[0].length),
  `import InjectedLayout from "${toAtFS(layouts[layoutName])}"`,
  templateImportContextUtils,
  templateInitContext,
  '$clicksContext.setup()',
  templateInjectionMarker,
  scriptPart.slice(setupTag[0].length),
].join('\n')
```

### Presenter sync

`packages/client/state/syncState.ts` is the abstraction. The default `builtinSync` opens a `BroadcastChannel(channelKey)` when `__SLIDEV_HAS_SERVER__` is false *or* uses `vite-plugin-vue-server-ref` (when running against a dev server) so multiple browsers / windows / phones connected to the same dev server see the same `sharedState` (current slide, click index, timer state, cursor pos, drawings). The `addSyncMethod` API lets a deck author register an additional sync backend (e.g. Y.js, WebRTC, custom WS).

### Camera / recording

Already covered above. The two-stream split (camera+mic vs screen-only video) is a deliberate choice so post-production can compose them. RecordRTC limits are extended to 24h via `timeSlice`. `beforeunload` confirms before navigating away mid-recording.

### PDF export via Playwright

The `/print` route (`packages/client/pages/print.vue`) renders *all* slides into a single document with one `.print-slide-container` per slide, with `@page` CSS sized to `canvasWidth × canvasHeight`. `genPagePdfOnePiece` then calls `page.pdf({ printBackground: true, preferCSSPageSize: true })`. The "wait for slides to load" logic is interesting:

```ts
// Wait for slides to be loaded
const elements = slide.locator('.slidev-slide-loading')
for (let i = 0; i < count; i++) await elements.nth(i).waitFor({ state: 'detached' })
// data-waitfor attribute waits
for (let i = 0; i < count; i++) {
  const attr = await elements.nth(i).getAttribute('data-waitfor')
  await element.locator(attr).waitFor({ state: 'visible' })
}
// Wait for Mermaid container
// Hide Monaco aria container
```

So authors can opt into slide-level "wait" with `<div data-waitfor=".mermaid svg" />`.

### PPTX export

`packages/slidev/node/commands/export.ts::genPagePptx` — generates PNG buffers for every slide (or click), defines a custom PowerPoint layout matching `canvasWidth × canvasHeight`, embeds each PNG as a slide *background*, and adds the markdown note as the speaker note via `slide.addNotes`. The note text is the raw markdown (no rendering), which is the right call for PPTX where the editor renders its own minimal markup.

### Hot reload of slides.md

The story is `chokidar` → `serverOptions.loadData()` → diff every slide → emit `slidev:update-slide` / `slidev:update-note` HMR custom events. The client subscribes via `vite-plugin-vue-server-ref`. Slide source IDs use the pattern `${filepath}__slidev_${n}.md` and `.frontmatter`; this lets Vite track them as separate modules.

### Frontmatter handling

The clever bit (in `packages/slidev/node/vite/loaders.ts` lines 339–380) is the *per-slide frontmatter module* — it exports both `frontmatter` (a reactive proxy) and a richer `meta` (shallow reactive with `slide`, `clicks`, `transition`, `class`, `layout`, …) so editing frontmatter on disk updates *both* sides reactively without re-rendering the SFC body:

```js
export const frontmatter = import.meta.hot ? import.meta.hot.data.frontmatter : reactive(frontmatterData)
export const meta = shallowReactive({
  get layout(){ return frontmatter.layout },
  get transition(){ return frontmatter.transition },
  get class(){ return frontmatter.class },
  get clicks(){ return frontmatter.clicks },
  …
})
```

### The CLI command structure

`packages/slidev/node/cli.ts` uses `yargs` declaratively:

- Default: `slidev [entry]` with `--port`, `--open`, `--remote`, `--tunnel`, `--bind`, `--base`, `--log`, `--inspect`, `--force`. In-TTY shortcut keys: `r` restart, `o` open, `e` edit in $EDITOR, `q` quit, `c` print QR.
- `build [entry..]` — `--out`, `--base`, `--download`, `--without-notes`, `--router-mode`, plus all export options.
- `export [entry..]` — `--format pdf|png|pptx|md`, `--range`, `--dark`, `--with-clicks`, `--with-toc`, `--per-slide`, `--scale`, `--omit-background`, `--executable-path`.
- `export-notes [entry..]` — separate PDF for notes.
- `format [entry..]` — runs `parser.prettify` + `parser.save`.
- `theme eject` — copies the installed theme into the user project and rewrites frontmatter `theme: ./theme`.

### MCP / Claude Code plugin shape (`.claude-plugin/`)

`.claude-plugin/marketplace.json` is the Claude Code *marketplace* manifest:

```json
{
  "name": "slidev-plugins",
  "owner": { "name": "Anthony Fu", "url": "https://github.com/antfu" },
  "metadata": { "description": "Claude Code plugins for the Slidev presentation framework" },
  "plugins": [
    { "name": "slidev", "source": "./", "description": "Claude Code skill for creating and presenting Slidev slidedecks" }
  ]
}
```

`.claude-plugin/plugin.json` is the plugin manifest itself. The plugin doesn't define commands or tool servers — it's purely a *skill* (documentation bundle) at `skills/slidev/SKILL.md` with structured per-feature reference markdown in `skills/slidev/references/`. When Claude Code activates the skill, those references are loaded into context. The skill is also shipped as a regular npm payload (`@slidev/cli/skills/`) so any AI tool can find it.

## Strengths to learn from

- **Markdown-first ergonomics**. Frontmatter for slide config + `---` for separators is the obvious-in-hindsight format and is now an emerging standard (Marp, Reveal.js do similar). The slot-sugar (`::right::`) is a nice extension.
- **Click model as a first-class primitive**. The `ClicksContext` abstraction, deferred totals, relative-vs-absolute `at` values, ranges, and the fact that *components* (`<v-clicks>`, Magic Move, KaTeX, code highlight ranges) can all register against the same context — that is a great design. We should borrow this wholesale.
- **Magic Move integration**. Embedding the tokenization at build time and shipping compressed steps avoids any runtime tokenization. We should do the same for our animated diff.
- **Layered virtual modules**. The `/@slidev/*` virtual module pattern makes the Node↔client contract explicit, debuggable, and HMR-friendly. The per-slide frontmatter module trick is elegant.
- **Layout/theme/addon resolution via filesystem layering**. No registration, no manifests — just "drop a file in `layouts/`" and it works, with later roots overriding earlier. We should do this.
- **HMR granularity**. Diffing slide-by-slide and choosing between hot-update events vs full reload based on which fields changed is the right call.
- **Browser-driven export**. Driving Playwright against the dev server is straightforward, but the `data-waitfor` opt-in and Mermaid/Monaco/iframe wait logic are good ideas. The in-browser exporter (no Playwright) is even better — we should default to that.
- **Presenter mode UX**. The resizable grid with `next-frame` preview using a *separate* click context is a non-obvious but very valuable feature.
- **Recording in the browser**. Two streams, in-app device picker, MIME negotiation, WebM duration fix. There's no excuse for our framework not to have this — it's ~250 lines.
- **VS Code language model tools**. Exposing slide-aware tools to Copilot is the obvious AI integration. We should ship equivalent MCP tools.
- **Claude Code skill bundle**. Curated, structured reference docs that get loaded into model context — way better than asking the model to grep our codebase. We should ship our own from day one.
- **CLI ergonomics**. In-TTY shortcuts (`r/o/e/q/c`), QR code via `uqr`, Cloudflare quick tunnel — small touches that add up.

## Weaknesses / pain points

- **Vue-only**. Every component, layout, theme, and addon is a Vue 3 SFC. There is no React story. For our Astro + React target this is the single biggest mismatch — almost everything in `packages/client/` would need to be re-implemented in React. (Astro can host Vue *and* React, so we could theoretically interop, but it's friction.)
- **Theming is heavy.** A theme is an npm package with a `slidev` key in its `package.json` and version constraints on the engine. Eject is the answer to most "I want to tweak this" cases, but it then forks you off upstream. We can lower the floor: ship themes as a *folder*, no package, no version.
- **UnoCSS lock-in**. `verifyConfig` literally errors if you set `css` to anything other than `unocss`. That's a strong opinion that limits portability.
- **Monaco bundle is heavy** even when lazily loaded; the `monaco-types` virtual module sources `node_modules/*/dist/*.d.ts` at build time and they get shipped to the client. We can probably skip Monaco entirely and rely on Shiki + a lightweight code-edit experience.
- **Magic Move has a high coupling cost**: it tokenizes at build time with the *current* Shiki theme so changing themes invalidates the artifact, and tokens are lz-compressed in HTML so editor preview is opaque.
- **Click model edge cases**. The implicit "total clicks = max of registered" rule means lazy-mounted components (e.g. inside `v-if`) can change total mid-presentation. The frontmatter `clicks:` override is needed often. We can do better by making clicks declarative in the parser AST rather than discovered at runtime.
- **No collaborative editing**. Sync is one-way per role (presenter is source of truth). For workshops/teaching this is fine; for collaborative authoring it isn't.
- **Markdown parser is custom-rolled**. `markdown-exit` is a fork; multiple plugins (KaTeX, snippet, slot-sugar, drag, github-alerts, footnote, comark, …) are stacked. Not a deal-breaker, but the pipeline is opaque to authors.
- **Web-only presenter cursor / drawings** depend on `BroadcastChannel` and `getUserMedia` so they need same-origin + secure contexts; remote control over the internet needs `vite-plugin-vue-server-ref` + careful CORS.
- **Documentation is split** across `docs/`, `skills/slidev/references/`, and inline JSDoc — sometimes drift between them.

## Relevance to our project

We're building an Astro + TypeScript + React-leaning web-native slides framework with an MCP server. Slidev is our north star and where we should aim higher. Specific takeaways:

1. **Borrow the authoring format wholesale**: `---` separators, YAML frontmatter with `layout`/`class`/`clicks`/`transition`/`src`, trailing-comment notes, slot-sugar (`::name::`), snippet imports (`<<< @/file#region`). This is now a de facto standard and we shouldn't reinvent it. The parser (`packages/parser/src/core.ts`) is ~440 lines of dependency-free Markdown splitting — we can port the *algorithm* directly without bringing Vue.
2. **Borrow the click model**: `ClicksContext` + `v-click`/`v-after`/`v-clicks`/`<v-clicks>` semantics translate cleanly to React via a context provider + a `<Click at="+1">` component. The deferred-totals computation is the trick to copy. Consider doing this *declaratively at parse time* (each `v-click` parsed out of the source MDX/Markdown becomes a known click step) to avoid the discover-on-mount complexity.
3. **Magic Move is killer feature** — we want the same thing. Either use `@shikijs/magic-move` directly (it's framework-agnostic; the Vue wrapper is thin) or port the algorithm. The build-time tokenization + lz-compressed embed pattern is correct.
4. **Recording UX** — we should ship `getDisplayMedia` + `getUserMedia` recording in the box; ~250 lines of code, huge UX win, no need for ffmpeg.
5. **In-browser export first, Playwright as a backup** — Slidev recommends `/export` now and Playwright is the legacy path. We should default to a browser-driven export with `page.print()` style flows (or use the same Playwright trick for high-fidelity PDFs).
6. **MCP plugin shape** — Slidev does this *very* lightly: just a marketplace JSON, a plugin JSON, and a `skills/` directory with structured reference markdown. We can do more — a real MCP *server* (CLI subcommand `mcp-server`) exposing tools like `list_slides`, `get_slide(n)`, `update_slide(n, content)`, `next_slide`, `start_recording`, `export_pdf`. The VS Code `languageModelTools` shape in `packages/vscode/package.json` is a good schema reference (see lines 461–600).
7. **Layout/theme as folders, not packages** — we should keep Slidev's filesystem-layered resolution (later root wins) but drop the npm-package requirement. A theme is `theme/` with `layouts/`, `components/`, `styles/` and an optional `theme.config.ts`.
8. **What we'd do differently for Astro/React**:
   - Author slides in MDX (not Markdown + embedded Vue) so React components and JSX-style attributes are first-class.
   - Use Astro's view transitions API directly instead of a custom transition stack — Astro's `<ViewTransitions/>` already handles named transitions between routes.
   - Use Vite's native virtual modules and HMR but avoid the per-slide-module split — try treating the whole deck as a content collection (Astro content collections) with a custom loader so HMR is built-in.
   - No UnoCSS lock-in; let users bring Tailwind, vanilla-extract, or plain CSS modules. Just ensure default themes ship with a sane CSS reset.
   - No Monaco by default — Shiki + a tiny `<textarea>` is enough for 95% of dev demos; offer Monaco as an opt-in addon.
   - First-class MCP server in `packages/cli` so any AI client (Claude Code, Cursor, Windsurf, Continue, GH Copilot via MCP bridge) can drive the deck.
9. **What to lift directly (smallest effort, biggest win)**: the parser (~440 LOC, MIT), the click model abstraction (~200 LOC), the Magic Move codeblock transformer (~70 LOC) → just embed it as our default code-diff component, the `data-waitfor` pattern for export wait sync, the timer composable, the recording composable, the syncState pattern, the layered layout resolution.
10. **Where to leap ahead**: a real MCP server, a content-collection-backed slide store with multi-deck workspace, collaborative editing (Y.js + CRDT) via the same syncState seam Slidev already has, and an explicit *declarative animation graph* (instead of `v-click` directives runtime-discovered, parse-time AST nodes that list every step) so previews/exports/AI tools all see the same plan.
