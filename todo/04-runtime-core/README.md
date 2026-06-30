---
title: Phase 04 — Runtime core
status: pending
started:
ended:
---

## Goal

Build the in-browser slide runtime: how a slide renders, how navigation works, how URL state is tracked, how keyboard/touch input drives the deck. Adopts reveal.js's `past`/`present`/`future` class-name state machine for its simplicity and CSS-friendly contract. Layouts and themes come in Phase 05; this phase produces a minimally styled but functional deck. Also sets up Playwright e2e infrastructure.

## Exit criteria

- [ ] A deck renders all slides with class-name state (`past`/`present`/`future`) on the active section.
- [ ] Keyboard navigation: arrow keys, space, `?` (help), Home/End — wired via `tinykeys`.
- [ ] Touch / swipe navigation works on mobile via `@use-gesture/core`.
- [ ] URL state: current slide in path, current step in query (`?step=N`). Back/forward navigation honored.
- [ ] Slide scaling: viewport-fit (16:9 by default) with CSS-variable-driven aspect ratio.
- [ ] `aria-live` status region announces slide changes for screen readers.
- [ ] Overview mode (zoomed-out grid of all slides) accessible via `Esc` / `O`.
- [ ] Cross-island state via `nanostores` (current slide, current step, deck config).
- [ ] First slide of the demo deck renders, navigates, scales, and reads its slide number from the URL.
- [ ] Playwright config in place; e2e test navigates the demo deck and asserts slide changes.

## Locked decisions

- **Component model:** Astro components for static slide shells; **React islands for interactive UI** (navigation controls, overview mode, future presenter/recording UI); **vanilla TS modules** for the state machine and navigation core (framework-agnostic, portable).
- **Cross-island state:** `nanostores` v1.4+.
- **Keyboard:** `tinykeys` (global, framework-agnostic).
- **Touch / swipe:** `@use-gesture/core`.
- **Auto-fit-text:** `fitty` v2.4+ (opt-in per element via `<FitText>` from Phase 05).
- **Class-name state machine:** `past` / `present` / `future` on `<section>`s. CSS drives transitions (reveal.js-style).
- **URL state:** Astro routing for slide path; query param `?step=N` for click index. Back/forward honored.
- **Multi-deck per page:** supported. Each deck instance carries its own nanostore.
- **Playwright location:** project root `playwright.config.ts`; tests under `e2e/`.

## Tasks (planned)

- Slide component (`Slide.astro` wrapping a layout)
- Navigation controller (next/prev/goto by index, hash → state, state → hash) in vanilla TS
- Keyboard input module (tinykeys, rebindable bindings)
- Touch input module (@use-gesture)
- Viewport scaling / aspect-ratio handling
- Overview mode (React island)
- Accessibility: `aria-live`, focus management on slide change
- nanostore design for runtime state
- Playwright config + sample test
- Multi-deck instance test

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| State machine + nanostore design | sequential — others reference these |
| After state design | **navigation, keyboard, touch, scaling, overview, a11y, Playwright config** — seven parallel agents possible |
| After Playwright config | E2E tests can be written alongside features |

## Dependencies

- Phase 03 (Astro integration — routes and slide data)

## Risks

- **`@use-gesture/core` last published March 2024.** Feature-complete but watch maintenance. `react-swipeable` is the fallback.
- **`fitty` polls via RAF.** Constant CPU cost. Use only where needed (opt-in via `<FitText>`).
- **nanostores Astro integration quirks.** Astro requires `client:load` on stores in some cases. Verify with the official Astro recipe.

## Notes

Reference: `docs/reference-applications/reveal.js.md` § *Architecture* / *Code patterns worth studying* for the navigation core and class-name state machine. Borrow heavily but write as TypeScript modules, not a closure-scoped factory.

## Outcome

_Fill in when the phase closes._
