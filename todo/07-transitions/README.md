---
title: Phase 07 — Transitions and object continuity
status: pending
started:
ended:
---

## Goal

Implement slide-level transitions per ADR-0006: the View Transitions API for browsers that support it, a FLIP-based fallback (adapted from reveal.js's `autoanimate.js`) for browsers that don't. Element pairing across slides uses `view-transition-name` (and a higher-level `<Morph id="…">` component that emits it).

## Exit criteria

- [ ] Built-in slide-level transitions: `fade`, `fade-out`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `view-transition`. Per-slide `transition:` frontmatter overrides the deck default.
- [ ] `<Morph id="logo">` (or similar) component on two consecutive slides causes the named element to morph between positions/sizes/styles.
- [ ] On browsers with `document.startViewTransition`, the morph uses VTA; on others, the FLIP fallback runs.
- [ ] Feature detection happens once at runtime; behavior is consistent within a session.
- [ ] Reduced-motion (`prefers-reduced-motion`) softens or disables transitions automatically.
- [ ] FLIP implementation matches matched elements by `data-morph-id` (explicit) and by heading text content (heuristic), à la reveal.js.
- [ ] Trade-off cases documented in `docs/built/07-transitions.md`: where VTA and FLIP differ.

## Planned tasks

- Built-in CSS transitions (`fade`, `slide-*`)
- Astro view-transitions wiring (rely on Astro's `<ViewTransitions />`)
- `<Morph>` component → emits `view-transition-name`
- FLIP fallback implementation (port from `reveal.js/js/controllers/autoanimate.js`)
- Feature detection + transition dispatcher
- Reduced-motion handling
- Visual snapshot tests for both VTA and FLIP paths

## Dependencies

- Phase 04 (runtime core — transitions trigger on navigation)
- Phase 05 (layouts — transitions wrap layout boundaries)

## Notes

The View Transitions API is the primary; FLIP is the safety net. We accept that some morph nuances will differ between paths — see `docs/decisions/0006-view-transitions-with-flip-fallback.md` for the rationale.

Reference: `docs/reference-applications/reveal.js.md` § *Auto-Animate — reveal.js's Morph-equivalent (deep dive)* — this is the algorithm we port for FLIP. `docs/reference-applications/marp.md` § *Code patterns worth studying* on VTA usage.

Open questions:
- Whether per-element transitions (`<Click>` step animations from Phase 06) should also feature-detect VTA or stick to CSS transitions. Current plan: CSS for fragments, VTA only for slide-level.

## Outcome

_Fill in when the phase closes._
