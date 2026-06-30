# 0006. View Transitions API for slide morphs, FLIP fallback

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Object continuity ("Morph") between slides is the visual differentiator that makes a deck feel polished. Options:

- **Hand-rolled FLIP** (reveal.js `autoanimate.js`, ~600 LOC) — pairs matched elements by `data-id` / text content / tag, measures their boxes with `getBoundingClientRect()`, generates inverse transforms, animates. Works everywhere.
- **View Transitions API** (Marp, Slidev) — native browser primitive. Pair elements with `view-transition-name`, call `document.startViewTransition()`, the browser does the morph. Declarative, GPU-accelerated. Modern Chrome/Edge/Safari support it; Firefox is landing.
- **Motion / Framer Motion** — heavyweight runtime, full layout-animation system. Overkill for our needs; pulls in a large dep.
- **react-spring** (Spectacle) — solid React-first, but binds us to a JS animation runtime for what the browser can do natively.

The View Transitions API is the right primary because (1) Astro already exposes it via `<ViewTransitions />`, (2) it's declarative on the author's side, (3) the morph is hardware-accelerated. But it's not universal yet — we need a fallback for browsers without support.

## Decision

- **Primary:** View Transitions API. Authors pair elements across slides by setting `view-transition-name` (or via a higher-level `<Morph id="logo">` component that emits it). Astro's built-in view transition system handles the navigation triggers.
- **Fallback:** A FLIP implementation adapted from reveal.js's `autoanimate.js` (see `/Users/jluterek/code/jluterek/slides/docs/reference-applications/reveal.js.md` § *Auto-Animate*). Feature-detects `document.startViewTransition` at runtime and uses FLIP if absent.
- **No third-party animation library.** No Motion, no Framer Motion, no react-spring for slide-level animation.

Per-element fragment animations (the `<Click>` / `<Clicks>` model) use CSS transitions, not the View Transitions API.

## Consequences

- Authors get free Morph-style continuity by naming matched elements — no animation config, no JS hooks.
- The runtime ships small: View Transitions cost zero bytes, the FLIP fallback is ~500–700 LOC of our code.
- Trade-off: highly customized per-element easing or stagger requires CSS pseudo-element targeting (`::view-transition-old(name)`, `::view-transition-new(name)`). Powerful but unfamiliar to most authors. Mitigated by ergonomic helper components.
- Trade-off: the FLIP fallback won't match every nuance of the native VTA path (composited layers, default cross-fade behavior). Acceptable for older browsers; we document the difference.
- Trade-off: if View Transitions API support stalls, we'll be carrying the FLIP fallback indefinitely. Acceptable cost.
