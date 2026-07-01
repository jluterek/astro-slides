---
title: Phase 04 — Runtime core
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Build the in-browser slide runtime: how a slide renders, how navigation works, how URL state is tracked, how keyboard/touch input drives the deck. Adopts reveal.js's `past`/`present`/`future` class-name state machine for its simplicity and CSS-friendly contract. Layouts and themes come in Phase 05; this phase produces a minimally styled but functional deck. Also sets up Playwright e2e infrastructure.

## Exit criteria

- [x] A deck renders all slides with class-name state (`past`/`present`/`future`) on the active section.
- [x] Keyboard navigation: arrow keys, space, `?` (help), Home/End — wired via `tinykeys`.
- [x] Touch / swipe navigation works on mobile (Pointer Events — see deviation below).
- [x] URL state: current slide in path, current step in query (`?step=N`). Back/forward navigation honored.
- [x] Slide scaling: viewport-fit (16:9 by default) with CSS-variable-driven aspect ratio.
- [x] `aria-live` status region announces slide changes for screen readers.
- [x] Overview mode (zoomed-out grid of all slides) accessible via `Esc` / `O`.
- [x] Cross-island state via `nanostores` (current slide, current step, deck config).
- [x] First slide of the demo deck renders, navigates, scales, and reads its slide number from the URL.
- [x] Playwright config in place; e2e test navigates the demo deck and asserts slide changes.

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

## Notes / decisions (as built)

- **Single-page-per-route model.** Phase 03 rendered one slide per route. The exit criteria (all sections with `past/present/future`, an overview grid) require the whole deck in one DOM, so `routes/slide.astro` now renders every slide of the deck as a `<section>` stack with the current one `present`. Each `/{deck}/{slide}` URL stays a real, deep-linkable static page; in-deck navigation is client-side (class toggle + `history.pushState`), no reload. HTML is duplicated per route (M routes × M sections) — fine for typical decks; a single-page / SSR optimization can come later if large decks need it.
- **ClientRouter removed from the deck page (temporarily).** With client-side class-toggle navigation, Astro's `<ClientRouter />` would double-handle `popstate` and fight the runtime. It's dropped here; **Phase 07 (transitions)** reintegrates the View Transitions API against the runtime's navigation, which is where slide-morph animation actually belongs.
- **Touch via Pointer Events, not `@use-gesture/core` (deviation).** Swipe-to-navigate is a single horizontal gesture; a ~30-line Pointer Events handler is zero-dependency, fully unit-testable in jsdom, and covers touch + pen. `@use-gesture` is deferred to **Phase 11** (drawing / pinch-zoom) where multi-touch gestures earn the dependency. Reversible — `touch.ts` is the only consumer.
- **Overview + help are vanilla TS, not React islands (deviation).** The locked model allows React islands for interactive UI, but overview (a CSS-grid toggle + click-to-jump) and the help overlay are pure DOM/CSS with no React state. Keeping them vanilla avoids adding React + `@astrojs/react` for a Phase-04 that has no genuine React UI yet. React islands remain the plan for richer surfaces (presenter mode, Phase 10). The runtime core is framework-agnostic as specified.
- **nanostores 0.11.4** (latest published; the "v1.4+" note in the locked decisions predates the actual release line). API used is stable (`atom`). Each deck gets its own `DeckStore` (multi-deck-per-page ready).
- **Client package uses `moduleResolution: "bundler"`.** It's browser code bundled by Vite/Astro; bundler resolution matches how it ships and resolves `exports`-map-only deps. `tinykeys` ships no `types` condition in its `exports`, so a small ambient declaration (`src/tinykeys.d.ts`) covers the surface we use.
- **Step model wired but not yet visual.** `?step=N` is tracked in URL + store and drives a generic `[data-click]` → `.as-click-shown` reveal contract, so **Phase 06** (`<Click>` components) drops into an already-wired seam. No click components are authored yet.
- **`fitty` / `<FitText>`** not built here — it's a Phase 05 layout concern per the locked decisions.

## Outcome

Shipped `@astro-slides/client`: a framework-agnostic in-browser runtime — the `past/present/future` state machine, a pure navigation core (`nextState`/`prevState`/`gotoState`) plus a `DeckController`, keyboard (tinykeys) + touch (Pointer Events) input, viewport-fit scaling, an `aria-live` announcer, overview mode, a keyboard-help overlay, and per-deck `nanostores` state. `routes/slide.astro` renders the full deck and boots the runtime. 45 new unit tests (jsdom for DOM paths) + 6 Playwright e2e tests (real Chromium) all green; a CI `e2e` job runs them. Distilled to [`docs/built/04-runtime-core.md`](../../docs/built/04-runtime-core.md).
