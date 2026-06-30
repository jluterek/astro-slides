# impress.js

## Summary

**impress.js** is a presentation framework that lays out slides ("steps") as elements on an effectively-infinite 3D canvas, then animates a virtual camera between them using CSS3 `transform` and `transition` properties. It was created in 2011-2012 by **Bartek Szopka** (`@bartaz`) and has been maintained since 2016 by **Henrik Ingo** (`@henrikingo`) with 70+ contributors. The current version is **2.0.0** (see `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/impress.js` line 16) but `package.json` still reports `1.1.0`. The project is still maintained (recent commits, contributions, README references 2023 copyright) but not aggressively evolving; it sits in a comfortable "feature-complete-but-active" niche.

The stack is **vanilla JavaScript** with no runtime dependencies — not even jQuery (see `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/README.md` line 122). All build dependencies (`terser`, `karma`, `qunit`, `jshint`, `jscs`, `eslint`, `puppeteer`) live in `devDependencies` only; the distributable `js/impress.js` is a plain `cat`-concatenation of the core file and all default plugins (see `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/build.js`).

The philosophy is uncompromising: **the author writes raw HTML and CSS**. There is no templating, no theming, no Markdown helper, no JSON config. Each slide is a `<div class="step">` annotated with `data-x`, `data-y`, `data-z`, `data-rotate-x/y/z`, and `data-scale`. The `index.html` author comments (lines 49-62, 437-454) repeatedly warn the reader that the framework is empty without good design and a thought-out layout drawn on paper first. The marketing tagline appears in the README: *"impress.js may not help you if you have nothing interesting to say ;)"* (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/README.md` line 11).

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | HTML with `data-*` attributes (no templating, no Markdown by default) |
| Runtime stack | Vanilla JS (no runtime deps; `<script src="impress.js">` + `impress().init()`) |
| Rendering approach | A single "canvas" `<div>` inside `#impress` that is translated/rotated/scaled with CSS 3D transforms; each step has its own pre-applied transform |
| Coordinate model | Absolute pixel positions on an infinite 3D plane; centers of steps land at `(data-x, data-y, data-z)` |
| Camera | The inverse transform of the active step is applied to the canvas; CSS `transition` handles tweening |
| Plugin model | File-concatenated, event-bus-driven; pre-init, pre-stepleave, init, GUI categories |
| Browser requirements | CSS 3D transforms, CSS transitions, `dataset`, `classList` (see `README.md` 126-131) |
| Status | Active maintenance (2016-2023 by @henrikingo); core API stable since v1 |
| License | MIT (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/LICENSE`) |
| Latest version | 2.0.0 in source; package.json reports 1.1.0 |

## Architecture

### The two-element camera

When `impress().init()` runs (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/impress.js` lines 341-406), it builds the following DOM topology:

```
<body class="impress-enabled impress-on-{activeStepId}">
  <div id="impress" style="top:50%; left:50%; transform:scale(<windowScale>)">
    <div class="canvas" style="transform: rotate(...) translate(...)">
      <div class="step active present" style="transform: translate(-50%,-50%) translate3d(x,y,z) rotateX(...) rotateY(...) rotateZ(...) scale(s)">...</div>
      <div class="step future" ...>...</div>
      ...
    </div>
  </div>
</body>
```

The init function reparents every child of `#impress` into a freshly created `canvas` `<div>` (lines 360-363) so the root and the canvas can be animated **separately and on staggered delays**.

- **`#impress` (root)** — anchored at `top:50%; left:50%;`, its job is to hold the global `scale()` and the `perspective` value. It is the camera's zoom dial.
- **`canvas`** — handles `translate3d()` and `rotateX/Y/Z()`. It is the camera's pan and rotate.
- **Each `.step`** — pre-positioned once at init time via a transform of the form `translate(-50%, -50%) translate3d(x,y,z) rotate*(...) scale(s)`. Steps never move after init — only the camera does.

### The inverse-transform camera math

The key insight is at `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/impress.js` lines 494-507:

```js
var target = {
    rotate:    { x: -step.rotate.x, y: -step.rotate.y, z: -step.rotate.z, order: step.rotate.order },
    translate: { x: -step.translate.x, y: -step.translate.y, z: -step.translate.z },
    scale:     1 / step.scale
};
```

To "show" a step, impress.js applies the **negated translation, negated rotation, and reciprocal scale** to the canvas/root. The step itself is sitting at `(data-x, data-y, data-z)` rotated by `(rx, ry, rz)` and scaled by `s`; pushing the camera the opposite way lands it visually centered.

### Zoom-in vs zoom-out timing

A subtle but important detail (lines 509-557): when zooming **in** (target scale ≥ current), impress animates the **translate + rotate first** and delays the scale by half the duration. When zooming **out**, it does the scale first and delays the translate/rotate. This makes Prezi-style "pull back, fly to new position, zoom in" feel natural rather than mechanical:

```js
var zoomin = target.scale >= currentState.scale;
var delay = duration / 2;
css(root,   { transform: scale(targetScale),                       transitionDelay: (zoomin ? delay : 0) + "ms" });
css(canvas, { transform: rotate(target.rotate, true) + translate(target.translate), transitionDelay: (zoomin ? 0 : delay) + "ms" });
```

The `revert` flag in the `rotate()` helper (lines 105-117) reverses the axis order when going from step → canvas, because `transform` is applied right-to-left.

### Window scaling

`computeWindowScale()` (lines 126-140) computes a scale factor that fits the authored `data-width × data-height` (default `1920 × 1080`) into the browser window, then bounds it by `data-min-scale` / `data-max-scale`. This factor multiplies the camera scale, and is recomputed on every window resize via the `resize` plugin.

### The "step" object — what gets parsed out of the HTML

`initStep()` (lines 281-316) reads every `.step` element's `data-*` attributes into:

```js
{
    translate: { x, y, z },                   // pixels on infinite canvas
    rotate:    { x, y, z, order: "xyz" },     // degrees, around each axis
    scale:     1,                              // multiplier
    transitionDuration: 1000,                 // ms, can be per-step
    el: <the HTMLElement>
}
```

…and immediately stamps the corresponding CSS `transform` onto the element. Steps without an `id` get auto-named `step-1`, `step-2`, ….

### Lifecycle classes

Every step is in one of three states, attached as a CSS class (lines 755-771):

- `.future` — not yet visited
- `.present` — currently active
- `.past` — visited but no longer active

In addition the currently-active step gets `.active`, and the `<body>` gets `impress-on-{stepId}` so author CSS can target "what is currently on screen" from the top of the cascade.

### Event bus

The core emits four DOM events on the root element (`#impress`), all bubbling `CustomEvent`s built via `lib.util.triggerEvent` (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/lib/util.js` lines 106-110):

| Event | When | `event.detail` |
| --- | --- | --- |
| `impress:init` | After `init()` completes | `{ api }` (same object as `impress()` returns) |
| `impress:stepenter` | After a transition finishes and a new step is centered | (step element is `event.target`) |
| `impress:stepleave` | Right when transition begins | `{ next, transitionDuration, reason }` plus optional `origEvent` |
| `impress:steprefresh` | Every `goto()` call, including same-step redraws (e.g. after resize) | (step element is `event.target`) |

Plugins listen for `impress:init` to wire themselves up, and use the API object handed to them via `event.detail.api`. They can also register themselves for two synchronous hook phases via the `impress` global:

- `impress.addPreInitPlugin(fn, weight)` — fires inside `init()` *before* impress parses anything (used by `rel` to rewrite `data-x/y/z` from `data-rel-x/y/z`).
- `impress.addPreStepLeavePlugin(fn, weight)` — fires at the top of `goto()`. Plugin may mutate `event.detail.next` / `event.detail.transitionDuration` or **return `false` to abort the transition**.

`weight` (default 10) orders plugins; lower runs first.

### The `lib` object (libraries vs plugins)

Plugins talk to each other via events. Libraries (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/lib/`) are different: they're synchronous helpers attached to `api.lib`:

- `lib.util` — `$`, `$$`, `byId`, `arrayify`, `toNumber`, `toNumberAdvanced` (handles `5w`/`5h` viewport-relative units), `triggerEvent`, `getUrlParamValue`, `throttle`, `getElementFromHash`.
- `lib.gc` — a teardown registry. Plugins push DOM elements, event listeners, and arbitrary callbacks; `tear()` rewinds them so `init()` can be called again with a different presentation.
- `lib.rotation` — quaternion and vector math for the `rel` plugin's relative-rotation feature (added 2021).

Libraries register themselves at load time via `impress.addLibraryFactory({ name: factory })`.

## Authoring format

The canonical example is `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/index.html`. The whole API is HTML; no JS configuration object exists. Excerpts with annotations:

**Root element** (lines 158-167):

```html
<div id="impress"
    data-transition-duration="1000"  <!-- default ms between steps -->
    data-width="1024"                  <!-- author's logical canvas, used for scaling -->
    data-height="768"
    data-max-scale="3"                 <!-- clamp on window-fit zoom -->
    data-min-scale="0"
    data-perspective="1000"            <!-- CSS perspective in px; 0 = flatten 3D -->
    data-autoplay="7">                 <!-- autoplay plugin; seconds per step -->
```

**A basic step** (lines 189-191):

```html
<div id="bored" class="step slide" data-x="-1000" data-y="-1500" data-autoplay="10">
    <q>Aren't you just <b>bored</b> with all those slides-based presentations?</q>
</div>
```

The `id` is optional (becomes `step-N`) and shows up in the URL hash as `#/bored` after the step is entered. `data-autoplay` overrides the root's default for this slide.

**A scaled "title" step** (lines 226-230):

```html
<div id="title" class="step" data-x="0" data-y="0" data-scale="4">
    <span class="try">then you should try</span>
    <h1>impress.js<sup>*</sup></h1>
</div>
```

`data-scale="4"` means the element is 4× larger; the camera consequently zooms out 4× to land on it, making it feel like the camera flew toward something big.

**A 2D-rotated step** (line 240):

```html
<div id="its" class="step" data-x="850" data-y="3000" data-rotate="90" data-scale="5">
```

`data-rotate` is an alias for `data-rotate-z`.

**A 3D step pushed back along Z** (line 259):

```html
<div id="tiny" class="step" data-x="2825" data-y="2325" data-z="-3000" data-rotate="300" data-scale="1">
```

`data-z="-3000"` puts the step 3000 px "into" the screen.

**A fully 3D-rotated step** (line 316):

```html
<div id="its-in-3d" class="step" data-x="6200" data-y="4300" data-z="-100"
     data-rotate-x="-40" data-rotate-y="10" data-scale="2">
```

Rotation order can be changed with `data-rotate-order="zxy"` etc., because each rotation is relative to the step's then-current pose (see `DOCUMENTATION.md` lines 170-174 and `examples/3D-rotations/index.html`).

**The "overview" step** (line 336):

```html
<div id="overview" class="step" data-x="3000" data-y="1500" data-z="0" data-scale="10">
</div>
```

An empty step with a huge `data-scale` becomes the "zoom out to see everything" view. Pressing it (or clicking it from the toolbar) makes the camera pull back enough to frame the whole deck. This is a pattern, not a built-in feature — there is no dedicated overview plugin, just convention.

**Relative positioning via the `rel` plugin** (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/plugins/rel/rel.js` line 13):

```html
<div class="step" data-rel-x="1000" data-rel-y="500">
```

…means "1000 px to the right and 500 px down from the previous step". Values are also expressible relative to viewport: `data-rel-x="1.5w"` (1.5 × authored width), `data-rel-y="1.5h"`. `data-rel-to="some-id"` anchors to an arbitrary earlier step instead of the immediately preceding one. `data-rel-position="relative"` makes the offset apply in the previous step's *rotated* frame, which is what `lib.rotation` is for.

**Substeps** (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/plugins/substep/README.md`):

```html
<div class="step">
    <h1>Fruits</h1>
    <p class="substep">Orange</p>
    <p class="substep" data-substep-order="1">Apple</p>
</div>
```

Sub-elements with `.substep` get revealed one at a time on `next()` (the plugin intercepts the pre-stepleave event and adds `.substep-visible` to the next hidden one). `data-substep-order` overrides document order.

**Speaker notes** (impressConsole plugin):

```html
<div class="step">
    Visible content
    <div class="notes">Notes shown only in speaker console (P key).</div>
</div>
```

CSS hides `.notes { display: none }` in the main view.

**Skip / stop** (`skip` and `stop` plugins):

```html
<div class="step skip">       <!-- skipped by next()/prev(), but reachable by goto() -->
<div class="step stop">        <!-- next() will not advance past this one (e.g. last slide) -->
```

**Non-linear navigation via `goto`** (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/plugins/goto/goto.js`):

```html
<div class="step" data-goto="step-5">                          <!-- always jump to step-5 -->
<div class="step" data-goto-next="step-5" data-goto-prev="step-1">
<div class="step"
     data-goto-key-list="ArrowUp ArrowDown ArrowRight ArrowLeft"
     data-goto-next-list="step-4 step-3 step-2 step-5">         <!-- per-key destinations -->
```

The cube example (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/examples/cube/index.html`) uses this to make a 6-faced cube where each arrow key picks the appropriate adjacent face.

## Plugin catalog

All paths below are under `/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/`. Built into `js/impress.js` in this order (see `build.js`):

| Plugin | File | Type | What it does | Key events / API |
| --- | --- | --- | --- | --- |
| `autoplay` | `src/plugins/autoplay/autoplay.js` | init + toolbar | Auto-advances slides after `data-autoplay="N"` seconds. URL param `?impress-autoplay=N`. Adds play/pause button to toolbar. | Listens: `impress:stepenter`, `impress:substep:enter`, `impress:autoplay:play`, `impress:autoplay:pause`. |
| `blackout` | `src/plugins/blackout/blackout.js` | init | Press `B` or `.` to hide the canvas (presentation goes dark); press again to restore. Auto-restores on `stepleave`. | Listens: `keydown`, `impress:stepleave`. Emits: `impress:autoplay:pause` while black. |
| `bookmark` | `src/plugins/bookmark/bookmark.js` | init | `data-bookmark-key-list="1 2 a"` on a step makes those hotkeys jump to it directly. Counterpart to `goto`'s "out-link" style. | Listens: `keypress`. Uses `api.goto`. |
| `extras` | `src/plugins/extras/extras.js` | init | Initializes optional sibling extras (mermaid, MathJax, highlight.js, Markdown) if their `<script>` tags are present. No-op otherwise. | Probes globals like `mermaid`, `MathJax`. |
| `form` | `src/plugins/form/form.js` | init | `stopPropagation` on input elements so typing into a form field doesn't trigger navigation hotkeys; defocuses on stepleave. | Listens: `keydown` (capture), `impress:stepleave`. |
| `fullscreen` | `src/plugins/fullscreen/fullscreen.js` | init | F5 enters native browser fullscreen. (Esc exits as normal.) | Listens: `keydown`. |
| `goto` | `src/plugins/goto/goto.js` | pre-stepleave | Reads `data-goto`, `data-goto-next`, `data-goto-prev`, `data-goto-key-list` + `data-goto-next-list`. Rewrites `event.detail.next` to redirect transitions. | Hook: `addPreStepLeavePlugin`. |
| `help` | `src/plugins/help/help.js` | init + GUI | Shows a help overlay (auto-shown briefly on first load; toggled with `H`). Other plugins register hotkey rows via `impress:help:add`. | Custom event `impress:help:add`. |
| `impressConsole` | `src/plugins/impressConsole/impressConsole.js` | init + GUI | Pressing `P` opens a separate speaker window with current slide, next-slide preview, notes, and elapsed time. Bundles a wholly separate impressConsole.js library. | New window via `window.open`. |
| `media` | `src/plugins/media/media.js` | init | `data-media-autoplay/autostop/autopause` for `<audio>`/`<video>` inside steps. Adds body classes `impress-media-video-playing` etc. | Listens: `impress:stepenter`, `impress:stepleave`, media `play`/`pause`/`ended`. |
| `mobile` | `src/plugins/mobile/mobile.js` | init | Detects mobile OS, adds `body.impress-mobile`, and marks adjacent steps with `.prev` / `.next` so authors can hide far-away steps for performance. | Listens: `impress:stepenter`. |
| `mouse-timeout` | `src/plugins/mouse-timeout/mouse-timeout.js` | init | Adds `body.impress-mouse-timeout` after 3 s of mouse inactivity; removes on movement. Pairs with CSS like `body.impress-mouse-timeout { cursor: none }`. | Listens: `mousemove`, `click`, `touchstart`. |
| `navigation` | `src/plugins/navigation/navigation.js` | init | Keyboard navigation: arrows, space, PgUp/PgDn, Tab. Also click handlers for `<a href="#step-id">` and clicking a non-active step. | Listens: `keydown`, `keyup`, `click`. Emits: `impress:help:add`. |
| `navigation-ui` | `src/plugins/navigation-ui/navigation-ui.js` | GUI | Back/forward buttons and a dropdown of step IDs/titles, added to toolbar if it exists. | Uses `impress:toolbar:appendChild`. |
| `progress` | `src/plugins/progress/progress.js` | GUI | Optional `<div class="impress-progressbar"><div></div></div>` gets its inner width updated as the deck advances. Optional `<div class="impress-progress">` shows `N/total`. | Listens: `impress:stepleave`, `impress:steprefresh`. |
| `rel` | `src/plugins/rel/rel.js` | pre-init | Relative positioning: `data-rel-x/y/z`, `data-rel-rotate-x/y/z`, `data-rel-position`, `data-rel-to`, `data-rel-reset`. Walks steps in document order, computes absolute `data-x/y/z` from previous step. Inherits if not set. | Hook: `addPreInitPlugin`. |
| `resize` | `src/plugins/resize/resize.js` | init | Throttled (250 ms) window `resize` handler that calls `goto(activeStep, 500)` to recompute window scale. | Listens: window `resize`. |
| `skip` | `src/plugins/skip/skip.js` | pre-stepleave (weight 1) | `<div class="step skip">` is skipped by `next()`/`prev()` but still reachable via `goto()`. Recursive — handles consecutive skips. | Hook: `addPreStepLeavePlugin`. |
| `stop` | `src/plugins/stop/stop.js` | pre-stepleave (weight 2) | `<div class="step stop">` blocks `next()` from advancing past this step (returns `false` from hook). | Hook: `addPreStepLeavePlugin`. |
| `substep` | `src/plugins/substep/substep.js` | pre-stepleave | Reveals `.substep` elements one at a time on `next()`, hides on `prev()`. Adds `.substep-visible` / `.substep-active`. | Emits: `impress:substep:enter`, `impress:substep:leave`, `impress:substep:stepleaveaborted`. |
| `toolbar` | `src/plugins/toolbar/toolbar.js` | GUI | Provides the `<div id="impress-toolbar">` host. Other plugins inject widgets via `impress:toolbar:appendChild` / `impress:toolbar:insertBefore` (grouped by integer group id). | Custom events as above. |
| `touch` | `src/plugins/touch/touch.js` | init | Swipe left/right on touch devices. Uses `api.swipe(pct)` for live drag preview, then `next()`/`prev()` on `touchend` if threshold crossed. | Listens: `touchstart`, `touchmove`, `touchend`, `touchcancel`. |

There's also `extras/` as a Git submodule (currently empty in this checkout — `git submodule update` populates it with `markdown`, `mermaid`, `mathjax`, `highlight.js`, etc.), wired up by the `extras` plugin if present.

## Features (catalog)

- **3D positioning model.** Each `.step` has `data-x`, `data-y`, `data-z` placing the step's *center* in a global pixel-coordinate canvas. `data-rotate-x/y/z` rotates the step around its center; `data-rotate-order` controls multiplication order. `data-scale` lets a step claim more or less canvas real estate.
- **Camera transitions** are CSS `transition` on `transform`/`perspective`. Default duration 1000 ms (`data-transition-duration` overridable globally or per step). Zoom-in and zoom-out interpolate scale on opposite timing halves to feel less robotic.
- **Step API** — `impress()` returns `{ init, goto, next, prev, swipe, tear, lib }`. `goto()` accepts a step index, step id, or DOM element, and an optional duration.
- **Substeps** — within-step incremental reveals via the `substep` plugin (works like PowerPoint bullet animations).
- **Overview / zoom-out** — there is no built-in plugin, but the convention is an empty `.step#overview` with a large `data-scale`. Linking to it from anywhere "pulls the camera back" to frame the deck.
- **Touch / swipe** — `touch` plugin maps horizontal swipes to `prev/next`, with a live preview via `api.swipe(pct)` that linearly interpolates the canvas transform during the drag.
- **Mouse / autoplay** — `autoplay` advances on a timer; `mouse-timeout` adds a class after idle so CSS can hide cursor/toolbar.
- **Toolbar** — `toolbar` is just a host element; other plugins inject buttons by dispatching `impress:toolbar:appendChild` events, grouped into `<span>` containers.
- **Navigation UI** — `navigation-ui` adds back/forward + step dropdown to the toolbar.
- **Skip slides** — `class="step skip"` hides a slide from sequential navigation while keeping it `goto`-able (good for hidden detail slides linked from another step).
- **Auto-loop** — default behavior: `next()` from the last step wraps to the first; `stop` plugin opts a slide out of this.
- **Stop on blur** — there's no explicit blur handler, but the `blackout` plugin dispatches `impress:autoplay:pause` so combining `B` with autoplay halts both.
- **Help overlay** — `H` shows a list of hotkeys; plugins register their own rows via `impress:help:add`.
- **Speaker console** — separate window via `impressConsole`, with notes, next-slide preview, and timer.
- **Relative positioning** — `rel` plugin lets steps inherit / offset from the previous one (or any earlier one via `data-rel-to`), so reordering doesn't break positions. Also supports relative rotation via quaternion math.
- **Markdown / Mermaid / MathJax / Highlight.js** — only via the optional `extras/` submodule and the `extras` plugin; not first-class.
- **Hash-based deep links** — every `stepenter` updates `location.hash` to `#/stepId`; loading a URL with `#stepId` or `#/stepId` jumps directly to that step.
- **Multiple presentation instances** — `impress("other-root-id")` lets you initialize more than one root on the same page (rare but supported).
- **`tear()`** — fully reverses init: removes injected DOM, restores `data-*` to pre-`rel` values, removes listeners, clears `gc` callbacks. Useful for dynamic deck swapping.

## Notable libraries & dependencies

**Runtime:** none. impress.js works with `<script src="impress.js"></script>` and zero other JavaScript. It generates the CSS it needs at runtime via the prefix-aware `css()` helper (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/src/impress.js` lines 84-95). The CSS files in `css/` are purely demo styles.

**Build-time only** (`package.json` lines 31-45):

- `terser` — minifier for `impress.min.js`
- `ls` — used by `build.js` to enumerate `examples/`
- `jshint`, `jscs`, `eslint` — linting
- `karma`, `karma-chrome-launcher`, `karma-firefox-launcher`, `karma-qunit`, `qunit`, `qunit-assert-close` — tests
- `puppeteer` — headless browser for tests
- `syn` — synthetic input library for QUnit

The build script (`/Users/jluterek/code/jluterek/slides/reference-applications/impress.js/build.js`) concatenates: core `src/impress.js` → `src/lib/{gc,util,rotation}.js` → every default plugin's main file → `js/impress.js`. Then it terser-minifies to `js/impress.min.js`. Build artifacts plus auto-generated `examples/index.html`.

## Code patterns worth studying

### 1. Step initialization & coordinate system

`initStep` (lines 281-316 of `src/impress.js`) is the entire authoring-to-DOM pipeline:

```js
var initStep = function( el, idx ) {
    var data = el.dataset,
        step = {
            translate: {
                x: lib.util.toNumberAdvanced( data.x ),  // supports 5w/5h units
                y: lib.util.toNumberAdvanced( data.y ),
                z: lib.util.toNumberAdvanced( data.z )
            },
            rotate: {
                x: lib.util.toNumber( data.rotateX ),
                y: lib.util.toNumber( data.rotateY ),
                z: lib.util.toNumber( data.rotateZ || data.rotate ),  // alias
                order: validateOrder( data.rotateOrder )
            },
            scale: lib.util.toNumber( data.scale, 1 ),
            transitionDuration: lib.util.toNumber(
                data.transitionDuration, config.transitionDuration ),
            el: el
        };
    if ( !el.id ) { el.id = "step-" + ( idx + 1 ); }
    stepsData[ "impress-" + el.id ] = step;
    css( el, {
        position: "absolute",
        transform: "translate(-50%,-50%)" +     // center the element on its data-x/y
                   translate( step.translate ) +
                   rotate( step.rotate ) +
                   scale( step.scale ),
        transformStyle: "preserve-3d"
    } );
};
```

Note that `initAllSteps` (lines 320-323) is called *every time* `goto()` is invoked (line 440), not just at init. That lets authors mutate `data-*` attributes at runtime and have changes pick up on the next transition.

### 2. Camera matrix composition

The full transition (lines 541-557 of `src/impress.js`):

```js
css( root, {
    perspective:        ( config.perspective / targetScale ) + "px",
    transform:          scale( targetScale ),
    transitionDuration: duration + "ms",
    transitionDelay:    ( zoomin ? delay : 0 ) + "ms"
} );
css( canvas, {
    transform:          rotate( target.rotate, true ) + translate( target.translate ),
    transitionDuration: duration + "ms",
    transitionDelay:    ( zoomin ? 0 : delay ) + "ms"
} );
```

The `perspective / targetScale` trick (line 547) keeps depth foreshortening visually consistent as the camera zooms — without it, scaling would also visually change the strength of the 3D effect.

### 3. Plugin registration & event bus

Core registers two synchronous hook arrays (lines 859-916 of `src/impress.js`):

```js
impress.addPreInitPlugin = function( plugin, weight ) {
    weight = parseInt( weight ) || 10;
    if ( preInitPlugins[ weight ] === undefined ) { preInitPlugins[ weight ] = []; }
    preInitPlugins[ weight ].push( plugin );
};

var execPreStepLeavePlugins = function( event ) {
    for ( var i = 0; i < preStepLeavePlugins.length; i++ ) {
        var thisLevel = preStepLeavePlugins[ i ];
        if ( thisLevel !== undefined ) {
            for ( var j = 0; j < thisLevel.length; j++ ) {
                if ( thisLevel[ j ]( event ) === false ) {
                    return false;   // any plugin can abort the whole transition
                }
            }
        }
    }
};
```

Everything else is decoupled via `CustomEvent`s on the root element. Plugins typically look like:

```js
document.addEventListener( "impress:init", function( event ) {
    var api = event.detail.api;
    var gc  = api.lib.gc;
    gc.addEventListener( document, "keyup", function( e ) { ... } );  // auto-cleaned by tear()
});
```

The `gc` library (`src/lib/gc.js`) is a clever lightweight teardown harness: every plugin that mutates the DOM or installs listeners must do so through `gc.addEventListener`, `gc.appendChild`, or register a callback via `gc.pushCallback`, so `impress().tear()` can fully reverse everything in LIFO order.

### 4. Substep handling via pre-stepleave abort

`substep.js` (lines 25-60) shows how a plugin uses the pre-stepleave hook to *consume* a `next()` call:

```js
var substep = function( event ) {
    if ( event.detail.reason === "next" ) {
        el = showSubstepIfAny( step );
        if ( el ) {
            triggerEvent( step, "impress:substep:enter", { reason: "next", substep: el } );
            return false;   // abort: pretend the step transition didn't happen
        }
    }
    if ( event.detail.reason === "prev" ) {
        el = hideSubstepIfAny( step );
        if ( el ) { return false; }
    }
};
impress.addPreStepLeavePlugin( substep );
```

### 5. Swipe interpolation (touch)

`src/impress.js` lines 656-731 expose `api.swipe(pct)` which linearly interpolates the canvas transform between the current and next step's pose without committing the transition. This is what lets the `touch` plugin do the "rubber band" effect during a finger drag:

```js
var interpolatedStep = {
    translate: {
        x: interpolate( currentState.translate.x, -nextStep.translate.x, k ),
        y: interpolate( currentState.translate.y, -nextStep.translate.y, k ),
        z: interpolate( currentState.translate.z, -nextStep.translate.z, k )
    },
    rotate: {
        x: interpolate( currentState.rotate.x, -nextStep.rotate.x, k ),
        y: interpolate( currentState.rotate.y, -nextStep.rotate.y, k ),
        z: interpolate( currentState.rotate.z, -nextStep.rotate.z, k ),
        order: k < 0.7 ? currentState.rotate.order : nextStep.rotate.order
    },
    scale: interpolate( currentState.scale * windowScale, nextScale, k )
};
css( root,   { transform: scale( interpolatedStep.scale ), transitionDuration: "0ms", ... });
css( canvas, { transform: rotate(...) + translate(...),    transitionDuration: "0ms", ... });
```

Note the `order: k < 0.7 ? ... : ...` line and its comment ("Unfortunately there's a discontinuity if rotation order changes. Nothing I can do about it?"). Euler-angle interpolation when the axis order changes is genuinely hard; the quaternion path used by `lib/rotation.js` is the modern fix, used for relative-rotation composition.

### 6. Relative positioning (`rel` plugin)

The pre-init `rel` plugin walks `.step` elements in document order, reads `data-rel-*` and the previous step's pose, and *rewrites the DOM `data-x/y/z` attributes* before the core's `initStep` ever sees them. This means the absolute coordinate model is unchanged — `rel` is a pure source-transformation. See `src/plugins/rel/rel.js` lines 234-281.

For `data-rel-position="relative"`, it uses `lib.rotation.translateRelative` to rotate the (relX, relY, relZ) offset by the previous step's rotation matrix (via quaternion composition) so "1000 px to the right" means "to the right *in the previous step's local frame*" — letting you build curved paths and cube-like layouts (`examples/cube/`).

### 7. Overview mode (no built-in)

There's no dedicated "overview" plugin. The pattern is:

```html
<div id="overview" class="step" data-x="3000" data-y="1500" data-z="0" data-scale="10"></div>
```

…plus CSS that targets `body.impress-on-overview .step { cursor: pointer; opacity: 1 }`. The `data-scale="10"` makes the camera zoom out 10× when this step is selected, framing the whole deck. The `navigation` plugin's click handler turns any other step the user clicks while on overview into a `goto()` target.

## Strengths to learn from

- **Surgically small core.** `src/impress.js` is ~900 lines including comments. It does one thing — translate `data-*` attributes into CSS transforms on a canvas — and delegates everything else.
- **Two-element split for camera math.** Animating `scale` on `root` and `translate+rotate` on `canvas` with staggered delays is a beautiful idea that makes zoom-in vs zoom-out *feel* different without writing a single physics line.
- **HTML attributes as the source of truth.** No build step is needed for the author. Editing the deck is just editing HTML — you can reorder slides by reordering `<div>`s.
- **Plugin model as concatenation.** No async loading, no module system, no bundler. Every plugin is an IIFE that registers on `impress:init`. The build is literally `cat`. This is genuinely elegant for a small surface area.
- **Garbage-collection harness.** `lib.gc` lets the whole framework be torn down and re-initialized cleanly, even with many plugins. We should steal this pattern for our framework.
- **Pre-init filter plugins.** The `rel` plugin pattern (rewrite source attributes *before* the core parses them) is a great place for syntactic sugar — relative positions, named anchors, layout helpers — without changing the core.
- **Two clear plugin hooks.** `addPreInitPlugin` (filter the DOM) and `addPreStepLeavePlugin` (filter/abort transitions). That's almost everything a presentation framework needs.
- **`return false` to cancel transitions.** Clean composability — `substep` aborts to "absorb" a click; `stop` aborts at the end; `goto` rewrites the destination.
- **Hash-based deep links automatic.** Every `stepenter` writes `#/stepId`. Free shareable URLs to any slide.
- **Hint mode for help / mouse-timeout / blackout / fullscreen / autoplay.** Standard presenter ergonomics, well-isolated as plugins.

## Weaknesses / pain points

- **HTML-only authoring is brutal at scale.** No Markdown helper, no templating, no themes (the README and `index.html` headers tell you outright to "design and build it by hand"). Five-slide decks are fun, fifty-slide decks are not.
- **No theme system.** Author writes all CSS. `css/impress-demo.css` is 500+ lines of one-off styles per `id`. The framework provides no semantic classes for headings, lists, code, etc.
- **No layout helpers.** Authors hand-tune `data-x`/`data-y` in pixels. The `rel` plugin helps but doesn't get you to "title slide", "two columns", "image left, text right".
- **Coordinate-by-pixel is fragile.** Move one slide and dozens of `data-*` values need updating, unless you used `rel` consistently from the start.
- **No code-syntax-highlighting / Mermaid / Math support by default.** All require the optional `extras/` submodule and `<script>` tags. No defaults.
- **Vanilla JS, ES5 idioms.** `var`, IIFE pattern, manual prefix probing (`Webkit Moz O ms Khtml`), `for...in` over arrays. No TypeScript, no JSDoc types, no module system. Hard to integrate cleanly into a modern toolchain.
- **No accessibility story.** Steps with `display: none` (via `.future`) hide them from screen readers; there's no `aria-live` for active step; no focus management beyond defocusing forms on stepleave.
- **3D transforms are a perf hazard on low-end hardware.** The `mobile` plugin papers over this by hiding all but adjacent slides; it doesn't actually solve the problem.
- **No notion of slide assets / images / fonts.** Author is on their own for fonts (Google Fonts in `index.html`), images, video, etc.
- **Auto-loop is on by default and not configurable.** Have to add `class="stop"` to opt out at the last slide.
- **Test setup is dated** (QUnit + karma + jshint + jscs). Not a runtime concern, but a sign of project age.
- **Documentation is fragmented** — `README.md`, `GettingStarted.md`, `DOCUMENTATION.md`, plus one `README.md` per plugin. There's no single complete API reference. The HTML comments in `index.html` are still the single best tutorial.
- **No editor / preview tool** built in (Impressionist is a separate sibling project, GUI editor, not actively maintained).

## Relevance to our project

We almost certainly **don't** want full impress-style 3D as the default mode for our Astro/TypeScript framework — the steep authoring cliff (every slide is hand-positioned in pixels), the lack of layouts/themes, and the perf hit are all reasons it stayed niche. But the **camera-on-an-infinite-canvas** model is exactly the math we'd need for a "wow-factor" smart-transition or object-continuity mode: when two consecutive slides share named elements (a logo, a heading, a chart), we can position them in a shared coordinate space and tween between them with the same `translate3d + rotate + scale` composition impress uses on its `canvas`/`root` split. The **inverse-transform camera trick** (apply the negated step transform to the world rather than moving the step) is a clean implementation we should borrow. The **two-element scale-delay split** (zoom-in animates translate first, zoom-out animates scale first) is a nearly-free quality win for any transition system that crosses big size deltas. Finally, the **pre-init / pre-stepleave hook pattern** combined with the **`gc` teardown harness** is a small, well-designed plugin contract that we should mirror — TypeScript-typed, ESM, Astro-integrated — for our own MCP/plugin layer.
