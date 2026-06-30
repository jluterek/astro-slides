---
title: Phase 04 — Runtime core
status: pending
started:
ended:
---

## Goal

Build the in-browser slide runtime: how a slide renders, how navigation works, how URL state is tracked, how keyboard/touch input drives the deck. Adopts reveal.js's `past`/`present`/`future` class-name state machine for its simplicity and CSS-friendly contract. Layouts and themes come in Phase 05; this phase produces a minimally styled but functional deck.

## Exit criteria

- [ ] A deck renders all slides with class-name state (`past`/`present`/`future`) on the active section.
- [ ] Keyboard navigation: arrow keys, space, `?` (help), Home/End.
- [ ] Touch / swipe navigation works on mobile.
- [ ] URL state: current slide in path, current step (placeholder) in query (`?step=N`). Back/forward navigation honored.
- [ ] Slide scaling: viewport-fit (16:9 by default) with CSS-variable-driven aspect ratio.
- [ ] `aria-live` status region announces slide changes for screen readers.
- [ ] An overview mode (zoomed-out grid of all slides) accessible via `Esc` / `O`.
- [ ] First slide of the demo deck renders, navigates, scales, and reads its slide number from the URL.
- [ ] E2E test (Playwright, from `.claude/settings.json`) navigates the demo deck and asserts slide changes.

## Planned tasks

- Slide rendering component (`Slide.astro` / `Slide.tsx`)
- Navigation controller (next/prev/goto by index, hash → state, state → hash)
- Keyboard input module (with rebindable bindings)
- Touch input module
- Viewport scaling / aspect-ratio handling
- Overview mode
- Accessibility: aria-live, focus management
- Playwright e2e setup + sample test
- Multi-deck instance support (more than one deck on a page)

## Dependencies

- Phase 03 (Astro integration — we need the routes and the slide data)

## Notes

Approach: borrow heavily from reveal.js's runtime structure (`docs/reference-applications/reveal.js.md` § *Architecture* and *Code patterns worth studying*) but write it as TypeScript modules, not a closure-scoped factory.

Open questions:
- Whether the runtime is React-based, Astro-component-based, or framework-agnostic vanilla TS. Astro components can call into vanilla TS modules — leaning that direction so the runtime is portable.
- Where to put global state: a small singleton vs per-deck instance.

## Outcome

_Fill in when the phase closes._
