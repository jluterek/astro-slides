# Animations & transitions

Two authoring surfaces: **click-stepped reveals** (progressively show parts of a slide) and **slide transitions** (how one slide gives way to the next, including `<Morph>` object continuity).

## Click-stepped reveals

Wrap content that should appear on a later click. Click steps are resolved **at MDX compile time** by the `remark-clicks` transform — it walks the slide in document order, assigns step indices, and injects a `totalClicks` count. The rendered output is static HTML (`<span class="as-click" data-click>`); no per-click JS hydrates. At runtime the navigation layer toggles a reveal class as you step through, so the components below are dumb wrappers, not stateful islands.

Three components are in scope inside every slide: `<Click>`, `<After>`, `<Clicks>`.

### `<Click>` — reveal on a step

By default each `<Click>` claims the next step in document order:

```mdx
First this is visible.

<Click>Then this appears on click 1.</Click>
<Click>And this on click 2.</Click>
```

Pin to an absolute step with `at`, or offset relative to the previous step with `+K`:

```mdx
<Click at="2">Appears on step 2 regardless of document order.</Click>
<Click at="+1">One step after the previous click.</Click>
```

Give a range `[a,b]` to reveal for a span of steps (shown from `a`, hidden again after `b`). Use `to` for the range end:

```mdx
<Click at="1" to="3">Visible during steps 1 through 3.</Click>
```

### `<After>` — ride the previous step

`<After>` reveals on the **same** step as the click before it — use it to bring in several pieces together:

```mdx
<Click>Point A.</Click>
<After>...and its footnote, on the same click.</After>
```

### `<Clicks>` — auto-step a group of children

`<Clicks>` reveals each child block on its own successive step. The split happens in `remark-clicks` (not in the component) because MDX merges adjacent block children unpredictably, so parse-time wrapping is the only deterministic option.

```mdx
<Clicks>
- First bullet on click 1
- Second bullet on click 2
- Third bullet on click 3
</Clicks>
```

Reveal children in batches with `every={N}`:

```mdx
<Clicks every={2}>
  <p>These two...</p>
  <p>...reveal together, then the next two.</p>
</Clicks>
```

Note: `<Clicks>` reveals explicit block children. Auto-descending into a markdown list's `<li>`s is a known limitation — if per-item stepping over a plain list misbehaves, list the items as explicit blocks.

### Reveal animation direction

Reveals fade in by default. Directional/scale variants are available via class (`as-anim-up`, `as-anim-down`, `as-anim-left`, `as-anim-right`, `as-anim-scale`):

```mdx
<Click class="as-anim-up">Slides up as it fades in.</Click>
```

### `clicks:` frontmatter override

Each slide exports a compile-time `totalClicks` derived from its click components. Override the step count from slide frontmatter with `clicks:` — useful when runtime-registered steps (e.g. code Magic Move, KaTeX) add clicks the static scan can't see, or to cap/extend the count:

```mdx
---
clicks: 5
---
```

## Slide transitions

A transition is how the deck animates from one slide to the next. Built-in transitions are **pure CSS**, keyed off the runtime's `past` / `present` / `future` state machine — the runtime wraps the class-toggling mutation in a same-document `document.startViewTransition(...)` where supported, falling back cleanly otherwise (View Transitions API primary, FLIP fallback, no animation library — ADR-0006).

### Setting a transition

Set a deck-wide default in **headmatter** (the deck's top-level frontmatter), or override **per slide** in that slide's frontmatter. Both use the `transition:` key.

```mdx
---
transition: fade
---
```

Per-slide override:

```mdx
---
transition: slide-left
---
```

Built-in values:

| Value | Effect |
| --- | --- |
| `fade` | Opacity cross-fade (the default base behavior). |
| `slide-left` | Incoming slide translates in from the right. |
| `slide-right` | Incoming slide translates in from the left. |
| `slide-up` | Incoming slide translates in from below. |
| `slide-down` | Incoming slide translates in from above. |
| `view-transition` | Force the View Transitions API path (whole-slide snapshot cross-fade). |
| `none` | No transition; opt out. |

`slide-*` presets translate at a fixed ±100% — per-slide distance/angle isn't configurable.

### Transition as an object

Pass an object to tune duration and easing alongside the name. `duration` and `easing` are emitted as per-slide CSS variables (`--slide-transition-duration` / `--slide-transition-easing`); otherwise they inherit the theme's values.

```mdx
---
transition:
  name: slide-left
  duration: 400ms
  easing: ease-in-out
---
```

Reduced motion is respected automatically: under `prefers-reduced-motion` the runtime applies the slide change instantly.

## `<Morph>` — object continuity between slides

Wrap an element on two adjacent slides in `<Morph>` to animate it from its old position/size to its new one as the deck advances — the same object appears to persist across the slide change instead of fading out and back in.

```mdx
<!-- slide 1 -->
<Morph id="logo"><img src="/logo.svg" /></Morph>

<!-- slide 2 -->
<Morph id="logo" class="big"><img src="/logo.svg" /></Morph>
```

`<Morph>` emits only a `data-morph` marker (no static transition name — a shared static name would collide in the single-DOM runtime). The runtime pairs morph elements by their explicit `id` first; unmarked headings can also pair by matching heading text as a fallback heuristic. Give matching `id`s to force a pair.

How it animates depends on the browser:

- **View Transitions API** (Chromium, Safari 18+, Firefox landing): the whole named subtree is snapshotted and interpolated — position, size, **and** color/opacity/text reflow all animate.
- **FLIP fallback** (everywhere `element.animate` exists): position and size only (translate/scale) via First-Last-Invert on the live element; color/opacity/text changes snap rather than tween.

Both paths land on the same final frame — a `<Morph>` that changes size and color animates both under VTA and just moves/scales under FLIP. Acceptable degradation. Use `<Morph>` for continuity of identity (a logo repositioning, a box growing), not for effects that depend on color interpolation on non-VTA browsers.
