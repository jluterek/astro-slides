---
title: Transitions
description: Slide-level transitions and cross-slide object continuity with <Morph>.
---

Transitions animate the change from one slide to the next. astro-slides ships built-in
slide transitions (fade and directional slides) plus `<Morph>` for **object continuity** —
an element that appears to move and reshape as it carries across a slide boundary.

There is **no animation library**. Slide transitions are pure CSS keyed off the deck's
`past` / `present` / `future` state machine, and morphs use the browser's native
[View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
with a hand-rolled FLIP fallback where it isn't supported ([ADR-0006](https://github.com/jluterek/astro-slides/blob/main/docs/decisions/0006-view-transitions-with-flip-fallback.md)).

## Deck-level default

Set a default transition for the whole deck in the headmatter (the first frontmatter
block). It applies to every slide unless a slide overrides it.

```md
---
title: My Deck
theme: starter
transition: fade
---
```

The default is `fade` if you set nothing.

## Per-slide transition

Any slide can override the deck default with its own `transition:` frontmatter. The
transition describes how _that_ slide enters.

```md
---
transition: slide-left
---

## Directional transition

This slide arrives with a slide-left transition.
```

## Preset names

`transition:` accepts these string presets:

| Preset             | Effect                                                        |
| ------------------ | ------------------------------------------------------------- |
| `fade`             | Cross-fade (opacity only). The default.                       |
| `fade-out`         | Opacity fade variant.                                         |
| `view-transition`  | Opacity swap that opts into the View Transitions root cross-fade at runtime. |
| `slide-left`       | Incoming slide moves in from the right; outgoing exits left.  |
| `slide-right`      | Incoming slide moves in from the left; outgoing exits right.  |
| `slide-up`         | Incoming slide moves up from below; outgoing exits upward.    |
| `slide-down`       | Incoming slide moves down from above; outgoing exits downward.|
| `none`             | No transition — the slide snaps in.                           |

## Configured transitions (object form)

Instead of a bare preset name you can pass an object to tune duration and easing per
transition. `name` is required; `duration` (milliseconds) and `easing` (any CSS timing
function) are optional.

```md
---
transition:
  name: slide-left
  duration: 500
  easing: cubic-bezier(0.4, 0, 0.2, 1)
---
```

When omitted, duration and easing fall back to the theme's `--slide-transition-duration`
and `--slide-transition-easing` custom properties.

## `<Morph>` — object continuity across slides

`<Morph>` marks an element as the "same" object on two consecutive slides. Give the paired
elements a matching `id`, and the runtime animates the element from its old position and
size to its new ones as you advance — even if the tag, layout, or styling differs.

```mdx
---

## Morph: before

<Morph id="hero" as="div" class="demo-hero">astro-slides</Morph>

---
layout: center
---

<Morph id="hero" as="div" class="demo-hero demo-hero--big">astro-slides</Morph>

The element above continues from the previous slide — it grows and re-centers in place
rather than fading out and back in.
```

Props:

- `id` (required) — the pairing key. Elements with the same `id` on adjacent slides are
  matched.
- `as` — the HTML tag to render. Defaults to `span`.
- `class` — extra classes to apply to the rendered element.

`<Morph>` emits only a `data-morph` attribute; the runtime assigns a `view-transition-name`
on the fly for the matched pair (both slides share one DOM, so a static shared name would
collide) and clears it when the transition finishes.

### How the morph is animated

- **View Transitions API (primary):** the browser snapshots the old and new element and
  interpolates the whole subtree — position, size, and also color, opacity, and text
  reflow. GPU-composited, zero extra JS. Supported in Chromium, Safari 18+, and Firefox as
  it lands.
- **FLIP fallback:** where the View Transitions API is unavailable, the runtime measures
  the element's old and new boxes and animates the transform (translate + scale) with the
  Web Animations API. Position and size morph; color and opacity changes snap instead of
  interpolating.

Both paths reach the same final frame — the fallback is a graceful degradation.

:::note
Elements can also be paired by a heading-text heuristic (matching tag + text) when you
don't add an explicit `id`, but an explicit `<Morph id="...">` is the reliable way to pair
elements across slides.
:::

## Reduced motion

`prefers-reduced-motion` is respected. When a viewer has reduced motion enabled, slide
transitions are disabled (the change applies instantly) and morphs skip their animation,
snapping to the final layout. This is handled in CSS and short-circuited in the runtime, so
no motion plays for viewers who opt out.

## Source

- `packages/client/components/Morph.astro`
- `packages/client/src/styles/transitions.css`
- `packages/client/src/styles/deck.css`
- `packages/client/src/transitions/index.ts`
- `packages/client/src/transitions/flip.ts`
- `packages/client/src/transitions/detect.ts`
- `packages/types/src/frontmatter.ts`
- `docs/decisions/0006-view-transitions-with-flip-fallback.md`
- `docs/built/07-transitions.md`
- `examples/minimal/slides.md`
