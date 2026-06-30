# react-slides (folder name) — Real project: reveal.js 3.3.0 (Hakim El Hattab)

## What this actually is

Despite the folder name `reference-applications/react-slides`, the contents
of `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides`
are an unmodified copy of **reveal.js 3.3.0** by Hakim El Hattab — a
vanilla-JavaScript HTML presentation framework. The folder is a fork-and-
checkout used by a third party (Santanu Bhattacharya) to author a
React + Redux training deck on top of reveal.js. The misnomer comes from
the *deck's topic*, not the framework itself.

Evidence:

- `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/package.json` declares
  `"name": "reveal.js"`, `"version": "3.3.0"`, author Hakim El Hattab, repo
  `git://github.com/hakimel/reveal.js.git`.
- `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/bower.json`
  mirrors the same identity.
- `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/js/reveal.js`
  banner: `Copyright (C) 2016 Hakim El Hattab` and `var VERSION = '3.3.0';`.
- `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/README.md`
  is the upstream reveal.js README.
- `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/index.html`
  has been replaced with a "React Redux Tutorial" deck authored by
  `Santanu Bhattacharya`, but `demo.html` is the stock reveal.js demo.
- `git log` in the folder shows seven commits between 2016-08-23 and
  2016-09-05 by Santanu Bhattacharya, with messages like `react redux added`,
  `redux async added`, `reference added`. No upstream reveal.js commits.

This is therefore a **frozen snapshot of reveal.js 3.3.0 used as a slide
authoring runtime**, not a React library and not an active fork. There is
no React/JSX runtime, no bundler config, no Node server beyond the optional
`plugin/multiplex` and `plugin/notes-server`.

## Summary

reveal.js is a **vanilla-JavaScript HTML presentation framework** for
authoring browser-rendered slide decks. Slides are written as plain HTML
`<section>` elements inside a `.reveal > .slides` container; the runtime
in `js/reveal.js` reads the DOM, applies CSS transforms for scaling and
transitions, and synchronizes URL hash, keyboard, touch, and an optional
speaker-notes pop-up. The 3.3.0 snapshot in this folder is from 2016 and
is **dormant relative to upstream** (current reveal.js is 5.x+, ESM-first,
no Grunt). Philosophy: HTML *is* the slide format, the JS layer adds
navigation, fragments, transitions, plugins; no build step is required
to ship a presentation.

## At a glance

| Aspect | Value |
| --- | --- |
| Real project | reveal.js 3.3.0 (Hakim El Hattab, MIT) |
| Authoring format | HTML `<section>` elements; optional Markdown via `data-markdown` |
| Runtime stack | One ~4,700-line vanilla JS IIFE (`js/reveal.js`); UMD wrapper (AMD/CommonJS/global); `head.js` loader; no framework runtime |
| Rendering approach | DOM + CSS3 transforms; `.past`/`.present`/`.future` classes drive transitions |
| Build | Grunt (Sass for themes, Uglify, QUnit, livereload `connect`/`watch`) |
| Plugins | Markdown, syntax highlight, math, speaker notes (popup + server), multiplex, search, zoom, PDF print |
| Tests | QUnit pages under `test/` |
| Browser support | Modern + IE9 fallbacks (`html5shiv.js`, `classList.js`) |
| Status (this snapshot) | Dormant — last touched 2016-09-05; upstream has since moved several majors ahead |
| License | MIT |

## Architecture

The entire runtime is a single IIFE in
`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/js/reveal.js`
(4,744 lines) exposing a global `Reveal` (also AMD/CommonJS via the UMD
header at lines 8–22).

The lifecycle is:

1. **`Reveal.initialize(options)`** (line 254) — runs `checkCapabilities()`,
   caches `dom.wrapper` (`.reveal`) and `dom.slides` (`.reveal .slides`),
   merges defaults + query string into `config`, then calls `load()`.
2. **`load()`** (line 353) — uses `head.js` to load entries in
   `config.dependencies`, honouring `condition`, `async`, and per-script
   `callback`. Once synchronous scripts finish, `proceed()` fires `start()`.
3. **`start()`** (line 414) — builds DOM scaffolding (`setupDOM`),
   wires `postMessage`, resets vertical stacks, runs `configure()`, reads
   the URL hash via `readURL()`, updates backgrounds, dispatches `ready`.
   PDF mode is detected by query string `?print-pdf` and routed to
   `setupPDF()` (line 547).
4. **`setupDOM()`** (line 473) — creates singletons: `.backgrounds`,
   `.progress`, `.controls`, `.slide-number`, `.speaker-notes`,
   `.pause-overlay`, plus an offscreen `aria-live="polite"` status div for
   screen readers (`createStatusDiv`, line 524).

The default presentation **size** is `960×700` (`config.width/height`,
lines 41–43). On every `layout()` (line 1586) the runtime computes a uniform
scale to fit the viewport: it prefers CSS `zoom` when scaling up (for crisp
text) and falls back to `transform: scale(...) translate(-50%, -50%)`
otherwise (lines 1620–1636). Vertical centering of slides is done by JS
setting `slide.style.top`.

**Slide topology.** Slides are arranged on a 2-D grid: horizontal slides
are direct `.slides > section` children; nested `<section>` elements inside
one of those become a **vertical stack** for that column. Three CSS
selectors do the heavy lifting (lines 31–34):

```js
SLIDES_SELECTOR            = '.slides section'
HORIZONTAL_SLIDES_SELECTOR = '.slides>section'
VERTICAL_SLIDES_SELECTOR   = '.slides>section.present>section'
HOME_SLIDE_SELECTOR        = '.slides>section:first-of-type'
```

Each slide is tagged with one of three state classes — `past`, `present`,
`future` — which CSS uses to position and animate it. The core update
function is `slide(h, v, f, o)` at line 2110: it updates `indexh`/`indexv`,
toggles the three classes via `updateSlides()` (line 2371), runs `layout()`,
applies `data-state` classes to `<html>`, dispatches a `slidechanged`
event, then calls a fan-out of `updateControls`, `updateProgress`,
`updateBackground`, `updateParallax`, `updateSlideNumber`, `updateNotes`,
`writeURL`, `cueAutoSlide`.

**Backgrounds** are extracted from per-slide `data-background*` attributes
and moved into a sibling `.backgrounds` container (one element per slide).
`createBackgrounds()` (line 709) walks the slides; `createBackground()`
(line 776) interprets `data-background`, `data-background-image`,
`data-background-video`, `data-background-iframe`, `data-background-color`,
`-size`, `-repeat`, `-position`, `-transition`. A `data-background-hash`
is computed so that successive identical backgrounds don't re-transition.
The runtime then auto-classifies each slide as `has-light-background` or
`has-dark-background` based on computed luminance.

**Fragments** (step-through reveals within a slide) are the
`.fragment` descendants. `sortFragments()` (line 3533) honours
`data-fragment-index` to group simultaneous reveals, then
`navigateFragment(index, offset)` (line 3591) flips `.visible` and
`.current-fragment` classes and emits `fragmentshown`/`fragmenthidden`.

**Input handling.** Keyboard (`onDocumentKeyDown`, line 3949), touch
(`onTouchStart/Move/End`, lines 4083+), pointer events, and mouse-wheel
scroll all funnel into navigation API. User-defined keybindings via
`config.keyboard` (number → function or string method name) are checked
before built-ins. There's a help overlay (`?`) registered through
`registerKeyboardShortcut`.

**URL & history.** `readURL()` (line 3254) parses `#/h/v/f` hashes; `writeURL()`
(line 3302) pushes/replaces history entries based on `config.history`.
Embedded `postMessage` API (line 867) lets external windows control the deck
by posting `{ method, args }` JSON — used by the multiplex client and notes
window.

**Overview mode** (`activateOverview`, line 1780) lays slides on a grid via
`translate3d` per-slide (line 1847), letting the user pan/click to jump.
ESC/O toggles it.

## Authoring format

A reveal.js deck is hand-authored HTML. From
`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/demo.html`:

```html
<div class="reveal">
  <div class="slides">
    <section><h1>Reveal.js</h1></section>

    <!-- Vertical stack -->
    <section>
      <section><h2>Vertical Slides</h2></section>
      <section><h2>Basement Level 1</h2></section>
      <section><h2>Basement Level 2</h2></section>
    </section>

    <!-- Markdown slide -->
    <section data-markdown>
      <script type="text/template">
        ## Markdown support
        Write content using inline or external Markdown.
      </script>
    </section>

    <!-- Fragments -->
    <section>
      <p class="fragment">step 1</p>
      <p class="fragment grow">step 2</p>
      <p class="fragment highlight-red">step 3</p>
    </section>

    <!-- Background variants -->
    <section data-background="#dddddd">…</section>
    <section data-background="image.png" data-background-repeat="repeat" data-background-size="100px">…</section>
    <section data-background-video="video.mp4,video.webm" data-background-color="#000">…</section>

    <!-- Per-slide transition + background transition -->
    <section data-transition="slide" data-background="#4d7e65" data-background-transition="zoom">…</section>

    <!-- State class + custom event -->
    <section data-state="customevent">…</section>

    <!-- Speaker notes -->
    <section>
      <h2>Speaker notes</h2>
      <aside class="notes">These are hidden in the main view but shown in the speaker pop-up.</aside>
    </section>
  </div>
</div>

<script src="lib/js/head.min.js"></script>
<script src="js/reveal.js"></script>
<script>
  Reveal.initialize({
    controls: true, progress: true, history: true, center: true,
    transition: 'slide',
    dependencies: [
      { src: 'plugin/markdown/marked.js' },
      { src: 'plugin/markdown/markdown.js' },
      { src: 'plugin/notes/notes.js', async: true },
      { src: 'plugin/highlight/highlight.js', async: true,
        callback: function() { hljs.initHighlightingOnLoad(); } }
    ]
  });
</script>
```

Key authoring conventions:

- The hierarchy **must** be `.reveal > .slides > section`. One `<section>` =
  one slide; nested `<section>`s = a vertical stack.
- Attributes on `<section>` control behaviour: `data-transition`,
  `data-background*`, `data-state`, `data-autoslide`, `data-markdown`,
  `data-notes`, `id` (for `#/anchor` deeplinks).
- `aside.notes` inside a slide is the speaker note. Markdown notes are
  supported via the `note:` separator (see markdown plugin) or
  `data-markdown` on the aside.
- `.fragment` classes are augmented with modifiers like `grow`, `shrink`,
  `fade-out`, `fade-up`, `fade-down`, `fade-left`, `fade-right`,
  `current-visible`, `highlight-red|blue|green`,
  `highlight-current-red|blue|green` (CSS in
  `/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/css/reveal.scss`
  lines 74–207).
- Code blocks use `<pre><code data-trim data-noescape>` for verbatim
  preservation; the bundled `plugin/highlight` is highlight.js.
- Lazy-loaded assets use `data-src` rather than `src`, swapped in at
  display time (`loadSlide`/visibility logic in `js/reveal.js`).

For the React/Redux tutorial in this snapshot, see
`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/index.html`
— the author writes one `<section>` per concept, inlines escaped JSX
snippets inside `<pre><code data-trim data-noescape>`, and uses image-based
slides for diagrams under `images/middleware/`, `images/async/`,
`images/react_redux/`.

## Features (catalog)

### Slide model & navigation
- 2-D grid (horizontal + vertical stacks), `Reveal.slide(h, v, f)` —
  `js/reveal.js:2110`.
- Persistent "previous vertical index" so jumping out of and back into a
  stack resumes where you left off — `js/reveal.js:1748`, `:1763`.
- Available routes/fragments helpers `availableRoutes()` / `availableFragments()`
  drive control button styling — `js/reveal.js:2988`, `:3017`.
- Shuffle mode (`config.shuffle`) randomizes slide order on load —
  `js/reveal.js:2344`.
- RTL via `config.rtl` swaps past/future for horizontal direction —
  `updateBackground` at `js/reveal.js:2700`.

### Transitions
- Configurable globally (`transition: 'slide'|'fade'|'convex'|'concave'|'zoom'|'none'`)
  and per-slide with `data-transition` (and split via `*-in`/`*-out`).
- Implemented entirely in CSS with SCSS mixins
  (`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/css/reveal.scss:486–603`):
  `@mixin transition-horizontal-past`, `transition-horizontal-future`,
  `transition-vertical-past`, `transition-vertical-future`. Each transition
  style declares the past/future transform — e.g. `slide` uses
  `translate(±150%, 0/0, ±150%)`, `convex/concave` add `rotateY/rotateX`,
  `zoom` uses `scale(16)` / `scale(0.2)` plus `visibility:hidden` to mask
  glitches.
- Speed: `transitionSpeed: default|fast|slow` — selector
  `.reveal[data-transition-speed="fast"] .slides section`
  (`css/reveal.scss:428+`).
- Background transitions are separately configurable
  (`backgroundTransition`).

### Fragments
- Click-through reveals with implicit DOM-order indexing, overridden by
  `data-fragment-index` (`js/reveal.js:3533`).
- 11+ fragment animation classes via CSS (`reveal.scss:74–207`).
- Events: `fragmentshown`, `fragmenthidden` (`js/reveal.js:3647–3653`),
  used by the speaker notes window to sync.

### Backgrounds
- Image, color, video (auto-played from `data-background-video`,
  multi-source comma-separated), iframe, repeating tiles, GIFs that get
  reset on entry (`js/reveal.js:2779–2787`).
- Background transitions per slide or globally.
- Parallax background image with horizontal/vertical pixel-per-slide tuning
  (`updateParallax`, `js/reveal.js:2824`).
- Brightness sniffing: each background's computed color decides
  `has-light-background`/`has-dark-background` so themes can swap text
  color on per-slide basis (`js/reveal.js:836–851`).

### Layout
- Fixed virtual `width × height` (default `960 × 700`) scaled to the
  viewport with letterboxing controlled by `config.margin`.
- Per-slide vertical centering and optional `.stretch` children that fill
  the remaining height (`layoutSlideContents`, `js/reveal.js:1677`).
- `viewDistance` controls how many off-screen slides are rendered
  (offscreen ones are display:none for perf).

### Overview mode
- ESC/O — `activateOverview` (`js/reveal.js:1780`) lays out slides on a 3-D
  grid with `translate3d`. Clicking a slide navigates to it.
- Auto-disabled on Safari due to overview-transition lag
  (`features.overviewTransitions`, `js/reveal.js:336`).

### URL / state
- Hash deeplinks (`#/2/3` = h=2, v=3) via `readURL`/`writeURL`
  (`js/reveal.js:3254`, `:3302`).
- `getState()`/`setState()` serialize indices + paused/overview flags
  (`js/reveal.js:3481`, `:3500`) for persistence and multiplexing.

### Input
- Default keyboard map (`onDocumentKeyDown`, `js/reveal.js:3949`):
  arrows / H J K L for direction, N/P/Space for next/prev, Home/End,
  F=fullscreen, B/. =pause, ESC/O=overview, S=speaker notes (registered
  by `plugin/notes/notes.js:130`).
- Touch: swipe with threshold 40px (`touch.threshold`, line 233),
  swipe direction maps to navigation.
- Mouse wheel throttled by `lastMouseWheelStep`.
- `Reveal.triggerKey(keyCode)` programmatically dispatches keyboard input
  (`js/reveal.js:4732`).
- `config.keyboardCondition` blocks all keys when it returns false.
- Custom user bindings: `config.keyboard = { 13: 'next', 27: function(){} }`.

### Auto-sliding
- `config.autoSlide` (ms) globally; `data-autoslide` overrides per-slide.
- `autoSlideStoppable` + `autoSlideMethod` allow user-input pause and
  custom navigation (`cueAutoSlide` at `js/reveal.js:3695`).
- Built-in `Playback` SVG progress ring class (`js/reveal.js:4418+`).

### Accessibility
- `role="application"` on wrapper, hidden `#aria-status-div` with
  `aria-live="polite"` that mirrors current slide text and current fragment
  text (`createStatusDiv` at `js/reveal.js:524`; updates at `:2234`, `:3631`).
- `aria-hidden` on non-present slides.
- `aria-label` on the four navigation buttons (`js/reveal.js:486–490`).

### Print / PDF
- `?print-pdf` query toggles `css/print/pdf.css`; `setupPDF`
  (`js/reveal.js:547`) injects an `@page` rule, classifies slides as
  fitting one or many pages, and indexes them for headers/footers.
- `plugin/print-pdf/print-pdf.js` drives PhantomJS to render the deck
  headlessly to a PDF file.

### Events
A custom event is dispatched on `dom.wrapper` for every state change
(`dispatchEvent`, `js/reveal.js:1394`): `ready`, `slidechanged`,
`fragmentshown`, `fragmenthidden`, `overviewshown`, `overviewhidden`,
`paused`, `resumed`, plus user-named events from `data-state="foo"`.

## Plugins

All plugins live in
`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/plugin/`.
Each is loaded by listing it in the `dependencies` array passed to
`Reveal.initialize()`. Plugins consume the global `Reveal` API and the
event bus.

| Plugin | Path | What it does |
| --- | --- | --- |
| markdown | `plugin/markdown/markdown.js` (405 lines) + bundled `marked.js` | Detects `[data-markdown]` sections; loads external `.md` via `data-markdown="file.md"` with `data-separator`/`-vertical`/`-notes` regex options; supports `.element` and `.slide:` attribute annotations; splits into nested sections; handles `note:` separator for speaker notes |
| highlight | `plugin/highlight/highlight.js` | Bundled highlight.js (large minified blob, 439 KB) auto-applied to `<pre><code>` |
| math | `plugin/math/math.js` (67 lines) | Thin wrapper over CDN-loaded MathJax. Configures `tex2jax`, re-typesets the current slide on `slidechanged` |
| notes | `plugin/notes/notes.js` (136 lines) | Speaker view: opens a popup window (`notes.html`) and posts state via `postMessage` (origin-agnostic). Registers `S` keyboard shortcut |
| notes-server | `plugin/notes-server/index.js` (69 lines) | Node + Express + socket.io variant of the above for headless setups; serves the speaker view at `/notes/:socketId` rendered via Mustache |
| multiplex | `plugin/multiplex/{index,master,client}.js` | Socket.io master/client model: a `master.js` deck signs each state change with a blowfish hash of the shared `secret`; the server (`index.js`) only re-broadcasts events whose `createHash(secret) === socketId`. `client.js` listens and replays on the audience side |
| search | `plugin/search/search.js` (196 lines) | Adapted Chirp Internet `Hilitor` utility that walks slide text nodes, wraps matches in `<em>`, and navigates between matched slides |
| zoom-js | `plugin/zoom-js/zoom.js` (278 lines) | Alt-click an element to CSS-zoom to it (`zoom` property when supported, else `transform: scale`); ESC zooms out |
| print-pdf | `plugin/print-pdf/print-pdf.js` (48 lines) | PhantomJS driver: opens `index.html?print-pdf`, configures paperSize, renders to PDF |

The dependency loader is built on **head.js** (`lib/js/head.min.js`,
referenced from `bower.json`), allowing scripts to be marked `async` and
to attach `callback`s that run on individual script-ready.

## Notable libraries & dependencies

From `package.json` and `bower.json`:

- **Runtime client libs** (`lib/`):
  - `lib/js/head.min.js` — script loader.
  - `lib/js/classList.js` — IE9 `classList` polyfill, loaded conditionally
    (`condition: function() { return !document.body.classList; }`).
  - `lib/js/html5shiv.js` — IE<9 element shim.
  - `lib/css/zenburn.css` — default highlight.js theme.
  - `lib/font/league-gothic`, `lib/font/source-sans-pro` — bundled webfonts
    for themes.
- **Bower runtime dep**: `headjs ~1.0.3` only.
- **Server (notes/multiplex)**:
  - `express ~4.13.3`, `socket.io ~1.3.7`, `mustache ~2.2.1`.
- **Build deps** (`devDependencies`): Grunt 0.4, `grunt-sass` (node-sass 3.3),
  `grunt-autoprefixer`, `grunt-contrib-cssmin`, `grunt-contrib-uglify`,
  `grunt-contrib-jshint`, `grunt-contrib-qunit`, `grunt-contrib-connect`,
  `grunt-contrib-watch`, `grunt-zip`. Node engine pinned to `~4.1.1`.

(All of these are 2015–2016 vintage. None of them are React.)

## Code patterns worth studying

### 1. UMD wrapper with single global

```js
// js/reveal.js:8–22
(function( root, factory ) {
  if( typeof define === 'function' && define.amd ) {
    define( function() { root.Reveal = factory(); return root.Reveal; } );
  } else if( typeof exports === 'object' ) {
    module.exports = factory();
  } else {
    root.Reveal = factory();
  }
}( this, function() {
  'use strict';
  var Reveal;
  // ...4,700 lines, then `return Reveal;`
}));
```

The entire framework is one closure. State (current indices, config, DOM
refs, features) lives in private vars; the public API is a single object
literal at lines 4575–4740. There are no modules, no classes — just a hash
of methods.

### 2. CSS-driven state machine

The runtime never directly animates a property. Instead it labels each
slide with `past`, `present`, or `future`, and CSS does the rest. Picking
the active transition is a pure selector match:

```scss
// css/reveal.scss:492–543
@mixin transition-horizontal-past($style) {
  .reveal .slides>section[data-transition=#{$style}].past,
  .reveal .slides>section[data-transition~=#{$style}-out].past,
  .reveal.#{$style} .slides>section:not([data-transition]).past { @content; }
}
// …
@each $stylename in slide, linear {
  @include transition-horizontal-past($stylename) {
    transform: translate(-150%, 0);
  }
  @include transition-horizontal-future($stylename) {
    transform: translate(150%, 0);
  }
  // vertical analogues…
}
```

Three orthogonal selectors (global on `.reveal`, per-slide via
`data-transition=X`, split into `X-in`/`X-out`) all collapse into the same
generated rule set. The JS only flips classes; CSS owns the choreography.

### 3. Dependency loader with conditions and callbacks

```js
// js/reveal.js:382–406
for( var i = 0, len = config.dependencies.length; i < len; i++ ) {
  var s = config.dependencies[i];
  if( !s.condition || s.condition() ) {           // optional gating
    if( s.async ) scriptsAsync.push( s.src );
    else          scripts.push( s.src );
    loadScript( s );
  }
}
if( scripts.length ) head.js.apply( null, scripts );
```

Each dependency entry is `{ src, async?, condition?, callback? }`. The
`condition` is a function — used for "only load classList polyfill if the
browser lacks it", "only load markdown.js if any `[data-markdown]` exists",
etc. `callback` lets a plugin initialize itself (e.g. `hljs.initHighlightingOnLoad`).

### 4. postMessage RPC

```js
// js/reveal.js:867–
function setupPostMessage() {
  if( config.postMessage ) {
    window.addEventListener( 'message', function ( event ) {
      var data = event.data;
      // {method, args}
      if( typeof data.method === 'string' && typeof Reveal[ data.method ] === 'function' ) {
        Reveal[ data.method ].apply( Reveal, data.args );
      }
    }, false );
  }
}
```

Any same-origin (or cross-origin) window can drive the deck with
`window.postMessage({ method: 'next', args: [] }, '*')`. This is how
`plugin/notes/notes.js` (line 33–47) opens a popup, performs a "connect /
connected" handshake, and then mirrors state.

### 5. Speaker notes handshake

```js
// plugin/notes/notes.js:30–48
function connect() {
  var connectInterval = setInterval( function() {
    notesPopup.postMessage( JSON.stringify({
      namespace: 'reveal-notes', type: 'connect',
      url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
      state: Reveal.getState()
    }), '*' );
  }, 500 );
  window.addEventListener( 'message', function( event ) {
    var data = JSON.parse( event.data );
    if( data && data.namespace === 'reveal-notes' && data.type === 'connected' ) {
      clearInterval( connectInterval );
      onConnected();
    }
  });
}
```

Polling-until-ack handshake works across file://, http://, https://, and
sandboxed origins because it's pure postMessage. After ack, the main
window forwards `slidechanged`, `fragmentshown/hidden`, `overviewshown/hidden`,
`paused`, `resumed` to the popup.

### 6. Multiplex — server as dumb broadcast relay

```js
// plugin/multiplex/index.js:18–26
io.on( 'connection', function( socket ) {
  socket.on('multiplex-statechanged', function(data) {
    if (typeof data.secret == 'undefined' || data.secret == null || data.secret === '') return;
    if (createHash(data.secret) === data.socketId) {
      data.secret = null;
      socket.broadcast.emit(data.socketId, data);
    };
  });
});
```

Only the presenter knows the `secret`; the server verifies `createHash(secret)
=== socketId` then re-emits the state on a channel named after the
`socketId`. Subscribers listen for that channel. The server has no
presentation state of its own.

### 7. Scaling with `zoom` fallback

```js
// js/reveal.js:1620–1636
if( scale > 1 && features.zoom ) {
  dom.slides.style.zoom = scale;          // crisp scale-up in WebKit
} else {
  transformSlides({ layout: 'translate(-50%, -50%) scale(' + scale + ')' });
}
```

Worth studying because it preserves text crispness when scaling up while
falling back to CSS transform when scaling down (where `zoom` causes line-
break shifts).

### 8. Fragment ordering algorithm

`sortFragments()` (`js/reveal.js:3533–3578`) groups fragments by
`data-fragment-index`, then appends unindexed ones in DOM order, then
rewrites each element's `data-fragment-index` to a contiguous integer.
The clever bit: it allows several fragments to share an index and reveal
together, while still letting authors mix indexed and unindexed entries
freely.

### 9. Theme system

Each theme in
`/Users/jluterek/code/jluterek/slides/reference-applications/react-slides/css/theme/source/`
(e.g. `black.scss`) is ~50 lines: it imports `template/mixins`, imports
`template/settings`, overrides variables, then imports `template/theme`.
The shared `template/theme.scss` consumes all variables and emits the
output. Authoring a new theme = writing a `@import url(font)` plus a list
of color/font overrides.

### 10. PDF generation by repurposing the live deck

`setupPDF` (`js/reveal.js:547+`) doesn't render a separate static
representation. It injects `@page { size: WxH; margin: 0 }`, applies a
`.print-pdf` class to body, sets explicit dimensions, then lets the browser
print. Multi-page-tall slides get sliced because the JS measures
`getAbsoluteHeight(slide)` and writes appropriate top offsets. The PhantomJS
script in `plugin/print-pdf/` is just `page.open(url+'?print-pdf'); page.render(out)`.

## Strengths to learn from

- **HTML *is* the source format.** No build step required to ship a
  presentation; an author can clone the repo, edit `index.html`, double-
  click `index.html`, and it works. The barrier to entry is "do you know
  HTML?"
- **CSS owns the animation.** The JS layer is a state machine that
  toggles 3 class names (`past`/`present`/`future`) and a handful of
  data attributes. All visual choreography is declarative in `reveal.scss`
  and is straightforwardly extensible by adding a new mixin invocation.
- **Plugins are convention, not API.** A plugin is just a script that
  reads `Reveal.getConfig()`, calls `Reveal.addEventListener(...)`, and
  optionally exposes a global. There's no registration call; the
  `dependencies` array just guarantees load order. The
  `condition`/`async`/`callback` triple on each dependency entry is a
  tiny, expressive contract.
- **postMessage as a universal RPC.** Speaker view, multiplex, and any
  third-party embed get the same API surface. Works across origins,
  iframes, and popup windows.
- **Slide identity persists in the URL.** Deeplinks (`#/2/3`) make decks
  shareable, bookmarkable, and back-button-correct.
- **Accessibility is wired in.** `aria-live` mirrored region, per-fragment
  text announcements, RTL support, fullscreen, pause overlay.
- **Theming via SCSS variable overrides** is one of the lightest theming
  contracts you can have — 10–30 variables and you've authored a theme.
- **Backgrounds as a separate render layer.** Decoupling background DOM
  from slide DOM allows transitioning them independently (and handles
  identical-background de-flicker via the `data-background-hash`).
- **Lazy media via `data-src`.** Out-of-view iframes/videos/images don't
  fetch until they're within `viewDistance`.

## Weaknesses / pain points

- **One 4,700-line IIFE.** Everything — touch, keyboard, fragments,
  backgrounds, overview, PDF, parallax, autoslide playback, postMessage —
  is in one file with closure-private state. Hard to tree-shake, hard
  to unit-test in isolation, hard to swap subsystems. No TypeScript types.
- **No component model.** Slides are HTML strings authored by hand;
  there is no way to express a reusable slide as a value or compose
  decks programmatically without templating outside the framework.
- **No data layer.** All content is static HTML. Anything dynamic
  (live charts, interactive demos) has to be plumbed manually via the
  event bus.
- **2016-vintage toolchain.** Grunt 0.4, node-sass 3.3, Node ~4.1.1,
  `head.js`, `classList.js` polyfill, IE9 shiv. None of this is in use
  in modern build pipelines.
- **Markdown plugin is brittle.** Regex-based slide splitting
  (`^\r?\n---\r?\n$`), inline `<script type="text/template">` workaround
  for `</script>` strings (`SCRIPT_END_PLACEHOLDER` at
  `plugin/markdown/markdown.js:37`), no MDX-style component embedding.
- **PDF export depends on PhantomJS** (long since deprecated). Modern
  reveal.js uses headless Chrome via `decktape`.
- **Multiplex uses Blowfish + socket.io for auth** — fine in 2016, not
  what you'd build today (no real authentication, just a shared secret).
- **No reactive re-render.** If the DOM changes after `initialize()`,
  authors must call `Reveal.sync()` manually. There is no MutationObserver.
- **Global `Reveal` only.** Multiple decks on a page are not really
  supported.
- **Inline-styled demo deck.** The `index.html` in this snapshot is rife
  with `style="font-size: 25px; text-align: left"` per-element. The
  framework offers no helper for slide-local styling beyond raw CSS or
  classes — authors fall back to inline styles.
- **CSS scaling vs. text reflow.** Using `transform: scale(...)` to fit
  preserves layout but blurs text at non-integer scales; the `zoom`
  fallback fixes that but is non-standard and varies across browsers.

## Relevance to our project

For an Astro + TypeScript slides framework with an MCP server, reveal.js
is the canonical reference for **what authors expect from an HTML-based
slide runtime**: a 2-D slide grid, fragment-style reveals, per-slide
transitions and backgrounds, deeplinked URLs, speaker view, PDF export,
keyboard/touch navigation, plugin loading, and a postMessage RPC. The
class-name-based state machine (`past`/`present`/`future` + CSS mixins) is
worth porting almost verbatim because it cleanly separates layout state
from animation. Where reveal.js is weak — no component model, no types,
no module boundaries, no MDX-style content authoring, no observability into
slide content for tooling — is precisely the seam our Astro + MCP design
should exploit: slides as components (with TS types and props), MCP tools
that introspect/manipulate the slide tree, and a build step that emits
both interactive HTML and PDF without PhantomJS. Treat `js/reveal.js` and
`css/reveal.scss` as the spec of the "minimum viable presentation runtime";
treat the plugin folder as a feature checklist (markdown, highlight, math,
speaker notes, multiplex, search, zoom, PDF export) we either re-implement
or replace with modern equivalents (Shiki, KaTeX, headless Chrome, WebRTC
or LiveKit for multiplex). Note that this specific copy is just a 2016
checkout used to author a React/Redux deck — there is nothing unique to
this fork vs. upstream `hakimel/reveal.js@3.3.0`; for any feature questions,
consult the official repo's current release rather than this snapshot.
