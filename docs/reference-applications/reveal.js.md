# reveal.js

## Summary

reveal.js is an open-source HTML presentation framework that turns nested `<section>` elements into a navigable slide deck rendered with DOM and CSS transforms. It is authored and maintained by Hakim El Hattab (and contributors) since 2011 and is the engine behind the commercial editor at slides.com. The codebase is predominantly vanilla JavaScript (`js/reveal.js` is still an ES module written in JS, not TS), with a TypeScript shell (`js/index.ts`, `js/config.ts`, `js/reveal.d.ts`) added to expose strict types to consumers, all bundled with Vite and shipped as both `dist/reveal.js` (UMD) and `dist/reveal.mjs` (ES). Version 6.0.1 of the source under inspection is actively maintained, supports authoring in raw HTML or Markdown, and ships a small set of first-party plugins (markdown, highlight, math, notes, search, zoom) plus a separately-published React wrapper (`@revealjs/react` under `react/`).

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | HTML `<section>` tree (primary) or Markdown via the markdown plugin |
| Runtime stack | Vanilla JS controllers + small TS facade; one giant closure-scoped `Deck` factory |
| Rendering approach | DOM + CSS transforms (scale, translate, rotateY/X). 3D transforms for "convex"/"concave"/"cube" |
| Slide model | Two-level: horizontal `<section>` > vertical `<section>` children form vertical stacks |
| Module system | ES modules; ships UMD + ESM; legacy ES5 build via `scripts/build-es5.js` |
| Bundle / build | Vite (`vite.config.ts`, one config per plugin), TypeScript for `.d.ts`, Sass for CSS, esbuild for ES5 minify |
| Testing | QUnit run headless via `node-qunit-puppeteer` against a Vite dev server (`scripts/test.js`) |
| Status | Active (v6.0.1 in this checkout); 14+ years of releases |
| License | MIT |

## Architecture

### Top-level layout

```
reveal.js/
  index.html              # Minimal "hello slide" template
  demo.html               # Full demo with most features exercised
  package.json            # Library manifest (main: dist/reveal.js)
  vite.config.ts          # Core bundle config
  vite.config.styles.ts   # Separate config that builds CSS bundles
  tsconfig.json
  js/
    index.ts              # TS entry: wraps the JS deck factory + legacy singleton API
    config.ts             # All RevealConfig types + defaultConfig
    reveal.js             # The 2,963-line core deck factory (still JS)
    reveal.d.ts           # Public type declarations re-exported to consumers
    controllers/          # 20 controller modules, one per concern
    components/playback.js
    utils/                # util.ts, device.ts, constants.ts, loader.ts, color.ts
  plugin/
    highlight/  markdown/  math/  notes/  search/  zoom/   # First-party plugins
  css/
    reveal.scss           # Core stylesheet (~2k lines, includes all transitions)
    layout.scss           # r-stretch, r-fit-text, r-stack, r-hstack, r-vstack helpers
    reset.css
    print/                # PDF / paper sheet styles
    theme/                # 12 named themes + template/ shared base
  react/                  # @revealjs/react — separate package, own package-lock
  build/dts-paths.ts
  scripts/                # add-banner.js, build-es5.js, test.js, zip.js
  test/                   # 20+ QUnit HTML test pages
  examples/               # Authoring examples for each major feature
```

### Runtime execution

`/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/index.ts` exposes a hybrid API: `Reveal.initialize(options)` finds the first `.reveal` element on the page, constructs a single `Deck` instance, and returns a `Promise` that resolves when the `ready` event fires (`js/index.ts:40-54`). Pre-init calls to `configure`, `on`, `off`, etc., are queued into `enqueuedAPICalls` and replayed once init completes (`js/index.ts:62-68`). This preserves the pre-4.x global API while also allowing `new Reveal(el, opts)` instances for multi-deck pages.

The real engine is `/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/reveal.js` — a single 2,963-line factory function that closes over private state and a `dom` cache, then instantiates one of each controller (lines 107-125):

```js
slideContent = new SlideContent( Reveal ),
slideNumber  = new SlideNumber( Reveal ),
jumpToSlide  = new JumpToSlide( Reveal ),
autoAnimate  = new AutoAnimate( Reveal ),
backgrounds  = new Backgrounds( Reveal ),
scrollView   = new ScrollView( Reveal ),
printView    = new PrintView( Reveal ),
fragments    = new Fragments( Reveal ),
overview     = new Overview( Reveal ),
keyboard     = new Keyboard( Reveal ),
location     = new Location( Reveal ),
controls     = new Controls( Reveal ),
progress     = new Progress( Reveal ),
pointer      = new Pointer( Reveal ),
plugins      = new Plugins( Reveal ),
overlay      = new Overlay( Reveal ),
focus        = new Focus( Reveal ),
touch        = new Touch( Reveal ),
notes        = new Notes( Reveal );
```

Each controller is a small class in `js/controllers/*` that receives the `Reveal` reference (a mutable object the factory populates with internal methods at the end via `Util.extend( Reveal, {...API, ...} )` at `js/reveal.js:2932-2959`). Controllers communicate through this single shared object — there is no event bus internally; communication is method calls plus DOM-bubbling custom events dispatched from `dom.wrapper`.

#### Init sequence

`initialize(initOptions)` at `js/reveal.js:130-168`:
1. Cache `dom.wrapper` and `dom.slides`.
2. Compose config: `defaultConfig` → constructor opts → init opts → query-string params (`Util.getQueryHash`).
3. Detect legacy `?print-pdf` and force `config.view = 'print'`.
4. Call `setViewport()` which adds the `.reveal-viewport` class to `<body>` (or to `.reveal` if `embedded`).
5. Load plugins/dependencies via `plugins.load(...)`, then call `start()`.
6. Return a promise resolved when the `ready` event fires.

`start()` (line 194) removes hidden slides, calls `setupDOM()`, binds postMessage / scroll prevention / fullscreen, runs `configure()` (which calls `sync()`), creates backgrounds, optionally activates print or scroll view, and reads the URL hash via `location.readURL()`. Finally the wrapper gets the `ready` class and the `ready` event fires after a 1ms timeout to ensure consumers observe it asynchronously.

#### The navigation core: `slide(h, v, f, origin)`

`js/reveal.js:1263-1456` is the heart of the runtime. Highlights:
- Fires a cancellable `beforeslidechange` event (`defaultPrevented` aborts).
- Calls `updateSlides(HORIZONTAL_SLIDES_SELECTOR, ...)` and `updateSlides(VERTICAL_SLIDES_SELECTOR, ...)` to add `past`/`present`/`future` classes (`js/reveal.js:1681-1797`).
- Detects whether this transition should be auto-animated via `shouldAutoAnimateBetween()` and, if so, adds `disable-slide-transitions` to suppress the normal CSS transition and instead invokes `autoAnimate.run(previousSlide, currentSlide)` after layout.
- Dispatches `slidechanged` once the indices actually change, sets `aria-hidden`, announces status to screen readers, updates progress / controls / backgrounds / fragments / slide number, writes URL hash.
- Restarts embedded media via `slideContent.startEmbeddedContent` and stops it on the outgoing slide.

#### The layout system

`layout()` at `js/reveal.js:805-920` is the master scaling routine. It:
- Computes the available presentation size (subtracting the `margin` factor).
- Calls `layoutSlideContents()` which resizes any `.r-stretch` elements to fill remaining height (`js/reveal.js:929-954`).
- Determines the scale factor (`min(presentationWidth/slideWidth, presentationHeight/slideHeight)`), clamps to `minScale`/`maxScale`, then applies `transform: translate(-50%, -50%) scale(s)` to the `.slides` container via `transformSlides({ layout: ... })`.
- Vertically centers each visible slide by computing `(size.height - slide.scrollHeight) / 2` in a separate read/write pass to avoid layout thrash.
- Exposes the computed scale and viewport as CSS custom properties (`--slide-scale`, `--viewport-width`, `--viewport-height`).
- Re-runs `progress.update()`, `backgrounds.updateParallax()`, and (if active) `overview.update()`.

There's also an interesting auto scroll-view switch: `checkResponsiveScrollView()` (`js/reveal.js:960-988`) activates `ScrollView` when `viewport.presentationWidth <= scrollActivationWidth` (default 435px), turning the deck into a scrollable page on phones.

#### Embedded multi-deck support

The pre-4.0 `Reveal` global is a singleton, but the new API in `js/index.ts:14-22` exposes the underlying `Deck` factory so a page can instantiate `new Reveal(element, opts)` multiple times. See `examples/multiple-presentations.html` and `test/test-multiple-instances.html`.

## Authoring format

A "hello world" deck is just HTML:

```html
<!-- /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/index.html -->
<div class="reveal">
  <div class="slides">
    <section>Slide 1</section>
    <section>Slide 2</section>
  </div>
</div>
<script src="dist/reveal.js"></script>
<script>
  Reveal.initialize({ hash: true });
</script>
```

Vertical (nested) slides are simply nested `<section>` elements (the parent acquires the `stack` class at runtime):

```html
<!-- /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/demo.html:60-99 -->
<section>
  <section><h2>Vertical Slides</h2></section>
  <section><h2>Basement Level 1</h2></section>
  <section><h2>Basement Level 2</h2></section>
</section>
```

Per-slide options are `data-*` attributes on `<section>`:

| Attribute | Effect |
| --- | --- |
| `data-background-color` / `data-background-image` / `data-background-video` / `data-background-iframe` / `data-background-gradient` | Slide background |
| `data-background-transition` | Override background transition per slide |
| `data-transition` | Per-slide transition (`none`, `fade`, `slide`, `convex`, `concave`, `zoom`, or split `slide-in convex-out`) |
| `data-transition-speed` | `fast` / `slow` |
| `data-state` | Adds class to viewport + dispatches custom event when slide is active |
| `data-visibility="hidden"` | Removed at init time unless `showHiddenSlides: true` |
| `data-auto-animate`, `data-auto-animate-id`, `data-auto-animate-restart`, `data-auto-animate-easing`, `data-auto-animate-duration`, `data-auto-animate-delay`, `data-auto-animate-unmatched` | Auto-Animate controls |
| `data-autoslide` | Slide-specific autoslide duration |
| `data-notes` | Inline speaker notes |
| `data-preload` | Force preload of iframes |

Markdown source can be inlined inside a `<script type="text/template">` or loaded externally via `data-markdown="path/to/file.md"`. See `examples/markdown.html` and the markdown plugin section below.

## Features (comprehensive catalog)

### Authoring
- **Sectioned HTML** authoring with two-level nesting; vertical stacks are inferred from nested `<section>`s. Source: `/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/utils/constants.ts:1-3`.
- **Named slides via `id`** — `Reveal.slide(id)` and URLs like `#/intro` jump to a section by `id` or `data-id` (`js/controllers/location.js:43-99`).
- **Hidden slides** via `data-visibility="hidden"`, removed at start (`js/reveal.js:297-316`).
- **Slide attributes** can be applied through markdown comments using the `<!-- .slide: data-x="y" -->` separator (`plugin/markdown/plugin.js:316-382`).
- **Element attributes** from markdown via `<!-- .element: class="fragment" -->` comments after list items, headings, etc.
- **Shuffle** mode reorders slides at sync (`js/reveal.js:1646-1666`).

### Navigation
- **API methods** include `slide(h,v,f)`, `next`, `prev`, `left/right/up/down`, `navigateFragment`, `getIndices`, `getProgress`, `getTotalSlides`. Exposed on the returned API and on the `Reveal` global (`js/reveal.js:2729-2929`).
- **Keyboard** with re-bindable keys; defaults shown in the help overlay (`js/controllers/keyboard.js`). Supports `navigationMode: 'default' | 'linear' | 'grid'` (config.ts:411).
- **Touch** swipe navigation (`js/controllers/touch.js`).
- **Mouse wheel** (off by default, `mouseWheel` config).
- **Overview** mode (Esc / O) shows all slides scaled down (`js/controllers/overview.js`, called from `slide()` and `layout()`).
- **Jump-to-slide** UI (G key) — `js/controllers/jumptoslide.js`.
- **URL hash** sync via `Location` controller; supports `hash`, `history`, `respondToHashChanges`, `hashOneBasedIndex`, `fragmentInURL` (`js/controllers/location.js`).
- **Auto-slide** with per-slide `data-autoslide`, optional `Playback` UI control (`js/components/playback.js`).

### Layout (vertical stacks, fragments, backgrounds)
- **Auto-centered** scaled slides via `layout()` (`js/reveal.js:805-920`).
- **`.r-stretch`** — element auto-fills remaining vertical space (`js/reveal.js:929-954`, `css/layout.scss:6-17`).
- **`.r-fit-text`** — autosizes text using the `fitty` library (`js/controllers/slidecontent.js:240-247`, `css/layout.scss:20-23`).
- **`.r-stack`** — CSS Grid 1x1 overlay layout for stacking elements (`css/layout.scss:25-34`).
- **`.r-hstack` / `.r-vstack`** — flexbox helpers (`css/layout.scss:37-89`).
- **Backgrounds**: dedicated controller renders a parallel `.backgrounds` tree where one `.slide-background` is created per slide (`js/controllers/backgrounds.js`). Supports color, image, video, iframe, gradient, parallax (presentation-wide background image with per-slide offsets), and `backgroundTransition`.
- **`hasLightBackground` / `hasDarkBackground`** classes are added by computing color brightness via `js/utils/color.ts`.

### Transitions & animations
- **Per-deck** `config.transition` and per-slide `data-transition` attributes; supports split syntax (`convex-in fade-out`).
- **Built-in transition styles** (`none`, `fade`, `slide`, `convex`, `concave`, `zoom`) implemented as pure CSS using mixins (`css/reveal.scss:786-915`). Deprecated `cube` and `page` are still present.
- **Speed**: `data-transition-speed="fast|slow"` sets duration (400 / 800 / 1200 ms — `css/reveal.scss:722-735`).
- **Background transitions** are independent of slide transitions (`config.backgroundTransition`, default `fade`).
- **Auto-Animate** — see dedicated section below.

### Fragments (step-by-step reveal)
- Any element with class `fragment` is a fragment. `data-fragment-index="N"` controls order; without it, document order is used.
- Built-in animation variants: `fade-in/out/up/down/left/right`, `fade-in-then-out`, `fade-in-then-semi-out`, `grow`, `shrink`, `strike`, `highlight-red/blue/green`, `highlight-current-*` (CSS in `css/reveal.scss:63-225`, types in `js/config.ts:21-37`).
- Implementation in `js/controllers/fragments.js`. The active fragment gets both `.visible` and `.current-fragment` classes; revealed earlier fragments get only `.visible`. The slide tracks `data-fragment="N"` for CSS hooks.
- Events: `fragmentshown`, `fragmenthidden`. Each fragment also bubbles `visible` and `hidden` element-level events.
- Grouping: multiple fragments at the same `data-fragment-index` reveal together (`fragments.sort(..., grouped=true)` returns nested arrays — used by PDF export to print one page per fragment group).
- Lists can be auto-converted to fragments by passing `markdown: { animateLists: true }` (`plugin/markdown/plugin.js:460-465`).

### Code / syntax highlighting
- `plugin/highlight/plugin.js` uses `highlight.js` (peer-bundled dependency, `package.json` lists it under devDependencies — bundled into the plugin output).
- `data-line-numbers` enables line numbering; the value can be a step list like `"1|3-5|9"`. Each step becomes a fragment that highlights different lines.
- Embedded `highlightjs-line-numbers.js` (MIT, 2018) is inlined at the top of `plugin.js` (minified, lines 3-4) to generate per-line `<tr>` elements.
- Scroll-into-view animation centers highlighted lines as you step through fragments (`scrollHighlightedLineIntoView`, plugin.js:172+).
- `data-trim` strips leading whitespace; `data-noescape` skips HTML entity escape.

### Math
- `plugin/math/plugin.js` is a wrapper that chooses between four typesetter backends: `KaTeX`, `MathJax2`, `MathJax3`, `MathJax4`. Default exported plugin is `defaultTypesetter()` (MathJax2 — `plugin/math/plugin.js:6`).
- Each backend lazy-loads its scripts from a configurable CDN (`baseUrl` / `local`).
- KaTeX backend supports delimiters config (`$$ ... $$`, `$ ... $`, `\[...\]`, `\(...\)`) and the mhchem extension (`plugin/math/katex.js`).
- After typesetting, the plugin calls `deck.layout()` to re-scale.

### Charts / diagrams (mermaid, etc.)
- **Not first-party.** reveal.js does not ship a Mermaid plugin. Community plugins (`reveal.js-mermaid-plugin`) wrap Mermaid externally, but the upstream repo ships none. The example list under `examples/` covers backgrounds, lightbox, transitions, auto-animate, scroll, math, markdown, layout-helpers, and media — but no chart/diagram demo.
- The closest in-repo "diagram-like" features are the highlight plugin's stepped code reveals and Auto-Animate.

### Speaker / presenter mode
- Implemented entirely in `plugin/notes/plugin.js` (host) plus `plugin/notes/speaker-view.html` (popup window — 910 lines of inline HTML/JS).
- Triggered by `S` key (`addKeyBinding(83, 'S')` at `plugin/notes/plugin.js:258`) or `?notes` query parameter.
- The host opens a popup window via `window.open` and writes the speaker view HTML into it: `speakerWindow.document.write( speakerViewHTML )` (line 34).
- **Handshake**: the host sends a `connect` postMessage every 500ms until the popup replies with `connected` (plugin.js:68-87). Once connected, the host subscribes to `slidechanged`, `fragmentshown/hidden`, `paused`, `resumed`, etc., and posts state to the popup.
- The popup creates **two iframes** (`current-slide` and `upcoming-slide`) loading the same presentation URL with `?receiver&progress=false&transition=none&...` and a hash like `#/h/v` (`speaker-view.html:543-570`). Stepping forward in `upcomingSlide` is done with `postMessage({method:'next'})`.
- Reverse API calls work too: the popup can call any whitelisted method by posting `{namespace:'reveal-notes', type:'call', methodName, arguments, callId}` and waiting for a `return` reply (plugin.js:93-103, speaker-view.html:451-463).
- **Heartbeat**: speaker view posts a heartbeat every 1s so that, if the host reloads, it can re-bind to an orphaned speaker window (`speaker-view.html:587-593`, `plugin.js:240-256`).
- The speaker view persists its **layout** ("default", "side-by-side", "notes-only", etc.) in `localStorage` under `reveal-speaker-layout` (`speaker-view.html:820-867`).
- A **pacing/timer** UI subtracts elapsed time from a configured `totalTime` or per-slide `data-timing` to color-code "ahead / on-track / behind" (`speaker-view.html:595-784`).
- Notes themselves are pulled from `aside.notes` inside each slide, or `data-notes` attribute, or fragment-specific notes (`plugin.js:108-160`).

### Multiplexing / remote control
- **postMessage API**: when `config.postMessage` is true, the deck listens for `{method, args}` messages and invokes the corresponding API method, optionally posting the return value back (`js/reveal.js:484-499`, `2575-2605`). A blacklist (`POST_MESSAGE_METHOD_BLACKLIST` in `js/utils/constants.ts:7-8`) prevents calls to `registerPlugin`, `registerKeyboardShortcut`, `addKeyBinding`, `addEventListener`, `showPreview`, `previewIframe`.
- **postMessageEvents**: if true, every reveal.js event is forwarded to the parent window with `{namespace:'reveal', eventName, state}` (`js/reveal.js:783-799`).
- No first-party "multiplex" plugin in this checkout — historically there was a Socket.IO-based one but it has been moved out of core.

### Export (PDF, print, HTML)
- `config.view = 'print'` (or `?print-pdf` query, or `?view=print`) activates `PrintView` (`js/controllers/printview.js`).
- PrintView:
  - Sets `@page` size matching configured slide dimensions (including margin), writes that as a `<style>` tag (line 40).
  - Wraps each slide in a `.pdf-page` div with the page background; positions the slide centered (lines 72-117).
  - Optionally splits a tall slide across multiple PDF pages up to `pdfMaxPagesPerSlide`.
  - If `pdfSeparateFragments: true`, clones the page for each fragment group so the PDF shows each fragment step as a separate page (lines 157-203).
  - Adds slide numbers / speaker notes (inline or "separate-page" layout) — lines 119-155.
  - Dispatches `pdf-ready` for plugins (e.g. highlight scrolls highlighted lines into view at this point).
- For HTML export users just open the deck normally — there is no static-export step. PDF is the supported way to produce a static artifact.

### Theming
- 12 themes in `/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/css/theme/*.scss`: `beige`, `black`, `black-contrast`, `blood`, `dracula`, `league`, `moon`, `night`, `serif`, `simple`, `sky`, `solarized`, `white`, `white-contrast`.
- Each theme is a tiny Sass file that overrides variables in `template/settings.scss` and then `@use template/theme`. All settings flow through CSS custom properties (`--r-background`, `--r-main-color`, `--r-link-color`, etc., declared in `css/theme/template/settings.scss:52-96`), so themes can be tweaked at runtime by overriding the CSS variables.
- Selecting a theme is purely a `<link rel="stylesheet" href="dist/theme/black.css">` swap.

### Plugins
- Six bundled plugins (`plugin/highlight`, `plugin/markdown`, `plugin/math`, `plugin/notes`, `plugin/search`, `plugin/zoom`), each with its own `vite.config.ts` and TS entry that re-exports the JS plugin.
- Loader / lifecycle in `js/controllers/plugins.js` — see "Plugin loader interface" below.
- Plugin shape: `{ id: string, init?(deck): Promise|void, destroy?() }`. `init` may return a Promise; reveal.js waits for all plugins before firing `ready`.

### Accessibility
- An off-screen `.aria-status` div with `aria-live="polite"` announces slide contents to screen readers (`js/reveal.js:357-432`). Block-level text elements get punctuation appended for readable pacing.
- `aria-hidden` is set on non-present slides; `role="application"` on the wrapper.
- The keyboard help overlay (`?` key) lists current shortcuts (`js/controllers/overlay.js`).
- Status text recursively skips display:none and aria-hidden children.

### React wrapper
See dedicated section below — separately published as `@revealjs/react`, source under `/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/react/`.

## Notable libraries & dependencies

`devDependencies` (also runtime-bundled into `dist/`):

| Package | Use | Where |
| --- | --- | --- |
| `highlight.js` ^11.11.1 | Syntax highlighting | `plugin/highlight/plugin.js:1` |
| `marked` ^17.0.5 | Markdown → HTML | `plugin/markdown/plugin.js:7` |
| `marked-smartypants` ^1.1.11 | Curly quotes / em-dashes | `plugin/markdown/plugin.js:8`, opt-in via `markdown.smartypants: true` |
| `fitty` ^2.4.2 | Text auto-fit for `.r-fit-text` | `js/controllers/slidecontent.js:4` |
| `esbuild` ^0.28.0 | Used by `scripts/build-es5.js` to minify the ES5 bundle | `scripts/build-es5.js:4` |
| `typescript` ^6.0.2 | Type emit + ES5 transpile | `tsconfig.json`, `scripts/build-es5.js` |
| `vite` ^8.0.3 + `vite-plugin-dts` | Build pipeline | `vite.config.ts`, per-plugin configs |
| `sass` ^1.98.0 | SCSS compilation | `vite.config.styles.ts` |
| `jszip` ^3.10.1 | `scripts/zip.js` packaging | `scripts/zip.js` |
| `glob` ^13.0.6 | Discover test files | `scripts/test.js:3` |
| `node-qunit-puppeteer` ^2.2.1 + `qunit` | Headless Chrome test runner | `scripts/test.js:4` |
| KaTeX / MathJax 2/3/4 | Loaded **dynamically at runtime** from a configurable CDN by the math plugin (not bundled) | `plugin/math/katex.js`, `plugin/math/mathjax{2,3,4}.js` |

No production runtime dependencies — `dependencies` is empty. Everything is bundled into the `dist/` outputs.

## Code patterns worth studying

### Slide initialization & DOM model

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/reveal.js:107-125
slideContent = new SlideContent( Reveal ),
slideNumber  = new SlideNumber( Reveal ),
// ...
notes        = new Notes( Reveal );
```

Every controller takes a single argument: the `Reveal` instance object. The factory mutates that same `Reveal` reference at the end (`js/reveal.js:2932-2959`) so each controller can call back into the master API after construction — a kind of late-binding dependency injection.

The DOM model is shockingly minimal: just `.reveal > .slides > section[ > section ]*`. Backgrounds live in a parallel `.backgrounds > .slide-background` tree generated at runtime. Controls, progress, slide number, jump-to overlay are appended to `.reveal` as siblings of `.slides`.

### Navigation (`Reveal.slide`)

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/reveal.js:1263-1300
function slide( h, v, f, origin ) {
  const slidechange = dispatchEvent({
    type: 'beforeslidechange',
    data: { indexh: h ?? indexh, indexv: v ?? indexv, origin }
  });
  if( slidechange.defaultPrevented ) return;

  previousSlide = currentSlide;
  // ...
  indexh = updateSlides( HORIZONTAL_SLIDES_SELECTOR, h === undefined ? indexh : h );
  indexv = updateSlides( VERTICAL_SLIDES_SELECTOR, v === undefined ? indexv : v );
  // ...
}
```

`updateSlides(selector, index)` is the only place slide state classes are mutated. It loops every section matching the selector, clears past/present/future + `hidden` + `aria-hidden`, then re-applies them based on the relationship to `index` (`js/reveal.js:1681-1797`). In print mode every slide gets `present`.

### Fragment system

Order is resolved by `Fragments.sort()`:

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/fragments.js:99-144
sort( fragments, grouped = false ) {
  // Fragments with explicit data-fragment-index go into "ordered" buckets keyed by index;
  // fragments without indices keep document order and follow.
  // After flattening, every fragment is re-assigned a contiguous data-fragment-index.
}
```

`update(index)` (line 177+) walks the sorted list, toggles `.visible` for `i <= index` and `.current-fragment` for `i === index`, and dispatches `fragmentshown` / `fragmenthidden` events with both the primary fragment and any siblings sharing the same index. The current fragment also gets announced via `Reveal.announceStatus()` for screen readers.

`goto(null, +/- 1)` is the entry point for `Reveal.nextFragment()` and `Reveal.prevFragment()` (line 357-373). When fragment navigation runs out, `slide()` falls back to slide navigation, producing the familiar "fragments first, then the next slide" UX.

### Transition CSS classes

The transition CSS is generated by Sass mixins that emit selectors for every combination of `past`/`future` × horizontal/vertical × `data-transition` or container-class variants:

```scss
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/css/reveal.scss:855-872
@each $stylename in default, convex {
  @include transition-stack(#{$stylename})        { transform-style: preserve-3d; }
  @include transition-horizontal-past(#{$stylename}) {
    transform: translate3d(-100%, 0, 0) rotateY(-90deg) translate3d(-100%, 0, 0);
  }
  @include transition-horizontal-future(#{$stylename}) {
    transform: translate3d(100%, 0, 0) rotateY(90deg) translate3d(100%, 0, 0);
  }
  // ...
}
```

The `transition-horizontal-past` mixin (`css/reveal.scss:800-806`) generates selectors of the form `.reveal .slides > section[data-transition='convex'].past`, `.reveal .slides > section[data-transition~='convex-out'].past`, and `.reveal.convex .slides > section:not([data-transition]).past`. This is what allows the "split" `data-transition="convex-in fade-out"` syntax.

The base transition timing lives on every `<section>`:

```scss
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/css/reveal.scss:714-735
transition: transform-origin 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985),
            transform 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985),
            visibility 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985),
            opacity 800ms cubic-bezier(0.26, 0.86, 0.44, 0.985);

.reveal[data-transition-speed='fast'] .slides section { transition-duration: 400ms; }
.reveal[data-transition-speed='slow'] .slides section { transition-duration: 1200ms; }
```

### Auto-Animate — reveal.js's Morph-equivalent (deep dive)

Auto-Animate is reveal.js's analogue to PowerPoint's Morph: between two consecutive slides that share `data-auto-animate`, matching elements smoothly tween between their positions, sizes, and a configurable set of style properties. Implementation lives entirely in `/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/autoanimate.js` (627 lines).

#### When is it triggered?

`shouldAutoAnimateBetween(fromSlide, toSlide, indexhBefore, indexvBefore)` at `js/reveal.js:1469-1475`:

```js
return fromSlide.hasAttribute('data-auto-animate')
    && toSlide.hasAttribute('data-auto-animate')
    && fromSlide.getAttribute('data-auto-animate-id') === toSlide.getAttribute('data-auto-animate-id')
    && !( (indexh > indexhBefore || indexv > indexvBefore) ? toSlide : fromSlide )
         .hasAttribute('data-auto-animate-restart');
```

The `data-auto-animate-id` lets you opt into separate animation groups; if both slides have no id, both `null` values are equal so auto-animate still runs. `data-auto-animate-restart` on the latter slide forces a fresh transition (i.e. no morph).

#### The matching algorithm

`getAutoAnimatePairs(fromSlide, toSlide)` (`js/controllers/autoanimate.js:442-507`) runs four selector passes, each producing pairs by serializing elements into string keys:

1. **Explicit `[data-id]`** — keyed by `nodeName + ':::' + data-id`. This is the strongest signal and lets authors stitch otherwise-unrelated DOM together.
2. **Text nodes** (`h1, h2, h3, h4, h5, h6, p, li`) — keyed by `nodeName + ':::' + trimmed textContent`. Text nodes get `scale: false` in their pair options so they tween font properties instead of scaling.
3. **Media** (`img, video, iframe`) — keyed by `src` or `data-src`.
4. **Code** (`pre`) — keyed by trimmed textContent, with `scale: false`. Additionally, the controller walks into the highlight.js DOM (`.hljs .hljs-ln-code` and `.hljs .hljs-ln-numbers[data-line-number]`) and matches individual code lines so adding a line to a code block visually slides existing lines down. Code-line pairs use `getLocalBoundingBox` (offset-based instead of `getBoundingClientRect`) to avoid scale interference.

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/autoanimate.js:484-499
this.findAutoAnimateMatches( pairs, pair.from, pair.to, '.hljs .hljs-ln-code', node => {
    return node.textContent;
}, {
    scale: false,
    styles: [],
    measure: this.getLocalBoundingBox.bind( this )
} );
```

`findAutoAnimateMatches` (line 540-589) is interesting: when there are multiple `from` elements with the same key, it pairs by index — first `to` matches first `from`, second matches second, etc., falling back to the last available `from` if `to` outnumbers them. This is why list reordering animations work (see `examples/auto-animate.html:104-129`).

A custom `autoAnimateMatcher` function can be provided through config (`config.ts:516`) to override matching entirely.

#### The FLIP transition

For each matched pair, `autoAnimateElements(from, to, ...)` (line 160-282) builds CSS for a [FLIP](https://aerotwist.com/blog/flip-your-animations/) animation:

1. Read `getBoundingClientRect()` (or `offsetLeft`/`offsetTop` if `center` is off) for both elements (`getAutoAnimatableProperties`, line 333-405). Divide by `Reveal.getScale()` to undo the deck-level scale.
2. Compute deltas: `{ x: from.x - to.x, y: from.y - to.y, scaleX: from.width/to.width, scaleY: from.height/to.height }` (line 195-200, rounded to 3 decimals to avoid sub-pixel blur).
3. Read computed styles for the configured `autoAnimateStyles` (default: opacity, color, background-color, padding, font-size, line-height, letter-spacing, border-width, border-color, border-radius, outline, outline-offset — `config.ts:909-922`). Strip any properties whose `from` and `to` values are identical.
4. Generate two CSS rules: one keyed by `[data-auto-animate-target="ID"]` (the FROM state, with `transition: none` and the deltas inverted) and one keyed by `[data-auto-animate="running"] [data-auto-animate-target="ID"]` (the TO state, with `transition: all <duration>s <easing> <delay>s` and `transform: none`).

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/autoanimate.js:265-277
let fromCSS = Object.keys( fromProps.styles ).map( propertyName =>
  propertyName + ': ' + fromProps.styles[propertyName] + ' !important;'
).join( '' );

let toCSS = Object.keys( toProps.styles ).map( propertyName =>
  propertyName + ': ' + toProps.styles[propertyName] + ' !important;'
).join( '' );

css = '[data-auto-animate-target="'+ id +'"] {'+ fromCSS +'}' +
      '[data-auto-animate="running"] [data-auto-animate-target="'+ id +'"] {'+ toCSS +'}';
```

5. All generated CSS for the transition is concatenated and assigned in one shot to a dedicated `<style>` element (`autoAnimateStyleSheet`, lazily created via `createStyleSheet()`). The comment at line 96-98 notes this is much faster than `sheet.insertRule` per rule.
6. On the next animation frame, the controller flips `toSlide.dataset.autoAnimate = 'running'`, which switches every `[data-auto-animate-target]` element from its FROM rule to its TO rule. The browser interpolates.

#### Unmatched elements

If `config.autoAnimateUnmatched` is true and `data-auto-animate-unmatched` isn't set to `"false"` on the slide, every element that's neither a target nor an ancestor of a target gets `data-auto-animate-target="unmatched"` and a default 0.8s opacity transition with a 0.2s delay, producing a fade-in for new content (`js/controllers/autoanimate.js:69-94`).

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/autoanimate.js:92
css.push( `[data-auto-animate="running"] [data-auto-animate-target="unmatched"] { transition: opacity ${defaultUnmatchedDuration}s ease ${defaultUnmatchedDelay}s; }` );
```

#### Reset

`reset()` (line 128-146) wipes the `data-auto-animate` and `data-auto-animate-target` datasets and removes the injected stylesheet — called before every new transition and during `Reveal.configure()`.

#### Authoring surface

```html
<!-- /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/examples/auto-animate.html:21-42 -->
<section data-auto-animate data-auto-animate-unmatched="fade">
  <h3>Auto-Animate Example</h3>
  <p>This will fade out</p>
  <img src="assets/image1.png" style="height: 100px" />
  <pre data-id="code"><code class="hljs">function Example() { ... }</code></pre>
</section>
<section data-auto-animate data-auto-animate-unmatched="fade">
  <h3>Auto-Animate Example</h3>
  <p style="opacity:0.2; margin-top:100px">This will fade out</p>
  <p>This element is unmatched</p>
  <img src="assets/image1.png" style="height: 150px" />
  <pre data-id="code"><code class="hljs">function Example() { New line! ... }</code></pre>
</section>
```

Note `data-id="code"` is the manual hook that pairs the `<pre>` blocks. The `<h3>` pairs automatically because text content matches.

### Plugin loader interface

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/plugins.js:35-90
load( plugins, dependencies ) {
  this.state = 'loading';
  plugins.forEach( this.registerPlugin.bind( this ) );

  return new Promise( resolve => {
    // 'dependencies' is the legacy script-loader interface
    // each entry can be { src, async?, condition?, callback? } OR an inline plugin object
    // async dependencies are loaded after init, sync ones block init.
    // initPlugins() is invoked once sync scripts have loaded.
  } );
}
```

`initPlugins()` (line 96-152) walks the registered plugin map sequentially, awaits any returned Promise from `plugin.init(deck)`, and finally fires the `ready` event. A plugin shape is `{ id, init?, destroy? }`. Backwards-compat path at line 180-185 still accepts the old `registerPlugin(id, plugin)` signature.

Plugins are addressable post-init via `Reveal.getPlugin('markdown')`, useful for invoking plugin-specific APIs like `Reveal.getPlugin('markdown').slidify('...')`.

### Speaker view sync (host ↔ popup)

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/plugin/notes/plugin.js:25-44
function openSpeakerWindow() {
  speakerWindow = window.open( 'about:blank', 'reveal.js - Notes', 'width=1100,height=700' );
  speakerWindow.marked = marked;          // share the marked instance with the popup
  speakerWindow.document.write( speakerViewHTML ); // inline HTML written into popup
  connect();
}

// plugin.js:68-87
function connect() {
  connectInterval = setInterval( () => {
    speakerWindow.postMessage( JSON.stringify( {
      namespace: 'reveal-notes', type: 'connect',
      state: deck.getState(), url
    } ), '*' );
  }, 500 );
  window.addEventListener( 'message', onPostMessage );
}
```

The popup runs as a self-contained mini-deck: it loads two iframes pointing at the same presentation URL with `?receiver` flags, then forwards keyboard events to the current-slide iframe via `triggerKey` postMessage calls (`plugin/notes/speaker-view.html:528-538`). XSS safety is enforced via `isSameOriginEvent` (plugin.js:166-175) so cross-origin messages are dropped.

Reconnect-after-reload is achieved by the popup spamming a heartbeat every 1s; the host listens for those and reattaches via `reconnectSpeakerWindow()` if it finds itself without a `speakerWindow` reference (plugin.js:240-256).

### PDF export rendering

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/printview.js:39-46
createStyleSheet( '@page{size:'+ pageWidth +'px '+ pageHeight +'px; margin: 0px;}' );
createStyleSheet( '.reveal section>img, .reveal section>video, .reveal section>iframe{...}' );
document.documentElement.classList.add( 'reveal-print', 'print-pdf' );
document.body.style.width = pageWidth + 'px';
document.body.style.height = pageHeight + 'px';
```

The full flow:
1. Wait one `requestAnimationFrame`, then write `@page` size and per-element max sizes.
2. Toggle `reveal-print` + `print-pdf` classes on `<html>` (which `css/print/pdf.scss` keys off of).
3. Re-layout `r-stretch` elements at print sizes.
4. Batch-read `scrollHeight` for every slide (one frame, to prevent interleaved reads/writes).
5. For each slide, build a `<div class="pdf-page">` of `pageHeight × pageHeight * numberOfPages`, copy the slide's background as the page background, and append the slide.
6. If `pdfSeparateFragments`, walk fragment groups, clone the page for each cumulative step, and append. Reset the original page so all fragments are hidden.
7. After all pages are constructed, append them in one batch and dispatch `pdf-ready`.

`config.pdfMaxPagesPerSlide` caps how many pages a single tall slide can spill onto. `config.pdfPageHeightOffset` (default `-1`) compensates for browser print-engine differences in how the document's last pixel rounds.

### Markdown plugin (parsing and splitting)

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/plugin/markdown/plugin.js:10-14
const DEFAULT_SLIDE_SEPARATOR = '\r?\n---\r?\n',
      DEFAULT_VERTICAL_SEPARATOR = null,
      DEFAULT_NOTES_SEPARATOR = '^\s*notes?:',
      DEFAULT_ELEMENT_ATTRIBUTES_SEPARATOR = '\\\.element\\\s*?(.+?)$',
      DEFAULT_SLIDE_ATTRIBUTES_SEPARATOR = '\\\.slide:\\\s*?(\\\S.+?)$';
```

- `slidify(markdown, options)` (line 137-203) walks separator regex matches, building a tree of `[horizontal][vertical]` content, then emits an HTML string of nested `<section data-markdown>...<script type="text/template">...</script></section>`.
- `loadExternalMarkdown(section)` (line 263-305) XHRs the URL in `data-markdown` and slidifies the response. Supports `data-charset` for non-UTF8.
- `convertSlides()` (line 388-417) replaces each section's HTML with `markedInstance.parse(...)`, preserving any pre-existing `aside.notes` from data-attribute-based notes.
- `addAttributes` (line 344-382) is a recursive DOM walker that looks for HTML comment nodes matching `<!-- .element: ... -->` or `<!-- .slide: ... -->` and applies them to the previous sibling or the section, respectively.
- Custom code renderer (line 438-459) consumes the `[lineRange|step]` extension that the highlight plugin reads — markdown like `` ```js [1|3-5] `` becomes `<pre><code class="js" data-line-numbers="1|3-5">`.
- `markdown.animateLists: true` (line 460-465) replaces the `listitem` renderer to wrap each `<li>` in `class="fragment"` for automatic stepped-list reveals.

### Highlight plugin

`/Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/plugin/highlight/plugin.js:97-166` shows the line-stepping fragment trick: a code block with `data-line-numbers="1|3-5|9"` is cloned once per step, each clone gets `class="fragment"` and a serialized highlight range, and they're appended as siblings. Stepping through fragments swaps which block is visible, and the plugin scrolls highlighted lines into view (line 172+) so long blocks animate to the right region.

### Keyboard system

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/reveal.js/js/controllers/keyboard.js:72-89
addKeyBinding( binding, callback ) {
  if( typeof binding === 'object' && binding.keyCode ) {
    this.bindings[binding.keyCode] = {
      callback, key: binding.key, description: binding.description
    };
  } else {
    this.bindings[binding] = { callback, key: null, description: null };
  }
}
```

`config.keyboard` may be a map of `keyCode → action` ('next', 'prev', or a function), letting decks override defaults declaratively. `triggerKey(keyCode)` (used by the speaker view's iframe forwarding) synthesises and dispatches a key event so the same handler runs.

### Auto-Animate in ScrollView

`ScrollView.createPageElement` (`js/controllers/scrollview.js:62-95`) detects auto-animated sequences and merges them under a single page element with extra `.scroll-auto-animate-page` content containers, so that scroll-driven progress steps through the morph rather than jumping. This means Auto-Animate is reused across both navigation modes (slide and scroll).

## Strengths to learn from

- **Tiny mental model**: the deck is just `.reveal > .slides > section` and a couple of generated parallel trees. Authors can write decks in pure HTML with no build step.
- **Controllers as single-responsibility modules**: `js/controllers/*.js` makes the surface area trivially scannable. Each controller's public API is a handful of methods called from the main `slide()` / `layout()` / `sync()` pipeline.
- **Auto-Animate is genuinely impressive** for being only ~600 lines. The combination of a pluggable matcher, FLIP-style measurement, single-style-tag injection, and deep highlight.js integration covers most slide-to-slide morph use cases without any animation library.
- **Postmessage-based speaker view** with heartbeat reconnection is robust and origin-isolated — no Socket.IO, no shared server, no BroadcastChannel.
- **PDF export uses native browser print** with carefully constructed `.pdf-page` wrappers and `@page` rules instead of headless PDF rendering — meaning users can print to PDF from Chrome directly.
- **Theme system is variable-driven**: every theme is a few dozen lines because the work is done by `template/theme.scss` reading `--r-*` custom properties.
- **CSS-first transitions**: every transition style is just a CSS class on `<section>` matched against `.past`/`.future`. The JS side never animates DOM; it only toggles class names and lets CSS do the work.
- **Embedded mode + multiple instances**: a page can host many decks simultaneously, supporting tutorials and documentation sites.
- **Accessibility hooks** are baked in (aria-live status, role=application, focus management on visibilitychange).
- **Layout helpers (`r-*`) feel like a mini Tailwind tailored to slides** — easy to remember, composable.

## Weaknesses / pain points

- **The 2,963-line `js/reveal.js` is still JS, not TS.** Types come from a hand-maintained `js/reveal.d.ts` and `js/config.ts`. Internal coupling is high (every controller mutates the shared `Reveal` object), so refactors are scary.
- **Closure-scoped factory pattern** means state isn't introspectable from outside; tests have to drive everything through the public API or DOM.
- **No reactivity / data binding**: authors hand-write `<section>` HTML. React wrapper exists but is a thin adapter that still mounts a vanilla deck inside.
- **Theming is global CSS** with all the cascade/specificity headaches that brings. Multiple decks on a page must share a theme.
- **Markdown plugin shoehorns content into `<script type="text/template">`** to dodge HTML parsing, but then has to do its own line-trimming heuristics (`getMarkdownFromSlide`, plugin.js:40-63). Whitespace bugs are recurring.
- **Speaker view HTML is one big inline file** (`plugin/notes/speaker-view.html`, 910 lines) that mixes CSS, HTML, and JS. Painful to evolve; can't be hot-reloaded.
- **No Mermaid / chart plugins** in core. Community has filled the gap, but with varying quality.
- **PostMessage API uses JSON-string envelopes everywhere** — there's no typed RPC layer, and the blacklist regex (`POST_MESSAGE_METHOD_BLACKLIST`) is the only access control.
- **PDF export depends on the user's browser print engine** and has a `pdfPageHeightOffset: -1` knob to paper over rendering differences. Not deterministic.
- **No first-party MCP / agentic surface**, no SSR/static export, no Astro/Vite integration beyond the dev server. The build emits a bundled JS file you `<script src>`.
- **Auto-Animate matcher is heuristic**: text matches by trimmed contents means renaming or rephrasing a heading breaks the morph; `data-id` is required for robust pairing. Code matches by `pre`-level text content, so any change yanks the whole block instead of diffing within.
- **Tests are QUnit + puppeteer + dozens of HTML fixtures**, not modern unit tests. Hard to run granular cases.
- **`fitty` polls the layout** (it uses `requestAnimationFrame` loops) — that plus interval-based scroll prevention (`setupScrollPrevention`, 1Hz `setInterval`, `js/reveal.js:459-468`) is a small but constant CPU cost.
- **Backwards compat is heavy**: the singleton `Reveal` global, the legacy pre-4.0 enqueue pattern, the deprecated `cube`/`page` transitions, ES5 build via `tsc → esbuild` are all maintenance overhead.

## Relevance to our project

For our Astro + TypeScript + MCP framework, the most directly portable ideas are: the **two-level slide model** (`.slides > section[ > section ]*`), the **FLIP-based Auto-Animate algorithm with a pluggable matcher** (`autoanimate.js`), the **fragment system** (sorted by `data-fragment-index`, toggled by class), and the **postMessage-based speaker view with heartbeat reconnection**. We should also borrow the **`r-stretch` / `r-fit-text` / `r-stack` layout helpers** and the **CSS-custom-property-driven theming** — both are tiny but high-impact. The **plugin shape** (`{ id, init(deck), destroy }`) is a good baseline for our MCP server's tool registration model, though we'd want a typed registry instead of the loose `registeredPlugins` map.

What we should consciously *avoid* lifting: the 3000-line closure-scoped factory (we want TS modules with explicit dependency injection); the inline-everything speaker view HTML (we want a real Astro page); the printview's reliance on browser print (we should produce static HTML/PDF via headless Chromium or Pandoc); the JSON-string postMessage RPC (we want typed channels, ideally MCP tools when local, structured message ports otherwise); and the markdown-via-`<script type="text/template">` hack (Astro's `.mdx` + custom remark/rehype plugins give us a much cleaner path). The reveal.js codebase is excellent reference material for *what* an HTML deck framework needs to do, but our type-first, framework-native rewrite can be substantially smaller and clearer once we lean on Astro components for authoring and on a real MCP server for the AI integration surface.
