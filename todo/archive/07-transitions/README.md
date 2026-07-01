---
title: Phase 07 — Transitions and object continuity
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Implement slide-level transitions per ADR-0006: the View Transitions API for browsers that support it, a FLIP-based fallback (adapted from reveal.js's `autoanimate.js`) for browsers that don't. Element pairing across slides uses `transition:name` (Astro's binding) and a higher-level `<Morph id="…">` component that emits the attribute.

## Exit criteria

- [x] Built-in slide-level transitions: `fade`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `view-transition`, `none`. Per-slide `transition:` frontmatter overrides the deck default.
- [x] `<Morph id="logo">` component on two consecutive slides causes the named element to morph between positions/sizes.
- [x] On browsers with `document.startViewTransition`, the morph uses VTA (same-document — **not** `<ClientRouter />`, see note); on others, the FLIP fallback runs.
- [x] Feature detection happens once at runtime; behavior is consistent within a session.
- [x] Reduced-motion (`prefers-reduced-motion`) disables transitions automatically (CSS in deck.css + runtime short-circuit).
- [x] FLIP implementation matches elements by `data-morph` (explicit) and by heading text content (heuristic), à la reveal.js.
- [x] Trade-off cases documented in `docs/built/07-transitions.md`: where VTA and FLIP differ.

> **Deviation from plan:** the single-page runtime (Phase 04) means there is no cross-document
> swap for `<ClientRouter />` to animate. The VTA trigger is same-document
> `document.startViewTransition()` driven by the runtime. ADR-0006 is amended accordingly.

## Locked decisions

- **Primary API:** `<ClientRouter />` from `astro:transitions` (renamed from `<ViewTransitions />` in Astro 5).
- **Element pairing:** Astro's `transition:name="<name>"` attribute. `<Morph id="X">` is sugar that emits `transition:name={X}`.
- **Fallback:** Hand-rolled FLIP in `packages/client/src/transitions/flip.ts`, ported from reveal.js's `autoanimate.js` (see `docs/reference-applications/reveal.js.md` § *Auto-Animate*).
- **No third-party animation library.** No Motion, no Framer Motion, no react-spring for slide-level transitions. Per-element click animations (Phase 06) use CSS only.
- **Reduced motion:** Astro handles natively; we document and verify, not implement separately.
- **Feature detection:** at runtime once, on first transition. Cached for the session.

## Tasks (planned)

- Built-in CSS transitions (`fade`, `slide-*`) — `packages/client/src/styles/transitions.css`
- Astro `<ClientRouter />` wiring on slide routes
- `<Morph>` component (emits `transition:name`)
- FLIP fallback implementation (port from reveal.js)
- Feature detection + dispatcher (`startMorph()`)
- Reduced-motion verification
- Visual snapshot tests (Playwright) for both VTA and FLIP paths

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Built-in CSS transitions + `<ClientRouter />` wiring | parallel — independent files |
| **`<Morph>` component, FLIP fallback, feature detection** | parallel after wiring |
| Visual snapshot tests | parallel with implementations |

## Dependencies

- Phase 04 (runtime core — transitions trigger on navigation)
- Phase 05 (layouts — transitions wrap layout boundaries)

## Risks

- **VTA support is improving but uneven.** Chromium full, Safari partial (16.4+), Firefox landed. FLIP fallback covers the gap.
- **FLIP visual fidelity won't perfectly match VTA.** Different composition models (FLIP transforms at the element level, VTA uses pseudo-elements `::view-transition-old/new`). Document the difference in `docs/built/07-transitions.md`.
- **Astro's `<ClientRouter />` does its own DOM swapping.** Our FLIP fallback must defer to or replace Astro's behavior when VTA isn't supported. Test the integration carefully.
- **Click step animations (Phase 06) are CSS-only** — confirmed not to use VTA. This means click animations and slide animations have different timing models. Document.

## Notes

Reference: `docs/reference-applications/reveal.js.md` § *Auto-Animate — reveal.js's Morph-equivalent (deep dive)* — this is the algorithm we port for FLIP. `docs/reference-applications/marp.md` § *Code patterns worth studying* on VTA usage.

## Outcome

Shipped. CSS state-class transitions (`fade` + `slide-*` + `none`) keyed by `data-transition`;
`<Morph>` object continuity via same-document `document.startViewTransition()` with a reveal.js-style
FLIP fallback (`packages/client/src/transitions/`). Fixed the Phase-04 `visibility: hidden`
exit-animation bug with the visibility-delay trick. ADR-0006 amended to record the same-document
trigger (the `<ClientRouter />` plan was incompatible with the single-page runtime). 139 unit tests
+ 10 Playwright e2e green; demo grew to 13 slides. Distilled → `docs/built/07-transitions.md`.
