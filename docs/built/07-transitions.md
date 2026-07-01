---
phase: 07-transitions
status: distilled
distilled: 2026-07-01
---

# Phase 07 — Transitions and object continuity

Slide-level transitions (fade + directional slides) and cross-slide object continuity
(`<Morph>`) now run on top of the Phase-04 single-page runtime. Built-in transitions are
pure CSS keyed off the `past`/`present`/`future` state machine; morphs use the View
Transitions API where available (ADR-0006) with a hand-rolled FLIP fallback ported from
reveal.js. Archived task notes: `todo/archive/07-transitions/`.

## The one thing that changed vs. the plan

The phase was planned around Astro's `<ClientRouter />` supplying the transition trigger.
It can't: **Phase 04 renders the whole deck as one DOM of `<section>`s** and navigates by
toggling state classes — there is no cross-document swap for `<ClientRouter />` to animate.
So the trigger is **same-document `document.startViewTransition(mutate)`**, called by the
runtime around the class-toggling mutation. ADR-0006 is amended to record this; its core
(VTA primary, FLIP fallback, no animation library) stands.

Consequence of one-DOM: a shared **static** `view-transition-name` would collide (duplicate
names are an error). The dispatcher assigns `view-transition-name` **dynamically** to only
the matched outgoing/incoming pair for the duration of the transition, then clears it.
`<Morph>` emits just `data-morph` — no static name.

## What shipped

**Built-in CSS transitions** — `packages/client/src/styles/transitions.css`
- `data-transition` keys each `<section>` (per-slide `transition:` frontmatter) and the deck
  root (headmatter default). `fade`/`view-transition` = opacity only (the base `.as-slide`
  behavior in deck.css); `slide-left/right/up/down` keep the moving slide opaque and
  translate it ±100%; `none` opts out.
- Reduced motion is handled in deck.css (`.as-slide { transition: none }`) — not duplicated.

**Visibility-timing fix** — `packages/client/src/styles/deck.css`
- The Phase-04 `.as-slide { visibility: hidden }` killed exit animations (hidden elements
  don't transition). Fixed with the visibility-delay trick: `transition: … , visibility 0s
  linear var(--as-dur)` on the hidden state, `visibility 0s` on `.present` — so the outgoing
  slide stays visible for the duration, then snaps hidden. Timing reads theme CSS vars
  (`--slide-transition-duration`/`-easing`).

**Object continuity (runtime)** — `packages/client/src/transitions/`
- `detect.ts` — `getStartViewTransition()` (typed, bound), `supportsViewTransitions()`
  (probed once, cached for the session), `prefersReducedMotion()` (read live).
- `flip.ts` — `matchMorphs(from, to)` pairs elements by explicit `data-morph` id first, then
  a heading-text heuristic (`TAG:text`, à la reveal.js); `flipMorph()` runs First-Last-Invert
  via `getBoundingClientRect` + `element.animate` (WAAPI), returns the `Animation[]`.
- `index.ts` — `createSlideTransition(root, {duration, easing})` returns the dispatcher.
  Policy: reduced-motion → apply instantly; morphs (or `transition: view-transition`) + VTA →
  `startViewTransition` with dynamic names + `data-morphing="vt"|"root"`; morphs, no VTA →
  FLIP with `data-morphing="flip"`; otherwise → apply and let the CSS state transition handle it.

**Wiring**
- `navigation.ts` — `DeckController` takes an optional `transition`; slide changes (not the
  initial `replace`, not step-only) route the DOM mutation through it via a `mutate` closure +
  `sectionFor()`. Step reveals and URL/store sync are unchanged.
- `runtime.ts` — reads `--slide-transition-duration`/`-easing` off the root, builds the
  dispatcher, injects it into the controller.
- `routes/slide.astro` — imports `transitions.css`, sets `data-transition` on the root + each
  section, and emits per-slide `--slide-transition-duration/-easing` when a transition object
  carries them.
- `components/Morph.astro` — emits only `data-morph` (was a static `view-transition-name`).

## How to navigate the result

- `packages/client/src/transitions/index.ts` — the dispatcher + policy (start here).
- `packages/client/src/transitions/flip.ts` — element pairing + FLIP fallback.
- `packages/client/src/transitions/detect.ts` — capability detection.
- `packages/client/src/navigation.ts` (`apply`/`mutate`/`sectionFor`) — where a slide change
  hands off to the transition.
- `packages/client/src/styles/transitions.css` + `deck.css` — the CSS state transitions and
  the visibility-timing fix.

## VTA vs. FLIP — where they differ (the documented trade-offs)

| | View Transitions API | FLIP fallback |
| --- | --- | --- |
| Composition | Browser snapshots old/new into `::view-transition-old/new` pseudo-elements and cross-fades + transforms them. | We transform the **live** `to` element from the old box to the new one. |
| What morphs | The whole named subtree as an image — text reflow, color, opacity all interpolate. | Position + size only (translate/scale). Color/opacity/text changes snap. |
| Cost | Zero JS bytes; GPU-composited. | ~100 LOC; WAAPI, main-thread measure (`getBoundingClientRect`). |
| Custom easing | CSS on the pseudo-elements (`::view-transition-group(name)`) — powerful, unfamiliar. | `duration`/`easing` args, sourced from theme CSS vars. |
| Support | Chromium full, Safari 18+, Firefox landing. | Everywhere `element.animate` exists (universal). |

Practical upshot: on VTA browsers a `<Morph>` that changes size *and* color animates both; on
FLIP browsers it moves/scales and the color jumps. Acceptable degradation — same final frame.

## Key decisions

- **Same-document `startViewTransition`, not `<ClientRouter />`** — forced by the single-page
  runtime (see ADR-0006 amendment). This is the load-bearing deviation from the phase plan.
- **Dynamic `view-transition-name`** — assigned to the matched pair only during the transition,
  cleared on `finished`, because all slides share one DOM.
- **Visibility-delay over `display`/removal** — keeps the exit slide in the layout so its CSS
  transition plays, without leaving it interactable after.
- **FLIP measures the live element** (reveal.js model) — no clone; the same node animates then
  settles at identity.

## What surprised us

- **`visibility: hidden` silently defeats CSS transitions** — an element that's hidden at the
  start of a transition just isn't there to animate. The `visibility 0s linear <dur>` delay is
  the standard trick and the whole reason exit animations work now.
- **`document.startViewTransition` captures only rendered elements** — because non-present
  slides are `visibility: hidden`, VTA snapshots only the present slide's morph target, so the
  dynamic-name approach doesn't produce duplicate-name conflicts in practice.
- **jsdom has no View Transitions API and `getBoundingClientRect` returns zeroes** — unit tests
  exercise the reduced-motion / no-VTA / FLIP-with-no-visible-delta branches; the real VTA and
  FLIP animation paths are covered by Playwright in Chromium.

## Loose ends

- **No custom `::view-transition-*` easing helpers yet** — authors get the default group
  animation; ergonomic per-morph easing is a polish item.
- **FLIP matches position + size only** — color/opacity morphs are VTA-only (documented above).
- **Magic Move (Phase 08)** will build on this dispatcher for token-level code morphs.
- **Directional presets are fixed** (`slide-*` at ±100%) — no per-slide distance/angle config.
- **Visual regression snapshots** are behavioral (attributes/visibility), not pixel snapshots.

## Stats

New `transitions/` module (detect/flip/index) + `transitions.css`; deck.css visibility fix;
`navigation.ts`/`runtime.ts`/`slide.astro`/`Morph.astro` wired. 139 unit tests (+11:
`matchMorphs` pairing, detection, dispatcher policy, controller-uses-transition) + 10
Playwright e2e (+2: resolved `data-transition` on root/slide, morph element survives the
change). Demo grew to 13 slides (a `slide-left` slide + a two-slide `<Morph>` pair).

---

**Workflow:** Created at phase close, before `todo/07-transitions/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
