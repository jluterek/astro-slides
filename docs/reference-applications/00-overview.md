# Reference Applications — Overview & Comparison

This directory holds long-form research notes on nine open-source slide projects we studied while designing our framework. Each project gets its own deep-dive file with architecture, features, libraries, code excerpts, and our recommended takeaways. **This overview is the synthesis layer**: it lets us answer "what does X already exist?", "who solved this best?", and "what should we lift directly?" without re-reading all nine docs.

## Table of contents

1. [Catalog of reference applications](#catalog)
2. [At-a-glance comparison](#at-a-glance)
3. [Feature support matrix](#feature-matrix)
4. [Library & dependency recommendations](#libraries)
5. [Cross-cutting patterns worth lifting](#patterns)
6. [Anti-patterns to avoid](#anti-patterns)
7. [Recommendations for our framework](#recommendations)
8. [Open questions](#open-questions)
9. [How to use these docs](#using-the-docs)

---

## Catalog of reference applications <a id="catalog"></a>

| Doc | Project | One-line positioning | Status (this snapshot) | Why it matters to us |
| --- | --- | --- | --- | --- |
| [slidev.md](./slidev.md) | **Slidev** | Markdown + embedded Vue dev-focused deck framework on Vite | Active (`v52.16.0`) | Closest spiritual sibling. Mine deeply for parser, click model, Magic Move, recording, MCP-skill bundle. |
| [reveal.js.md](./reveal.js.md) | **reveal.js** | HTML `<section>`-tree presentation framework, the original web slide engine | Active (`v6.0.1`) | Canonical reference for the runtime feature set. Auto-Animate is reveal.js's Morph and is brilliantly small. |
| [spectacle.md](./spectacle.md) | **Spectacle** | React/JSX/MDX deck library by Formidable/Nearform | Active (`v10.2.3`) | Best React-native reference. DOM-walk slide collection + `BroadcastChannel` presenter sync are directly portable. |
| [marp.md](./marp.md) | **Marp** (umbrella + website) | Markdown + YAML + HTML-comment directives, CommonMark-only, plain CSS themes | Active (engine), website docs are partly stubs | Sets the de facto Markdown-slide format. We should be compatible. Engine source lives in separate repos. |
| [impress.js.md](./impress.js.md) | **impress.js** | CSS 3D-transform "camera on an infinite plane" presentations | Maintenance | Camera math + inverse-transform trick are the foundation of any object-continuity / Morph-style transition. |
| [mdx-deck.md](./mdx-deck.md) | **MDX Deck** | First MDX-as-slides project, by jxnblk on Gatsby + Theme UI | Dormant (last release 2020-03) | The 64-line `split-slides.js` + no-op marker components are still the cleanest MDX → deck pipeline. Lift the algorithm, drop the runtime. |
| [WebSlides.md](./WebSlides.md) | **WebSlides** | Vanilla JS + SCSS, landing-page-quality slides from semantic utility classes | Dormant (last meaningful commit 2020) | Pure design DNA: palette, typography, `.flexblock` family, `.wrap`/`.aligncenter` vocabulary. We want this look. |
| [react-slides.md](./react-slides.md) | **react-slides** (misnamed) | An unmodified copy of reveal.js 3.3.0 used to author a React/Redux training deck | Frozen snapshot (2016) | Not a library — refer to `reveal.js.md` for canonical reveal.js info. Folder name is misleading. |
| [PptxGenJS.md](./PptxGenJS.md) | **PptxGenJS** | Pure code-to-`.pptx` generator (no runtime, no UI) | Active (`v4.0.1`) | The PPTX exporter we will depend on directly. Object model and types are gold. |

Eight distinct projects (react-slides is reveal.js). Two are dormant (MDX Deck, WebSlides) but still valuable for ideas. Four are React-native or React-friendly (Spectacle, MDX Deck, the reveal.js React wrapper, PptxGenJS — which is framework-agnostic). One is Vue (Slidev). The rest are vanilla JS or render-only.

---

## At-a-glance comparison <a id="at-a-glance"></a>

| | Author format | Runtime | Renderer | Build | Status | License |
| --- | --- | --- | --- | --- | --- | --- |
| Slidev | Markdown + Vue + YAML | Vue 3 | DOM via SFC | Vite | Active | MIT |
| reveal.js | HTML `<section>` (MD plugin) | Vanilla JS | DOM + CSS3 transforms | Vite | Active | MIT |
| Spectacle | JSX/MDX/Markdown | React 18+ | DOM (portal) | tsup | Active | MIT |
| Marp engine | Markdown + YAML + HTML-comments | Node (engine) | HTML doc, one `<section>` per slide | TS/Rollup | Active | MIT |
| impress.js | HTML + `data-*` attrs | Vanilla JS (ES5 idioms) | CSS 3D camera | `cat` concat | Maintenance | MIT |
| MDX Deck | MDX | React 16 + Gatsby 2 | DOM via React | Gatsby/Webpack | Dormant (2020) | MIT |
| WebSlides | HTML + semantic classes | Vanilla JS (ES2015) | DOM (flex sections) | webpack 3 | Dormant (2020) | MIT |
| PptxGenJS | Imperative JS/TS API | N/A (build-time) | Emits `.pptx` (OOXML zip) | Rollup | Active | MIT |

Five projects use Markdown as the primary author format (Slidev, Marp, reveal.js via plugin, Spectacle's Markdown layer, MDX Deck via MDX). Three are HTML-only (reveal.js without the MD plugin, impress.js, WebSlides). Spectacle/MDX Deck support JSX. PptxGenJS is the only one with no concept of "authoring" at all.

**Three slide-separator conventions** dominate:

- `---` on its own line → Slidev, Marp, MDX Deck, reveal.js markdown plugin, Spectacle Markdown. This is the de facto standard.
- Nested `<section>` → reveal.js (HTML), WebSlides (no nesting; flat sections).
- 3D `data-*` positions → impress.js (entirely different model).

**Recommendation**: adopt `---` separators (with our MDX support letting authors fall back to per-file slides if they prefer).

---

## Feature support matrix <a id="feature-matrix"></a>

| Feature | Slidev | reveal.js | Spectacle | Marp | impress.js | MDX Deck | WebSlides | PptxGenJS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Markdown / MDX authoring | ✅ MD+Vue | ✅ MD plugin | ✅ JSX/MDX/MD | ✅ MD | ❌ HTML-only | ✅ MDX | ❌ HTML-only | ❌ |
| Frontmatter / per-slide config | ✅ YAML | ✅ `data-*` | ✅ JSX props | ✅ YAML + directives | ✅ `data-*` | ✅ exports | ❌ class-only | n/a |
| Layout system | ✅ 21 built-in | ⚠️ `r-stack/hstack/vstack` helpers | ✅ `SlideLayout.*` | ⚠️ CSS only | ❌ | ⚠️ Provider | ✅ utility classes | n/a |
| Theme system | ✅ packages | ✅ SCSS + CSS vars | ✅ styled-system | ✅ CSS + directives | ❌ | ✅ Theme UI 0.3 | ✅ SCSS variables | ⚠️ XML fork |
| Element step-reveal / fragments | ✅ `v-click` model | ✅ `.fragment` | ✅ `<Appear>`/`<Stepper>` | ⚠️ "fragmented lists" | ✅ substep plugin | ✅ `<Appear>` | ❌ | n/a |
| Slide transitions | ✅ CSS + View Transitions | ✅ CSS (fade/slide/convex/concave/zoom) | ✅ `react-spring` | ✅ View Transitions API | ✅ 3D camera | ⚠️ basic | ✅ CSS keyframes | ❌ |
| Object continuity / Morph | ⚠️ via Magic Move (code only) | ✅ Auto-Animate (FLIP) | ❌ | ⚠️ via `view-transition-name` | ⚠️ camera math | ❌ | ❌ | ❌ |
| Code blocks + syntax highlighting | ✅ Shiki + Twoslash | ✅ highlight.js | ✅ react-syntax-highlighter (Prism) | ✅ highlight.js | ❌ (extras) | ✅ via theme | ⚠️ raw `<pre>` | ❌ |
| Animated code diff | ✅ Magic Move | ⚠️ via Auto-Animate on `<pre>` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Math | ✅ KaTeX | ✅ KaTeX + MathJax | ⚠️ custom | ✅ MathJax (default) + KaTeX | ❌ | ⚠️ via plugin | ❌ | ❌ |
| Diagrams (Mermaid/PlantUML) | ✅ both | ❌ (community) | ❌ | ⚠️ via plugin | ❌ | ❌ | ❌ | ❌ |
| Drawing / annotation overlay | ✅ drauu | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Camera / mic recording | ✅ RecordRTC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Presenter / speaker mode | ✅ rich | ✅ postMessage popup | ✅ `BroadcastChannel` | ⚠️ minimal (bespoke template) | ❌ | ✅ localStorage | ❌ | n/a |
| Mobile remote control | ✅ QR + LAN | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | n/a |
| URL deep links (per-slide) | ✅ `/:no` | ✅ `#/h/v` | ✅ `?slideIndex=` | ⚠️ partial | ✅ `#/stepId` | ⚠️ `/#3` | ✅ `#slide=N` | n/a |
| PDF export | ✅ Playwright + in-browser | ✅ browser print | ✅ print mode | ✅ Puppeteer | ❌ | ✅ Puppeteer | ⚠️ basic print CSS | n/a |
| PPTX export | ✅ via PptxGenJS (image-based) | ❌ | ❌ | ✅ via Puppeteer + image | ❌ | ❌ | ❌ | ✅ native |
| PNG / video export | ✅ both | ❌ | ❌ | ✅ PNG/JPEG | ❌ | ❌ | ❌ | ❌ |
| Hot reload | ✅ Vite + per-slide HMR | ⚠️ via Vite dev server | ⚠️ via host bundler | ⚠️ CLI watch | ❌ | ⚠️ `gatsby develop` | ⚠️ webpack-dev-server | n/a |
| Plugin / addon system | ✅ npm packages | ✅ `{id, init}` | ❌ (use React) | ⚠️ Marpit plugins | ✅ event-bus | ⚠️ Gatsby plugins | ✅ registry | n/a |
| SSR / static pre-render | ⚠️ SPA build | ⚠️ SPA build | ❌ (CSR only) | ✅ HTML output | ⚠️ static HTML | ✅ via Gatsby | ⚠️ static HTML | n/a |
| TypeScript types shipped | ✅ first-class | ⚠️ thin `.d.ts` facade | ✅ first-class | ✅ first-class | ❌ | ❌ | ✅ 2,679-line `.d.ts` |
| MCP / agent integration | ⚠️ VS Code `languageModelTools` + skill bundle | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | n/a |
| Accessibility (aria-live, focus) | ⚠️ partial | ✅ thorough | ⚠️ partial | ⚠️ partial | ❌ | ⚠️ partial | ⚠️ partial | n/a |
| Charts | ⚠️ via Mermaid | ❌ (community) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ all OOXML chart types |
| Tables | ✅ markdown | ✅ HTML | ✅ JSX | ✅ markdown | ✅ HTML | ✅ markdown | ✅ HTML | ✅ with auto-paging |

Legend: ✅ first-class, ⚠️ partial / via plugin / non-obvious, ❌ not supported.

Takeaways from this matrix:

1. **Slidev is the breadth leader.** It is the only framework with all of: drawing overlay, mic+screen recording, KaTeX, Mermaid, PlantUML, animated code diff, mobile remote control, PPTX export, and an AI/agent integration. Everyone else picks 3-5 of these.
2. **reveal.js wins on transitions** with Auto-Animate (Morph-style object continuity in ~600 lines, no animation library).
3. **PptxGenJS is the only PPTX writer.** Marp and Slidev both export PPTX but via image-rasterization — editing text in PowerPoint won't work. If we want real editable PPTX, we depend on PptxGenJS.
4. **WebSlides has no presenter mode, no PDF, no markdown.** Its value is purely visual/design. Cherry-pick the look, not the framework.
5. **No project ships a real MCP server.** Slidev ships VS Code `languageModelTools` (effectively MCP-shaped Copilot tools) and a Claude Code skill bundle. Everyone else has zero AI integration. This is our biggest greenfield differentiator.

---

## Library & dependency recommendations <a id="libraries"></a>

Distilled from the per-app docs. These are libraries we should consider depending on directly rather than reinventing.

### Code highlighting & code animation
- **[Shiki](https://github.com/shikijs/shiki)** — used by Slidev. TextMate-grammar-based, themes that match VS Code 1:1. Strong recommend.
- **[`@shikijs/magic-move`](https://github.com/shikijs/shiki-magic-move)** — Slidev's animated code diff. Build-time tokenization, FLIP animations between identically-keyed tokens. Framework-agnostic core; thin Vue wrapper. We can port the Vue wrapper to React or use the headless API.
- **[`@shikijs/twoslash`](https://shiki.matsu.io/packages/twoslash)** — hover-popover TypeScript intellisense in code blocks. Optional but high-value for developer demos.
- **highlight.js** — used by reveal.js, Marp. Older but ubiquitous. We should default to Shiki and offer highlight.js as a fallback only if size matters.

### Math
- **[KaTeX](https://katex.org/)** — fast, no fonts needed if we self-host. Used by Slidev, Marp (optional), reveal.js. Default choice.
- **MathJax** — only if we need OCR-ready output or extensive LaTeX coverage. Bigger payload.

### Diagrams
- **[Mermaid](https://mermaid.js.org/)** — used by Slidev. The standard. Mount inside a Shadow DOM (Slidev's pattern) to isolate its CSS.
- **PlantUML** via `plantuml-encoder` + server render — Slidev's approach. Lightweight client side.

### Animation primitives
- **Native CSS transitions** — sufficient for most slide-level (fade, slide-left/right) and element-level fragment animations. reveal.js proves this.
- **[View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)** — built into modern Chrome/Edge/Safari. Used by Slidev and Marp's `bespoke` template for cross-route morphs. **Preferred** over JS animation libs for slide-to-slide morphs.
- **FLIP technique** — reveal.js's Auto-Animate is hand-rolled FLIP (~600 LOC). We can write this ourselves or use a wrapper library.
- **[`@vueuse/motion`](https://motion.vueuse.org/)** — Vue-specific; we'd want a React equivalent. [Motion (formerly Framer Motion)](https://motion.dev/) is the obvious choice.
- **[`react-spring`](https://react-spring.io/)** — Spectacle uses this. Solid, but increasingly Motion is the default in modern React.

### Drawing / annotation
- **[Drauu](https://github.com/antfu/drauu)** — Anthony Fu's library, used by Slidev. SVG-based, framework-agnostic, ~6 KB. Direct dependency.

### Recording
- **[RecordRTC](https://recordrtc.org/)** — used by Slidev. Wraps `MediaRecorder` for `getUserMedia` + `getDisplayMedia` flows. Lazy-load only when recording starts.
- **[`@fix-webm-duration/fix`](https://github.com/yusitnikov/fix-webm-duration)** — Slidev uses this to repair WebM duration metadata. Tiny.

### Markdown pipeline
- **MDX (`@mdx-js/mdx`, `@mdx-js/react` / `@mdx-js/preact` / etc.)** — used by MDX Deck and Spectacle. We almost certainly want MDX 3+ as our primary author format on Astro since Astro has native MDX support.
- **markdown-it** ecosystem — used by Marp engine. Big plugin universe. Worth supporting Marp-compatible markdown via markdown-it for portability.
- **remark / rehype** — Astro's native pipeline. Plays well with MDX and gives us AST access.
- **`gray-matter`** — YAML frontmatter parser. Universal.
- **`magic-string`** — source-preserving rewrites. Used by Slidev. Useful for any compile-time markdown transforms.

### Export
- **[PptxGenJS](https://gitbrent.github.io/PptxGenJS/)** — direct dependency for our PPTX exporter. There is no real competitor.
- **Playwright** — used by Slidev for PDF/PNG/PPTX export via headless Chromium. Heavy but reliable.
- **`pdf-lib`** — used by Slidev for merging per-slide PDFs.
- **`@lillallol/outline-pdf`** — used by Slidev for PDF TOC outlines.
- **Browser native `window.print()` / `@page` CSS** — reveal.js and MDX Deck use this. Lighter than Playwright when fidelity isn't critical.

### Cross-window sync
- **`BroadcastChannel`** — used by Spectacle, Slidev (default mode). Same-origin only. Zero infrastructure.
- **`postMessage` + heartbeat** — used by reveal.js for speaker view. Works cross-window/iframe.
- **`storage` event on `localStorage`** — used by MDX Deck. Simple, slightly hacky.
- **`vite-plugin-vue-server-ref`** — Slidev uses this for cross-origin remote phone control. Vue-specific; for our React/Astro project we'd swap for a simple WebSocket via Astro endpoints.

### UI helpers
- **`mousetrap`** — keyboard shortcuts. Used by Spectacle.
- **`kbar`** — React command palette. Used by Spectacle. Worth considering for our UI.
- **`@vueuse/core`** (Vue-only) — we'd substitute `react-use` or our own hooks.
- **`uqr`** — pure JS QR code generator. Slidev uses it for the remote-control URL. Tiny and worth keeping.
- **`fitty`** — auto-fit-text. Used by reveal.js for `.r-fit-text`. Tiny; consider for auto-sizing titles.

### CLI / dev server
- **Vite** — winning bundler/dev-server. Slidev, reveal.js, modern Spectacle apps all use it. Astro is on top of Vite. ✓
- **`yargs`** — CLI argument parser. Slidev uses this. Solid.
- **`chokidar`** — file watching. Slidev uses it.
- **`untun`** — Cloudflare Quick Tunnel wrapper. Slidev uses this for the `--tunnel` flag. Nice-to-have for sharing local decks.

### Atomic / utility CSS
- **UnoCSS** — Slidev's choice. We probably want Tailwind for ecosystem compatibility, but UnoCSS's attribute syntax (`hover:bg="white op-10"`) is elegant. Decide based on theme strategy.
- **Tailwind** — more familiar to most users. Marp's website uses it.

---

## Cross-cutting patterns worth lifting <a id="patterns"></a>

These are *patterns* (not libraries) that we should copy because they showed up across multiple successful projects.

### 1. `---` slide separator + YAML frontmatter
Used by Slidev, Marp, MDX Deck, Spectacle's markdown layer, and reveal.js's markdown plugin. This is now a de facto standard for Markdown decks. Adopting it gives us interop, familiarity, and tooling support out of the box.

### 2. Trailing-comment notes
Slidev and Marp both treat the last HTML comment in a slide as the speaker note. Authors don't need a `<Notes>` component. This is friction-free.

### 3. Slot-sugar (`::name::`) inside markdown
Slidev transforms `::right::` markers into Vue named slots. The same pattern works for MDX/React via custom remark plugin → JSX named children. Lifts two-column layouts from "wrap in `<TwoCols>` with two `<div>` children" to "just type `::right::`".

### 4. Click model with deferred totals
Slidev's `ClicksContext` lets `v-click="3"` (absolute), `v-click="'+1'"` (relative), and `v-click="[2,5]"` (range) all coexist; the total click count is inferred from registered elements. **Improvement opportunity**: do this at parse time (each MDX `<Click at="…">` becomes a known step in the AST) instead of mount-time discovery. Cleaner for tooling, exports, and preview.

### 5. DOM-walk slide collection
Spectacle collects slides by walking the rendered DOM for placeholder components, not by `React.Children`. This lets users nest slides through any helper component, MDX-rendered output, or conditional. We should consider this *or* a parser-level pass for Astro (which can analyze MDX AST at build time).

### 6. Marker-component pattern
MDX Deck's `<Notes>`, `<Head>`, `<Header>`, `<Footer>` components render nothing (`() => false`) but carry static flags (`__mdxDeck_notes = true`). The slide splitter extracts them as metadata. Spectacle does similar with `<Notes>`. We should adopt this for any per-slide metadata that's nicer to write inline than in frontmatter.

### 7. Filesystem-layered layout/theme resolution
Slidev resolves layouts by globbing `layouts/**` across `[clientRoot, ...themeRoots, ...addonRoots, userRoot]`, with later roots silently overriding earlier ones. **Drop a file → it works.** No manifests, no registration. We should adopt this without the npm-package requirement.

### 8. CSS-custom-property-driven theming
reveal.js, Marp, and WebSlides all use CSS variables for theme values (`--r-background`, `--r-main-color`, etc.). This means themes can be tweaked at runtime, overridden per-slide, and even per-element without recompilation. Vastly better than SCSS variables alone.

### 9. Two-element camera split (impress.js)
Animating `scale` on the outer element and `translate+rotate` on the inner with staggered delays makes zoom-in vs zoom-out *feel* different. Worth borrowing for any object-continuity animation that crosses large size deltas.

### 10. `data-waitfor` opt-in for async slide content
Slidev's export uses `<div data-waitfor=".mermaid svg" />` so authors can declare "wait until this selector is visible before snapshotting". Better than fixed timeouts. We should adopt this for our PDF/PNG export.

### 11. View Transitions API for slide morphs
Marp and Slidev both use `document.startViewTransition()`. The browser handles paired-element morphing via `view-transition-name`. We get reveal.js-Auto-Animate-style continuity *for free* on modern browsers, with zero JS animation code. Worth defaulting to and falling back to FLIP for unsupported browsers.

### 12. Two parallel virtual modules per slide
Slidev exposes each slide as both `…/md` (content) and `…/frontmatter`. HMR can update frontmatter without rebuilding the SFC. We can mirror this with Astro content collections or a custom Vite plugin.

### 13. `BroadcastChannel` for same-origin sync
Used by Spectacle and Slidev. Open a second tab, ship state through the channel. Zero infrastructure. The simplest viable presenter sync.

### 14. postMessage RPC with heartbeat reconnect
reveal.js's speaker view spams a heartbeat so it can reattach to an orphaned popup after a host reload. Tiny, robust pattern.

### 15. `?clicks=N` URL state
Slidev stores the current click count as a URL query param. Back/forward and deep-linking just work. We should do the same.

### 16. Skill bundle as AI integration
Slidev ships a `skills/slidev/` directory with structured reference markdown that Claude Code loads as context. This is a *huge* unlock for LLM authoring — much better than asking the model to grep our codebase. **We should ship one from day one.**

### 17. CLI in-TTY shortcuts
Slidev binds keys in the dev-server TTY: `r` restart, `o` open browser, `e` edit, `q` quit, `c` show QR. Small touch, large UX win.

### 18. Garbage-collection harness
impress.js's `lib.gc` lets the framework be torn down and re-initialized cleanly, even with many plugins. Worth designing for from the start so our framework doesn't leak listeners on HMR.

### 19. `htm` for zero-build authoring
Spectacle's `one-page.html` lets users author a deck in a single HTML file using `htm` (tagged template literal JSX). Useful escape hatch for "minimum-friction" use cases (workshops, paste-into-CodePen).

### 20. CSS classes as the only state ("past"/"present"/"future")
reveal.js's entire navigation is "toggle three class names on `<section>`s". CSS does everything else. Worth lifting wholesale — it's the simplest stable contract for slide state.

---

## Anti-patterns to avoid <a id="anti-patterns"></a>

Things we saw cause pain. Things we should consciously *not* do.

### Inline `speaker-view.html` (reveal.js)
910 lines of mixed HTML+CSS+JS written into a popup window via `document.write`. Can't be hot-reloaded. Can't be type-checked. Painful to evolve. **We should ship presenter view as a real Astro page.**

### Closure-scoped factory (reveal.js)
A 2,963-line IIFE with private state and method late-binding. Not introspectable. Not testable in pieces. **We use TS modules with explicit dependency injection.**

### Two competing runtimes (MDX Deck)
MDX Deck shipped `@mdx-deck/gatsby-plugin` and `gatsby-theme-mdx-deck` with subtly different `split-slides.js` implementations. Pick one model.

### `styled-components` + `styled-system` (Spectacle)
Both are essentially unmaintained. v5 is in maintenance, v6 is breaking, `styled-system` has been replaced by `theme-ui` which has been replaced by Pigment / vanilla-extract / Panda. **Don't anchor on an aging styling lib.**

### Theme-as-npm-package (Slidev)
A Slidev theme is a published npm package with a `slidev` engine version constraint. Even tweaking one color requires `slidev theme eject`. We should let themes be folders.

### Hash-only routing (MDX Deck main runtime, WebSlides)
`/#3` doesn't produce history entries, breaks middleware. **Use real routes (`/3` or `/slide/3`).** Slidev's `setupRoutes` shows how.

### UnoCSS lock-in (Slidev)
`verifyConfig` errors if `css !== 'unocss'`. We should let users bring their own atomic CSS or none at all.

### Monaco-by-default (Slidev)
Heavy bundle even when lazily loaded. Shiki + a textarea covers 95% of demo cases. Offer Monaco as an opt-in addon.

### Pixel coordinates (impress.js)
`data-x="2000" data-y="-1500"` is fragile and brittle. Our object-continuity should use named anchors, not hand-tuned pixels.

### Discover-on-mount click totals (Slidev)
Total clicks computed from mounted `v-click` directives means lazy-mounted elements can change the total mid-presentation. **Compute clicks at parse time from the MDX AST.**

### Markdown-via-`<script type="text/template">` (reveal.js)
A workaround for HTML parsing that requires its own line-trimming heuristics. Whitespace bugs are recurring. Use a proper markdown parser at compile time.

### PhantomJS for PDF (reveal.js 3.x; deprecated)
Already replaced by `decktape` (headless Chrome) in current reveal.js. We should jump straight to Playwright or browser-native print.

### Static-deck imperative APIs that don't compose (impress.js plugins)
Each impress plugin is an IIFE that mutates the global. Adding TypeScript types to that is painful. **Plugins should be typed, ESM-exported objects.**

### Hand-written CSS per slide ID (impress.js demo)
`#title { ... }`, `#bored { ... }` — every slide gets a bespoke CSS rule. We should ship enough layouts and utility classes that authors rarely need per-slide CSS.

### Inline-styled HTML in demo decks (react-slides snapshot)
`style="font-size: 25px; text-align: left"` per element. Our framework should make slide-local styling expressible without falling to inline styles.

### Sanitize-everything-then-disable-sanitizer for raw HTML (Marp)
Marp strips most HTML by default, then opening the door for `<iframe>` etc. opens an XSS hole. Better: scope raw HTML to a per-deck opt-in *and* sandbox iframes by default.

### Image-only PPTX export (Slidev, Marp)
Easier to implement, but the resulting `.pptx` isn't editable in PowerPoint. PptxGenJS gives us real OOXML — much better fidelity for users who want to take the deck into PowerPoint after.

### Single global instance (WebSlides, reveal.js pre-4.0)
`document.getElementById('webslides')` means multiple decks on one page don't work. Astro pages with embedded mini-decks need real instance isolation.

---

## Recommendations for our framework <a id="recommendations"></a>

This is the synthesis — what we should do, based on the research.

### Authoring format
- **Primary format: MDX** (Astro native, JSX + Markdown). `---` separators, YAML frontmatter, trailing HTML comment as speaker notes.
- **Compatible: Marp-flavored Markdown** (CommonMark + HTML-comment directives). Read this verbatim so any existing Marp deck Just Works.
- Slot-sugar (`::name::`) → JSX named slots, via a remark plugin.
- Snippet imports (`<<< @/file#region {options}`).
- `src:` frontmatter for slide imports.
- Trailing HTML comment as the speaker note.

### Runtime
- Author slides as `.mdx` (or `.md`) files in a content collection.
- Build a parse-time slide AST: every slide is a node with frontmatter, body MDX, speaker notes, and a list of declarative click steps.
- Compile to Astro pages, one per slide (`/slides/:deck/:n`) plus an SPA mode that holds the whole deck in one route for fast in-deck nav. Same source, different output modes.
- React for interactive components (islands). Astro for the static skeleton.
- View Transitions API for slide-to-slide morphs; FLIP fallback for unsupported browsers.

### Click model
- Parse `<v-click>`, `<v-after>`, `<v-clicks>` (or the equivalent JSX) at MDX-compile time.
- The AST knows the total click count for each slide. No mount-time discovery.
- URL query param `?step=N` for deep links and back/forward.
- This lets export, preview, presenter mode, and MCP tools all see the same plan.

### Layouts & themes
- **Filesystem-layered**: `[built-in layouts, theme/layouts/, addon/layouts/, user/layouts/]`. Later wins.
- A theme is a *folder* (not a package): `theme/` with `layouts/`, `components/`, `styles/`, `theme.config.ts`.
- All theme values flow through CSS custom properties. Overridable per-slide via frontmatter or inline.
- Ship default themes inspired by WebSlides' design DNA (palette, typography, `.flexblock`).

### Code
- **Shiki** by default for highlighting. Twoslash optional.
- **`@shikijs/magic-move`** for animated code diffs. Build-time tokenization.
- **No Monaco by default.** Optional addon.

### Math & diagrams
- **KaTeX** built in (block + inline, with per-click reveal support like Slidev's `$$ {1|3|all}`).
- **Mermaid** built in (Shadow DOM isolation, like Slidev).
- PlantUML optional via plugin.

### Animations & transitions
- Slide-level: CSS classes + View Transitions API.
- Element-level: a small custom system based on `v-click` semantics, declarative at parse time.
- Object continuity / Morph: View Transitions API with `view-transition-name`, FLIP fallback. Borrow algorithm from reveal.js Auto-Animate.

### Presenter mode
- Real route at `/presenter/:deck/:n`, opens in a new tab/window.
- Sync via `BroadcastChannel` (same-origin) with WebSocket fallback for remote.
- Three-pane resizable grid: current slide, next slide, notes/controls.
- Timer with `duration:` frontmatter parsing (`30min`, `2:05`).
- Camera mirror, drawing overlay (drauu), recording (RecordRTC) all opt-in.
- Mobile remote control with QR code (`uqr`) + LAN binding.

### Export
- Default: **in-browser export** (no Playwright needed for most users).
- Backup: **Playwright** for high-fidelity PDF/PNG.
- **PPTX via PptxGenJS** with a custom AST → PptxGenJS API mapper for real editable PPTX. Document the fidelity gaps (animations, transitions don't survive).
- Image-based PPTX as a fallback for slides whose content can't be expressed in OOXML.
- HTML / SPA build for hosting; static per-slide pages for blog embeds and deep links.
- Per-slide deep links and embed-as-iframe support out of the box.

### Plugin / addon system
- Typed ESM modules. Each plugin is an object: `{ id: string, init(deck: Deck): Promise<void> | void, destroy?(): void }`.
- Plugins can ship: components, layouts, remark/rehype plugins, MCP tools, dev-server middleware, export hooks.
- `data-waitfor` opt-in for async export sync.

### MCP / agent integration (our biggest differentiator)
- Ship a **real MCP server** as a CLI subcommand: `slides mcp-server`.
- Tools to expose: `list_decks`, `list_slides`, `get_slide(n)`, `update_slide(n, content)`, `add_slide(content)`, `delete_slide(n)`, `next_slide`, `prev_slide`, `goto_slide(n)`, `set_step(n)`, `start_recording`, `stop_recording`, `export_pdf`, `export_pptx`, `screenshot_slide(n)`, `get_speaker_notes(n)`, `list_layouts`, `list_themes`.
- Ship a Claude Code skill bundle (`skills/slides/SKILL.md` + structured reference markdown) for context-loading. Use Slidev's bundle as the shape reference but expand to cover our richer feature set.
- Optional: VS Code `languageModelTools` mirror, like Slidev's (`packages/vscode/`).

### TypeScript
- Fully typed end-to-end. Public types in a `@slides/types` package.
- Frontmatter has a JSON Schema generated from the TS types for editor IntelliSense (Slidev does this with `ts-json-schema-generator`).

### Tests
- Vitest for unit tests of parser, click resolver, AST transforms, theme loader.
- Playwright for end-to-end of dev server, presenter sync, export.
- Snapshot test slide AST → PptxGenJS output.

### CLI
- `slides dev [entry]` — Vite dev server with HMR.
- `slides build [entry]` — static SPA + per-slide pages.
- `slides export [entry] --format pdf|png|pptx|md` — same flags as Slidev for familiarity.
- `slides theme eject [name]` — copy a theme into the user project.
- `slides mcp-server` — start an MCP server on stdio.
- In-TTY shortcuts: `r` restart, `o` open, `e` edit, `q` quit, `c` QR, `m` toggle MCP server.

---

## Open questions <a id="open-questions"></a>

These came out of the research and warrant decisions before we start building.

1. **Vue interop or React-only?** Slidev's component ecosystem is large. Astro can host both. Do we ship a React-first API and accept Vue components as islands? Or build React-only and import nothing from Slidev's component library?
2. **Marp-format compatibility scope.** Are we Marp-syntax-compatible only at the directive layer (so the `marp: true` frontmatter and `<!-- _class -->` directives just work), or also at the engine level (one HTML document with `<section>` per slide as output)?
3. **Static vs. SPA default?** Slidev defaults to SPA-when-served, can build static. Astro is static-first. The architecture is different — we should pick a default before designing the renderer.
4. **Click step storage in AST.** Slidev does runtime discovery; we want parse-time. But MDX click components are still React components — does the *MDX compiler* know about them, or do we walk the AST in a remark plugin?
5. **PPTX scope.** Are we aiming for editable text PPTX (PptxGenJS → real text frames), image-only PPTX (faster, simpler), or both behind a flag? Recommended: both.
6. **Magic Move portability.** `@shikijs/magic-move` ships a Vue wrapper. Is the Solid/React wrapper good enough or do we wrap the headless API ourselves?
7. **Theme distribution.** Folder-only (cloned), package (npm), or both? Slidev's eject-to-fork pattern is a hint that the package model is overkill for most authors.
8. **Mobile remote security.** Slidev's `--remote <password>` is a shared secret in the URL. Sufficient? Or do we want a per-session token + WebSocket handshake?
9. **Drawing persistence format.** SVG file per click index (Slidev's approach) or a single per-slide JSON? Persistence path conventions?
10. **MCP server transport.** stdio for Claude Code / Cursor, but also offer SSE/WebSocket for remote MCP clients?

---

## How to use these docs <a id="using-the-docs"></a>

- **Starting a new feature?** Search the per-app docs for the feature name. Each doc cites absolute file paths so you can jump straight to the implementation.
- **Choosing a library?** Check the [library section](#libraries) above. Each entry says where it's used in prior art and what we'd lift.
- **Stuck on an architectural question?** Read [Slidev's architecture section](./slidev.md#architecture) first (closest to our design), then [reveal.js's](./reveal.js.md#architecture) (canonical web-deck patterns), then [Spectacle's](./spectacle.md#architecture) (React-specific tricks).
- **Need to implement export?** Read `PptxGenJS.md` for the PPTX path and `slidev.md` § *PDF export via Playwright* + § *PPTX export* for the export-pipeline shape.
- **Need design inspiration?** Open `WebSlides.md` and skim § *CSS / design system*. The palette, typography scale, and `.flexblock` family are mineable.
- **Working with an LLM on slide content?** Read `slidev.md` § *MCP / Claude Code plugin shape* and pattern §16 above. Our skill bundle should look like theirs but expand the tool surface.

Each per-app doc was generated by a focused research agent that read the project's source. They're meant to be read selectively, not cover-to-cover. The per-app files are the source of truth; this overview is the index and synthesis.
