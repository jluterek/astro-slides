# WebSlides

## Summary

WebSlides is a vanilla-JavaScript + SCSS framework for building HTML presentations, landings, portfolios, and longform articles. It was created by **José Luís Antúnez (@jlantunez)** with JavaScript contributions from **@LuisSacristan** and **Antonio Laguna (@Belelros)**, and is licensed MIT. The repo's pitch ("Create stories with Karma") and tagline ("Just essential features. Good karma.") on `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/README.md` make the philosophy clear: a designer-first authoring experience where slides are plain `<section>` elements decorated with semantic utility classes — `wrap`, `bg-apple`, `text-intro`, `card-50`, `flexblock features`, and so on — that produce landing-page quality output without nested wrappers or a heavyweight JS framework. The project's last commit is `9ec4fae 2020-09-05` (a Dependabot bump to `node-sass`), so it is effectively **dormant**; the runtime targets ES2015 via Babel and the build is driven by webpack 3 and node-sass. Version in `package.json` is `1.5.0`. The marketed download (`webslides.tv/webslides-latest.zip`) bundles a compiled `webslides.css` + `webslides.js` plus 120+ demo slides, so end users typically never touch the SCSS source — they just author HTML.

## At a glance

| Aspect | Value |
| --- | --- |
| Maintainer | José Luís Antúnez (`jlantunez@gmail.com`); contributors Luís Sacristán & Antonio Laguna |
| Authoring format | HTML — each `<section>` inside `<article id="webslides">` is a slide, decorated with utility classes |
| Runtime stack | Vanilla JS (ES2015 modules transpiled by Babel), SCSS compiled with node-sass, postcss + autoprefixer |
| Build pipeline | webpack 3 + `extract-text-webpack-plugin` (see `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/webpack.config.js`) |
| Rendering approach | DOM-only. `display:flex` slides at `100vh`; show/hide via `display:none` + class swaps; CSS keyframes for transitions |
| Layout direction | Horizontal by default; vertical with `<article id="webslides" class="vertical">` |
| Status | Dormant — last commit Sept 2020; no presenter mode, no markdown, no speaker notes |
| Version | 1.5.0 (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/package.json`) |
| License | MIT |
| Tests | Jest + simulant, full plugin coverage (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/test/`) |
| Runtime dependencies | None at runtime (only `request` listed, which is a leftover/build-time concern) |

## Architecture

### Deck structure

A WebSlides deck is a single HTML document. The container is `<article id="webslides">`; every direct child `<section>` becomes a slide. The optional `vertical` class on the container switches navigation from horizontal to vertical. There are no wrapper divs around the slide stack and no JSON config — the structure *is* the configuration. From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/README.md` lines 54–66:

```html
<article id="webslides">
    <section>
        <h1>Slide 1</h1>
    </section>
    <section class="bg-black aligncenter">
        <div class="wrap">
            <h1>Slide 2</h1>
        </div>
    </section>
</article>
```

Bootstrapping is a one-liner — `window.ws = new WebSlides();` — placed in a `<script>` block right before `</body>` (see `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/index.html` lines 381–388).

### Module organization

The JS lives under `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/` and is split into three layers:

- **Entry**: `src/js/full.js` — imports the class and the SCSS, attaches `WebSlides` to `window`.
- **Modules** (`src/js/modules/`):
  - `webslides.js` — the main class. Owns state (current slide, vertical mode, options), wires plugins, runs transitions.
  - `slide.js` — a thin wrapper around each `<section>`; owns show/hide, fires lifecycle events.
- **Plugins** (`src/js/plugins/`) — eleven first-party plugins, all instantiated by default: `autoslide`, `clickNav`, `grid`, `hash`, `keyboard`, `nav`, `scroll`, `touch`, `video`, `youtube`, `zoom`. Each is a class taking the `WebSlides` instance as its only constructor argument. The plugin registry (`PLUGINS` const at `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/modules/webslides.js` lines 13–25) is open: third-party plugins register via the static `WebSlides.registerPlugin(key, Ctor)` (lines 471–473).
- **Utils** (`src/js/utils/`): `dom.js` (the only DOM helper — no jQuery), `scroll-to.js` (smooth scroll w/ easing), `easing.js`, `keys.js` (keycode map), `custom-event.js` (CustomEvent polyfill), `mobile-detector.js`.

### Lifecycle

`WebSlides`'s constructor (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/modules/webslides.js` lines 49–134) runs four steps in order:

1. `removeChildren_()` — strips anything inside `#webslides` that is not a `<section>` (text nodes, comments).
2. `grabSlides_()` — wraps each `<section>` in a `Slide` instance and assigns it an `id` (`section-N` if absent).
3. `createPlugins_()` — instantiates every plugin.
4. `initSlides_()` — reads `#slide=N` from the URL hash and jumps to it, otherwise slide 0; fires `ws:init`, sets `<html class="ws-ready">` (this class enables the `overflow:hidden` fullscreen mode — see `_base.scss`).

Two custom events drive everything downstream: `ws:init` (one-shot) and `ws:slide-change` (fires on every navigation with `{slides, currentSlide0, currentSlide}` in `event.detail`). Plugins listen for these instead of polling.

### Slide transitions

There are two transition paths in `webslides.js`:

- **`scrollTransitionToSlide_`** (vertical mode, non-touch): physically scrolls the container with `scrollTo(nextSlide.el.offsetTop, 500, cb)` while toggling `overflow:hidden`/`auto` to suppress momentum. When moving backwards, the next slide is moved to the top of the list and the current scroll position is reset so the animation reads correctly.
- **`transitionToSlide_`** (horizontal, or touch): no scrolling. The next slide is hidden, then `slideInLeft`/`slideInRight` CSS animation is added; on `animationend` the class is removed and `onSlideChange_` runs. For non-touch this is synchronous — the animation runs but `current` swaps immediately.

The trick that makes infinite looping cheap: `Slide.moveAfterLast()` / `moveBeforeFirst()` literally re-orders `<section>` nodes in the DOM so the current slide is always near the visible scroll position. There is no virtual viewport.

## Authoring format

A representative slide from `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/index.html` (lines 100–118):

```html
<section>
  <span class="background" style="background-image:url('https://webslides.tv/static/images/nature.jpg')"></span>
  <!--.wrap = container (width: 90%) -->
  <div class="wrap aligncenter">
    <h1><strong>Create beautiful stories</strong></h1>
    <p class="text-intro">WebSlides makes HTML presentations easy.<br>
      Just the essentials and using lovely CSS.
    </p>
    <p>
      <a href="..." class="button zoomIn" title="Download WebSlides for free">
        WebSlides
      </a>
    </p>
  </div>
</section>
```

A few things to notice about the authoring DNA:

- The `<section>` itself is the slide; no `id`, no data attributes required. (The framework synthesises `id="section-N"` if you omit one.)
- `<span class="background" style="background-image:url(...)">` is the standard pattern for full-bleed background images — an absolutely-positioned span behind the content, *not* a CSS background on the section itself. This lets `.frame`, `.dark`, `.light` overlays compose nicely.
- `.wrap` is the canonical container (90% width at ≥1024px, 100% below). Add `.size-50` to halve it, `.aligncenter` to center text + auto-margin block content.
- Animation classes such as `.zoomIn` are applied directly on elements; the keyframes live in `_animations.scss`.
- Comments stay in the source — the framework removes only text/non-section nodes from the slide container; comments inside a section are inert.

The other major idiom (see lines 142–169 of `index.html`) is `.grid` with `.column` children, optionally `.vertical-align`, for two-up or four-up slide layouts.

## CSS / design system

This is the part of WebSlides worth stealing. The entire stylesheet is composed in `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/full.scss` from ~40 partials, organised by the numbered TOC at the top of that file (Reset → Base → Typography → Header/Nav → Slides → Flexblocks → Promos → Cards → Quotes → Tables → Forms → Longform → Zoom → Print → Colors).

### Design tokens (`src/scss/_vars.scss`)

The palette uses the chir.ag "Name That Color" convention — variables are named after the colour itself, not its role. Names like `$royal-blue`, `$havelock-blue`, `$catskill-white`, `$pickled-bluewood`, `$cardinal`, `$pine-green`, `$purple-heart` make the SCSS readable as a moodboard. Roles are then mapped through a `$bg-colors` SCSS map (lines 29–44):

```scss
$bg-colors: (
  'primary':   $royal-blue,
  'secondary': $havelock-blue,
  'light':     $catskill-white,
  'black':     $cod-gray,
  'black-blue':$big-stone,
  'blue':      $rhino,
  'brown':     $gray-brown,
  'gray':      $mischka,
  'green':     $pine-green,
  'purple':    $purple-heart,
  'red':       $cardinal,
  'white':     $white,
  'facebook':  $facebook
);
```

`_color.scss` then loops the map to mint every `.bg-NAME` utility:

```scss
@each $name, $color in $bg-colors {
  .bg-#{$name} { background-color: $color; }
}
```

This is the key generator pattern — one map, one loop, one CSS class per palette entry. The same file also defines manually-curated gradients: `.bg-gradient-h`, `.bg-gradient-v`, `.bg-gradient-r`, `.bg-gradient-white`, `.bg-gradient-gray`, plus the iconic `.bg-apple` (`linear-gradient(to bottom, #000 0%, #1a2028 50%, #293845 100%)`). Transparent overlays come in `.bg-trans-dark`, `.bg-trans-light`, `.bg-trans-gradient` (a bottom-to-top dark gradient for cover text).

A separate `$social-nav` map drives social-link hover colours by brand.

### Vertical rhythm

Baseline: **8px = 0.8rem**. The root font-size is set with the classic 62.5% trick (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_typography.scss` line 17) so every rem value reads as `Npx ÷ 10`. Paragraph line-height is `3.2rem` (32 px = 4 baselines); section padding tops/bottoms are `12rem`; standard padding gutter is `2.4rem`. The `Grid` plugin (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/plugins/grid.js`) injects a `.baseline` class toggle keyed to **Enter** that overlays an 8 px PNG so designers can verify the rhythm visually.

### Layout primitives

From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_base.scss` and `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/modules/_slides.scss`:

- **`.wrap`** — the canonical container. `margin: 0 auto`, `width: 90%` at ≥1024px, `width: 100%` below. `z-index: 2` so it floats over `.background` spans.
- **`.size-{80,70,60,50,40,30,20}`** — width modifiers, applied at ≥1024 px only. Designed to be composed with `.wrap`, `figure`, `img`, etc.: `<div class="wrap size-50">`.
- **`.aligncenter`** — `text-align:center` + auto margins. On `img`/`figure` it switches to `display:block` and applies vertical breathing room.
- **`.alignleft` / `.alignright`** — float utilities, intentionally simple.
- **`section`** — every section is `display:flex; flex-direction:column; justify-content:center; min-height:100vh` so vertical centering is automatic. Padding is `2.4rem` mobile, `12rem 2.4rem` at ≥1024 px. `.slide-top` / `.slide-bottom` override `justify-content`.
- **`.fullscreen`** — strips section padding so a card can bleed edge-to-edge.
- **`[class*='content-']`** — content blocks (`.content-left`, `.content-right`, `.content-center`) that take 50% width at ≥768 px and float. The chained-selector `[class*='content-']` is used throughout so any future `.content-foo` automatically inherits behaviour.
- **`.grid` + `.column`** (`src/scss/modules/_grid.scss`) — flexbox 4-up by default; modifier classes `.sm`, `.ms`, `.sms` produce 30/70, 70/30, and 50/50 column splits.
- **`.flexblock`** (`src/scss/modules/_flexblock.scss`) — the workhorse: a `<ul>` whose `<li>` items become auto-fill, equal-height flex children with built-in hover lift (`transform: translateY(-.2rem)`). Variants (one SCSS partial each): `flexblock.features`, `.clients`, `.steps`, `.metrics`, `.specs`, `.reasons`, `.gallery`, `.plans`, `.activity`. The `.blink` modifier turns the whole `<li>` into a hit-area link.

### Background system

`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/modules/_slides-bg.scss` defines the `.background` family. The container is always an absolutely-positioned span (`position:absolute; inset: 0; background-size: cover`) so it sits behind content. Positional modifiers: `.background-top`, `.background-bottom`, `.background-center`, `.background-center-top`, `.background-right-top`, `.background-left-top`, `.background-center-bottom`, `.background-left-bottom`, `.background-right-bottom`, `.background-left`, `.background-right`. Modifier overlays `.dark` and `.light` (lines 84–96) drop opacity so light text remains legible. `.background-video` lets a `<video>` fill the slide. `.background.anim` (lines 110–118) runs an 80-second linear translateY loop — the Matrix-style background trick.

### Typography scale

From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_typography.scss`:

| Selector | Mobile | ≥768 px |
| --- | --- | --- |
| `h1` | 4 rem / 5.6 rem | 5.6 rem / 7.2 rem |
| `h2` | 3.2 / 4.8 | 4.8 / 6.4 |
| `h3` | 2.4 / 4.0 | 4.0 / 5.6 |
| `h4` | 2.2 / 4.0 | 3.2 / 4.8 |
| `h5` | 2.0 / 3.2 | — |
| `h6` | 1.8 / 3.2 | — |

Stack fonts: **Roboto** primary, **Maitree** for `.text-serif`/`h1 span`, **San Francisco** (Apple's display family, loaded via `applesocial.s3.amazonaws.com` `@font-face` blocks at lines 442–468) for `.text-apple` / `.bg-apple`. Cousine is used for `pre`/`code`.

Text utilities (all on the `.text-*` namespace):

- `.text-landing` — uppercase, 1.6 rem letter-spacing (a wide signature look used on hero slides).
- `.text-subtitle` — eyebrow uppercase, sits above an `h1`/`h2`.
- `.text-intro` — 2.4 rem lead paragraph (24 px → bigger than body, smaller than h3).
- `.text-data` — 6.4 → 15.2 rem numbers, for metrics slides.
- `.text-emoji` — 6.8 → 12.8 rem oversized emoji.
- `.text-cols` — magazine 2-column with drop-cap on first paragraph (`first-letter` styled to 11 rem floated).
- `.text-pull-left` / `.text-pull-right` — pull-quotes that float into the gutter at ≥1024 px (`margin-left/right: -4.8rem`).
- `.text-quote` / `.wall` — big blockquote with a giant `"` glyph rendered via `::before`.
- `.text-interview` — definition-list layout for Q&A with the term floated into the left margin.
- `.text-context` — heading with a coloured underline bar.
- `.text-symbols`, `.text-separator`, `.text-shadow`, `.text-uppercase`, `.text-lowercase`, `.text-info`.

A clever auto-spacing rule (lines 163–169): a `@for` loop generates `h1+h2`, `h1+h3` … `h6+h6` selectors that all collapse to `margin-top: .8rem` — so adjacent headings never need manual margin overrides.

### Cards, quotes, tables

- **Cards** (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/modules/_cards.scss`) — `.card-30/40/50/60/70` set the figure : content split (e.g. `.card-40` = 40% figure / 60% content). Cards are themselves `display:flex; flex-direction:row`; the `nth-child(even)` rule auto-alternates which side the image is on for visual rhythm on long card stacks. On `.fullscreen` slides cards become full-height covers.
- **Quotes** (`_quotes.scss`) — automatic em-dash via `cite::before { content: '\2014 \2009'; }`. The big-quote utility `.text-quote` / `.wall` renders a 12 rem left-quote glyph absolutely positioned at top-left.
- **Tables** (`_tables.scss`) — zebra striping and hover via `tr:nth-child(even)`.

### Animations

`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/utils/_animations.scss` ships exactly five keyframes — explicitly noted as "Just 5 basic animations" — borrowed from animate.css:

- `.fadeIn` — opacity 0→1, 1 s.
- `.fadeInUp` — translateY(100%)→0 with opacity, 1 s.
- `.zoomIn` — scale3d(.3) → 1, 1 s.
- `.slideInLeft` / `.slideInRight` — translateX(±100%) → 0, 1 s, `animation-fill-mode: both`.

Then `section * { animation: fadeIn .6s ease-in-out; }` on every slide (in `_slides.scss` line 9) means every child of a slide fades in on display — no per-element opt-in needed. `.slow` modifies duration to 4–5 s.

### Responsive behavior

Breakpoints in the source: 500 px, 568 px, 600 px, 768 px (tablet), 1024 px (desktop, the main one), 1200 px, 1280 px. Layout primitives almost universally collapse to 100 % width below 768 px. Flexblocks degrade from 4-up (≥1024) → 2-up (≥600) → 1-up (mobile). The `.size-N` width utilities only activate at ≥1024 px so the cascading effect on small screens stays predictable.

### Loose ends worth noting

- All shadows are tinted with `$stratos` (a near-black with hue) rather than pure black — keeps the design from looking flat.
- `.shadow` adds two pseudo-element drop shadows tilted ±3° to fake a paper-edge look (`_base.scss` lines 68–91).
- `.frame` adds a `0.8 rem` white border for instant polaroid styling.
- `.radius { border-radius: .4rem }` is the only border-radius primitive — there is no `.radius-lg`/`.rounded-full`. The look is intentionally crisp.

## JS runtime

Per-module summary, all paths under `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/`:

| File | Responsibility |
| --- | --- |
| `full.js` | Entry. Attaches `WebSlides` to `window`, imports `full.scss`. |
| `modules/webslides.js` | Main controller: state, options, slide transitions, plugin registry, `goNext`/`goPrev`/`goToSlide`, fullscreen, enable/disable. |
| `modules/slide.js` | Per-section wrapper. `show()` / `hide()` toggle `display` + `.current`; `moveAfterLast()` / `moveBeforeFirst()` re-order DOM for looping; fires `slide:show`, `slide:enable`, `slide:disable`, `dom:enter`, `dom:leave`. |
| `plugins/navigation.js` | Builds the floating `#navigation` block (prev/next arrows + counter), reacts to `ws:slide-change`, and adds a body-level click delegate so any `[data-slide="section-N"]` element acts as a jump-link. |
| `plugins/keyboard.js` | Arrow keys (direction-sensitive: arrows match orientation), Space (forward) / Shift+Space (back), PageUp/PageDown, Home/End, F (fullscreen). Bails out if the focused element is an input. |
| `plugins/hash.js` | Reads/writes `#slide=N` in the URL via `history.pushState`, syncs both directions (`hashchange` → goToSlide; `ws:slide-change` → setSlideNumber). |
| `plugins/touch.js` | Touch / pointer event normalisation, swipe → goNext/goPrev when |Δx| > 50 px, pinch → toggleZoom. Only enabled if `MobileDetector.isAny()`. |
| `plugins/scroll.js` | Mouse-wheel navigation on desktop only. `minWheelDelta` (40) + a `scrollWait` (450 ms) cooldown prevents over-scrolling past slides. |
| `plugins/autoslide.js` | Optional ticker. Activated via `new WebSlides({ autoslide: 5000 })`; auto-pauses when focus moves to an input. |
| `plugins/click-nav.js` | If `changeOnClick:true`, any click on the slide (except inputs, links, `[data-prevent-nav]`) advances. |
| `plugins/grid.js` | Dev-only baseline grid overlay. Inserts an inline `<style>` with the base64 grid PNG; toggled with the **Enter** key. |
| `plugins/video.js` | Strips `autoplay` from `<video>` elements and plays/pauses them when the parent slide becomes active (via `slide:enable` / `slide:disable`). |
| `plugins/youtube.js` | Auto-injects the YouTube IFrame API, wraps `[data-youtube]` elements in a Player class that handles ready-state queueing and per-slide play/pause/destroy. |
| `plugins/zoom.js` | The "slide index" view. On `-` key it clones every slide into a parallel `#webslides-zoomed` grid and scales them down to 25 % each so you can pick one. Re-uses the `.grid`/`.column`/`.wrap-zoom` classes. |
| `utils/dom.js` | The only DOM helper. `createNode`, `once`, `getTransitionEvent`/`getAnimationEvent` (prefix detection), `hide`/`show`, `fireEvent` (CustomEvent), `toArray`, `isFocusableElement`, `wrap`, `after`. |
| `utils/scroll-to.js` | Smooth scroll using `swing` easing, in `setTimeout(16ms)` ticks (pre-`requestAnimationFrame` era). |
| `utils/easing.js` | Easing functions (only `swing` is referenced). |
| `utils/keys.js` | Keycode constants — PLUS and MINUS are arrays to cover Firefox/Edge variants. |
| `utils/custom-event.js` | CustomEvent polyfill for IE. |
| `utils/mobile-detector.js` | UA sniffing for touch / Windows Phone branches. |

The runtime is small enough to read in a single sitting — total source is well under 2,000 lines of JS.

## Features (catalog)

- **Navigation by keyboard** — `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/plugins/keyboard.js`. Arrow keys are orientation-aware; Space and PgDn always advance; F goes fullscreen.
- **Navigation by mouse wheel** — `src/js/plugins/scroll.js`. Honours horizontal vs. vertical mode and a debounce window.
- **Navigation by swipe / pinch** — `src/js/plugins/touch.js`. Pinch out triggers the zoom (index) view.
- **Click to advance** — `src/js/plugins/click-nav.js`, opt-in via `changeOnClick:true`.
- **Click body links with `data-slide="section-N"`** — `src/js/plugins/navigation.js` lines 87–102.
- **Autoslide** — `src/js/plugins/autoslide.js`. Opt-in via `autoslide:<ms>`.
- **Hash routing / permalinks** — `src/js/plugins/hash.js`. URL fragment `#slide=N` is the source of truth on load.
- **Counter / pagination UI** — `src/js/plugins/navigation.js` builds `#navigation > a#previous, a#next, span#counter`. Hidden by default, fades in on hover (`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/modules/_slides-navigation.scss`).
- **Slide-index "zoom" overview** — `src/js/plugins/zoom.js` + `src/scss/modules/_zoom.scss`. Press `-` (or pinch out) to see all slides as a grid; press `+`/`Esc` to leave.
- **Vertical mode** — `<article id="webslides" class="vertical">` toggles the `isVertical` branch; navigation arrows switch to ↑/↓, transition uses real scroll instead of slide-in.
- **Background images / videos** — semantic `<span class="background">` / `<video class="background-video">`, with `.dark`, `.light`, `.frame`, `.anim` modifiers.
- **Auto-play HTML video** — `src/js/plugins/video.js`. The framework removes `autoplay` and replays it only when the slide is active.
- **Auto-play YouTube** — `src/js/plugins/youtube.js`. Uses `data-youtube`, `data-autoplay`, `data-mute`, `data-no-controls`, `data-loop` data attributes.
- **Fullscreen** — `WebSlides.fullscreen()` (called by keyboard F). Vendor-prefixed.
- **Baseline grid overlay (dev)** — `src/js/plugins/grid.js`. **Enter** toggles an 8 px PNG underlay.
- **Looping** — `loop:true` option (default). Implemented via `Slide.moveAfterLast()` / `moveBeforeFirst()` DOM re-ordering.
- **No markdown loader.** No presenter mode. No speaker notes. No PDF export. No code highlighting (uses raw `<pre>` with optional `<span class="code-comment">`).

## Notable libraries & dependencies

There are **no runtime dependencies**. `package.json` lists `request` under `dependencies`, but it isn't imported by any of the source files — it's an artifact, probably used by `zip-release.js`. Devtime: Webpack 3, Babel 6 (`babel-preset-env`, `es2015`), node-sass 4, postcss + autoprefixer, ESLint, sass-lint, Jest + `simulant` for synthetic DOM events, `archiver` + `smart-banner-webpack-plugin` for the release zip.

Optional add-ons mentioned in `README.md`:
- Unsplash (free background imagery).
- animate.css (extra animation classes beyond the built-in five).
- particles.js (background effects).
- AOS (Animate-on-scroll for longforms).
- pt (visual math demos).

## Code patterns worth studying

### 1. Generate every utility class from a SCSS map

From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_color.scss` lines 107–111:

```scss
@each $name, $color in $bg-colors {
  .bg-#{$name} {
    background-color: $color;
  }
}
```

Same idea for the social hover map at lines 284–288. Adding a new colour means one line in `_vars.scss`. This is the pattern to keep.

### 2. Width modifiers via @each

From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_base.scss` lines 161–170:

```scss
$sizes: 80, 70, 60, 50, 40, 30, 20;

@media (min-width: 1024px) {
  @each $size in $sizes {
    .size-#{$size} {
      width: $size * 1%;
    }
  }
}
```

### 3. Auto-pair heading margins via @for

From `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/_typography.scss` lines 163–169:

```scss
@for $i from 1 through 6 {
  @for $j from 1 through 6 {
    h#{$i}+h#{$j} { margin-top: .8rem; }
  }
}
```

36 selectors generated. No "first child" / "last child" reset rules needed in authoring HTML.

### 4. Family selectors via [class*=]

`[class*='content-']`, `[class*='card-']`, `[class*='bg-']`, `[class*='background-']`, `[class*='text-pull-']` mean any future variant (`.content-foo`) inherits the base behaviour. This is the magic that keeps the markup clean and the CSS DRY. See `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/scss/modules/_slides.scss` lines 59–117 and `src/scss/_color.scss` lines 24–25.

### 5. Hash routing (40 lines)

`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/plugins/hash.js` is a model of how compact this can be:

```js
const slideRegex = /#slide=(\d+)/;
// ... static helpers ...
static getSlideNumber() {
  const results = document.location.hash.match(slideRegex);
  let slide = 0;
  if (Array.isArray(results)) slide = parseInt(results[1], 10);
  if (typeof slide !== 'number' || slide < 0 || !Array.isArray(results)) {
    slide = null;
  } else {
    slide--; // Convert to 0 index
  }
  return slide;
}
```

Two listeners (`hashchange`, `ws:slide-change`) keep URL ↔ state in lockstep.

### 6. Slide re-ordering for cheap looping

`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/modules/slide.js` lines 69–88. Rather than animating from "last" to "first" via complex transforms, the framework moves the section element to a new DOM position. The browser's normal painting handles the rest. This is genuinely elegant and worth borrowing.

### 7. Touch normalisation

`/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/plugins/touch.js` lines 207–224 unifies `TouchEvent`, `PointerEvent`, and `event.originalEvent.changedTouches` into one `{x, y}` shape so the rest of the file can stay synchronous and platform-agnostic.

### 8. Open plugin registry

```js
// /Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/src/js/modules/webslides.js
static registerPlugin(key, cto) {
  PLUGINS[key] = cto;
}
```

Every plugin is just `class Foo { constructor(wsInstance) { /* ... */ } }`. There is no lifecycle interface beyond "constructor runs after slide grab, before initSlides". Third-party plugins listen to `ws:init` and `ws:slide-change` for everything else.

## Demo gallery

Under `/Users/jluterek/code/jluterek/slides/reference-applications/WebSlides/demos/`:

| File | Title | Purpose |
| --- | --- | --- |
| `index.html` | Demo index | Gallery linking the other demos. |
| `why-webslides.html` | "Why WebSlides is so inspiring?" | The pitch deck. Heavy on `.text-landing`, `.bg-apple`, `.text-data`. |
| `landings.html` | "Landings" | Marketing-page patterns — `.flexblock.features`, `.flexblock.gallery`, hero covers. |
| `portfolios.html` | "Portfolios" | Card-heavy showcase layouts (`.card-50`, `.fullscreen` cards). |
| `keynote.html` | "Apple Keynote" | The `.bg-apple` gradient + San Francisco font in action. |
| `interviews.html` | "Longform Interviews" | `.text-interview` definition-list layout, magazine-style. |
| `longforms.html` | "Longforms" | Article-as-deck patterns: `.wrap.longform`, `.text-cols`, `.text-pull-left/right`. |
| `media.html` | "Videos, Images, and Maps" | `.background-video`, embedded YouTube, map iframes. |
| `netflix-culture.html` | "Netflix's Culture · WebSlides" | The famous Patty McCord deck re-rendered — the canonical proof point. |
| `components.html` | "WebSlides Documentation: Components" | Catalog of every component (cards, flexblocks, quotes, tables, badges). |
| `classes.html` | "WebSlides Tutorial: Classes" | Cheatsheet of every utility class with live examples. |

The two most valuable for design inspiration are `classes.html` (utility cheatsheet) and `keynote.html` (the look that gave WebSlides its reputation).

## Strengths to learn from

- **Design DNA is the product.** The CSS *is* the framework — the JS is incidental. A landing-page-quality deck is one `<section class="bg-apple aligncenter">` away.
- **Semantic class vocabulary.** `wrap`, `aligncenter`, `text-intro`, `card-50`, `flexblock features` reads aloud. There is no `mt-4 px-2` Tailwind-style noise. Authors who can write HTML can write slides.
- **One container, one class, lots of variants.** `.flexblock` + `.features` / `.metrics` / `.clients` / `.steps` is a strong taxonomy.
- **Generators over hand-written classes.** SCSS maps + `@each` mint the entire colour and size palette.
- **No JS authoring API.** You write HTML; the framework finds it. No transforms, no compile step for content.
- **8-pixel vertical rhythm enforced by tooling.** The `Grid` plugin and the `.8rem` baseline keep typography honest.
- **Beautiful default palette.** The `chir.ag` name-that-color naming convention (`pickled-bluewood`, `cardinal`, `havelock-blue`) makes the variables themselves feel curated.
- **Open plugin registry with one-liner registration.** Eleven first-party plugins demonstrate the shape.
- **Tiny.** All source code fits in your head.

## Weaknesses / pain points

- **Effectively unmaintained.** Last meaningful commit predates 2020; only Dependabot bumps since. The codebase still targets webpack 3, Babel 6, node-sass.
- **No markdown authoring.** You hand-write HTML. No `<section data-markdown>` like reveal.js.
- **No presenter mode, speaker notes, or timer.** This is a content/landing tool, not a stage tool.
- **No PDF export, no offline export, no print-friendly mode beyond a bare `_print.scss`.**
- **No syntax highlighting** for code blocks — `<pre>` is styled, but you'd ship Prism/Highlight.js yourself.
- **Hard-coded global state**: `document.getElementById('webslides')`. Multiple decks per page are not supported.
- **UA-sniffing mobile detector** in `src/js/utils/mobile-detector.js` — fragile by 2026.
- **All plugins always instantiated.** Even `youtube.js` injects its API only when needed, but the eleven constructors all run unconditionally.
- **Floats for `.content-left/right`** rather than grid/flex — leaves clearfix kludges in the source.
- **External CDN dependencies in the default CSS** — Google Fonts (Roboto, Maitree) and Apple's S3 bucket for San Francisco. Offline usage requires self-hosting fonts.
- **Slide DOM mutation for looping** complicates external state observation (`MutationObserver`, devtools), even though it's clever.

## Relevance to our project

WebSlides is the visual reference. We should adopt its **palette-as-map → utility-class generator** pattern in our SCSS/Tailwind theme, lift the **`.wrap` + `.size-N` + `.aligncenter`** vocabulary almost verbatim, and steal the **`.flexblock` family** for "auto-fill, equal-height" content blocks. The **`.bg-apple` gradient + San Francisco font + `.text-landing` letter-spacing** look is the single most distinctive thing in any open-source deck framework — it's why people remember WebSlides — and a default Astro theme that nails that look will trade on the same shelf-appeal. From the JS side, the things to borrow are the **`#slide=N` hash router**, the **`Slide.moveAfterLast/BeforeFirst` DOM-reordering loop**, the **`ws:init` / `ws:slide-change` custom-event contract**, and the **open plugin registry**; everything else (vanilla DOM helpers, UA sniffing, webpack 3 build) we should leave behind in favour of TypeScript + Astro components. WebSlides is what good design + thin JS looks like; our job is to keep that design DNA while adding the markdown authoring, presenter mode, and MCP integration it never had.
