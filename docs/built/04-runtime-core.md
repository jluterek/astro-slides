---
phase: 04-runtime-core
status: distilled
distilled: 2026-06-30
---

# Phase 04 — Runtime core

The in-browser slide runtime. A deck route now renders the whole deck as a stack of
`<section>`s and a framework-agnostic TS runtime drives navigation, URL state,
keyboard/touch input, scaling, accessibility, and overview mode via reveal.js's
`past`/`present`/`future` class-name state machine. Archived task notes:
`todo/archive/04-runtime-core/`.

## What shipped

**`@astro-slides/client`** (new package — browser runtime, `moduleResolution: bundler`)
- `state-machine.ts` — `slideState()` + `applySlideStates()`: one of `past`/`present`/`future`
  per section, keyed by `data-slide-no`.
- `navigation.ts` — pure transitions `nextState`/`prevState`/`gotoState` (reveal.js fragment
  semantics: walk click steps before changing slides) + `DeckController` (applies the state
  machine, mirrors state into the store + URL, announces changes).
- `url.ts` — `parseLocation`/`basePath`/`buildLocation`: slide in the path, `?step=N` in the
  query, defensively parsed.
- `store.ts` — `createDeckStore()`: per-deck `nanostores` atoms (`slide`, `step`, `overview`).
- `keyboard.ts` — `bindKeyboard()` via `tinykeys` (arrows/space/PageUp-Down/Home/End/`O`/`?`/Esc),
  ignores keys while typing in inputs; `SHORTCUTS` table shared with the help overlay.
- `touch.ts` — `bindTouch()`: Pointer Events swipe (left→next, right→prev), mouse ignored.
- `scaling.ts` — `computeScale()`/`applyScale()`: largest uniform fit of the design box into
  the window, written to CSS custom properties.
- `a11y.ts` — `createAnnouncer()`: polite `aria-live` region, clear-then-set so repeats fire.
- `ui.ts` — `ensureHelpOverlay()` (keyboard-help dialog) + `bindOverviewClicks()` (delegated
  click-to-jump in overview).
- `runtime.ts` — `initDeck(root)` wires it all together and returns a `DeckHandle`
  (`controller`, `store`, `destroy`); `initAllDecks()` boots every `.as-deck` on a page.
- `styles/deck.css` — structural base: scaled fixed-aspect viewport, state-machine transitions,
  overview grid, help overlay, generic `[data-click]` reveal, reduced-motion.
- `tinykeys.d.ts` — ambient decl (tinykeys' `exports` has no `types` condition).

**`@astro-slides/core`**
- `routes/slide.astro` — rewritten: renders **all** slides of the deck as `<section>`s (current
  = `present`), sets design size from headmatter (`canvasWidth` + `aspectRatio`), includes the
  `aria-live` status region, and boots the runtime via a bundled `<script>`. `<ClientRouter />`
  removed here (returns in Phase 07). Now a dependency of `@astro-slides/client`.

**Tooling** — root `playwright.config.ts` (webServer builds + previews the example, reuses a
local server), `e2e/deck.spec.ts` (6 real-Chromium tests), `test:e2e` scripts, and a CI `e2e`
job (`playwright install --with-deps chromium`).

## How to navigate the result

- `packages/client/src/runtime.ts` — the entry the page calls; the wiring hub.
- `packages/client/src/navigation.ts` — pure nav core + the DOM controller.
- `packages/client/src/state-machine.ts` — the past/present/future contract.
- `packages/core/src/routes/slide.astro` — how a deck becomes one navigable page.
- `packages/client/src/styles/deck.css` — the structural CSS themes will layer on.
- `e2e/deck.spec.ts` — end-to-end proof of navigation/URL/overview/scaling.

## Key decisions

- **Single-page-per-route.** Each `/{deck}/{slide}` renders the whole deck (current `present`);
  in-deck nav is client-side class-toggle + `pushState`, no reload — while every slide URL stays
  a deep-linkable static page. Duplicated HTML per route is acceptable for typical decks.
- **ClientRouter removed for now.** It would double-handle `popstate` against the runtime;
  View Transitions integration is Phase 07's job, layered on the runtime's navigation.
- **Touch = Pointer Events, not `@use-gesture/core`.** One horizontal gesture doesn't earn the
  dep; `@use-gesture` is deferred to Phase 11 (drawing/pinch). Isolated in `touch.ts`.
- **Overview + help are vanilla TS, not React islands.** No genuine React state here; avoids
  pulling in React + `@astrojs/react` for a CSS-grid toggle. React islands stay planned for
  presenter mode (Phase 10). The runtime core is framework-agnostic as specified.
- **Client package `moduleResolution: "bundler"`** — matches how the browser code ships and
  resolves `exports`-only deps.
- **Step model wired, not visual.** `?step=N` drives a generic `[data-click]` →
  `.as-click-shown` contract so Phase 06's `<Click>` components drop into a live seam.

## What surprised us

- **`tinykeys` matches `event.code`**, so `"Space"` and letter keys bind reliably despite its
  space-as-sequence-separator parsing — no custom keymap needed.
- **`tinykeys`' `exports` map omits a `types` condition**, so TS can't find its bundled `.d.ts`
  under node/bundler resolution — a one-file ambient declaration was the clean fix.
- **The full stack booted on the first real `astro build`** — the runtime `<script>` bundled
  (tinykeys + nanostores + runtime = ~8 kB gzip 3.3 kB) and all 6 Playwright tests passed first run.

## Loose ends

- **View Transitions / FLIP slide morphs** → Phase 07 (and ClientRouter reintegration).
- **`<Click>`/`<Clicks>`/`<After>` components** that populate `[data-click]` → Phase 06.
- **Themes + layouts + `<FitText>`/fitty** (this phase is structurally styled only) → Phase 05.
- **Overview thumbnails** shrink content via `font-size`, not true render-scaling — good enough;
  revisit if fidelity matters.
- **Granular HMR** (swap one slide without full reload) still full-reload from Phase 03.
- **Presenter mode / multi-deck-per-page React islands** → Phase 10 (store is already per-deck).

## Stats

One new package (`@astro-slides/client`, ~11 source modules) + route rewrite + Playwright
harness. 45 new unit tests (jsdom for DOM paths), 107 total; 6 Playwright e2e tests (real
Chromium). Example `astro build` → 3 navigable routes.

---

**Workflow:** Created at phase close, before `todo/04-runtime-core/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
