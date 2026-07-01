---
phase: 10-presenter-mode
status: distilled
distilled: 2026-07-01
---

# Phase 10 — Presenter mode

A speaker view at `/presenter/<deck>/<n>` with the current slide, a next-slide preview
(its own click context), speaker notes, a timer, blackout, keyboard shortcuts, and a
command palette — all synced across windows over `BroadcastChannel` (ADR-0010). Archived
task notes: `todo/archive/10-presenter-mode/`.

## What shipped

**Sync layer** — `packages/client/src/sync/`
- `types.ts` — `SharedState` (`no`, `step`, `blackout`, `timer`) + a **pure `reduce`**.
  Timer syncs `startedAt` (epoch) + `elapsedBeforePause`, never a computed elapsed, so
  windows can't drift; `elapsedMs`/`displayMs` derive the display locally.
- `channel.ts` — a `BroadcastChannel` wrapper keyed `astro-slides:<deck>[:<suffix>]`;
  degrades to a no-op where BroadcastChannel is absent.
- `store.ts` — nanostore-backed shared state: local `dispatch` reduces **and** broadcasts;
  remote actions reduce **without** rebroadcasting (no echo). A join-time `hello`/`state`
  handshake lets a reloaded/late window adopt the current state.
- `time.ts` — `parseTimeString` (`"30min"`, `"1:05"`, `"2:30:00"`, bare-number minutes) +
  `formatDuration`.

**Runtime wiring** — `runtime.ts` + `navigation.ts`
- Every `.as-deck` now creates a `SyncStore`. Local navigation publishes `goto`; a remote
  `goto` applies via the new `DeckController.applyRemote` (URL *replace* — no history noise).
  `blackout` toggles a full-screen overlay. An `applyingRemote` guard prevents echo loops.
- `?as-preview` puts a window in **follow-only preview mode** on the `preview` channel — the
  presenter's next-slide iframe, driven to the *next* click independently of the main window.

**Presenter view** — `PresenterApp.tsx` (React island) + `routes/presenter.astro`
- Three resizable panes (`react-resizable-panels` v2, `autoSaveId` → localStorage): current
  slide iframe, next-slide preview iframe (`?as-preview`), notes + controls. Slide visuals
  are **iframes pointed at the normal `/[deck]/[slide]` route**, so all rendering (layouts,
  code, math, transitions) is reused for free.
- Owns a main store (drives the audience + current iframe) and a preview store (drives the
  next iframe with `nextState(current)`).
- Timer (stopwatch, or countdown from the deck's `duration:`), blackout, prev/next.
- `react-hotkeys-hook`: `→`/`Space`/`PageDown` next, `←`/`PageUp` prev, `B` blackout,
  `F` fullscreen, `K`/`/` command palette.
- `cmdk` jump-to-slide palette.

**Notes** — `packages/core/src/notes.ts`
- `renderNotes` renders the slide's trailing-comment Markdown to HTML at build time; inline
  `[click]` / `[click:N]` markers become `<span class="as-note-click" data-click="N">`
  **before** Markdown parsing (so `[click]` isn't read as a link). The presenter highlights
  the marker matching the current step.

## How to navigate the result

- `packages/client/src/sync/` — the whole shared-state + channel layer; `types.ts` first.
- `packages/client/src/runtime.ts` (bottom) — how a deck joins the channel + blackout.
- `packages/client/components/presenter/PresenterApp.tsx` — the speaker UI.
- `packages/core/src/routes/presenter.astro` — the route + per-slide props.
- `packages/core/src/notes.ts` — notes + click markers.
- `docs/architecture/sync-state.md` — the finalized state/protocol spec.

## Key decisions

- **iframes for the slide previews** — reuse the entire deck renderer instead of
  re-implementing slide rendering inside React; the previews sync via the channel, no reload.
- **Two channels** — main (`astro-slides:<deck>`) drives audience + current; `:preview`
  drives the next-slide iframe to the *next* click, satisfying "separate click context."
- **Pure reducer + epoch-based timer** — testable, and immune to cross-window clock drift.
- **`applyRemote` uses URL replace** — a follower mirrors the URL without piling up history.
- **react-resizable-panels pinned to v2** — v4 renamed the API and dropped `autoSaveId`.

## What surprised us

- **react-resizable-panels v4 is a different library** — `PanelGroup`/`PanelResizeHandle`/
  `autoSaveId` became `Group`/`Separator` with manual persistence. Pinned v2 for the
  documented, self-persisting API.
- **BroadcastChannel doesn't echo to its own instance** but *does* to sibling instances in
  the same document — the per-runtime `applyingRemote` guard is what actually stops loops.
- **A slide has exactly one notes block** (the last HTML comment, Phase 02), so multiple
  comments on one slide don't each become notes — the demo keeps one block per slide.

## Loose ends

- **Same-origin only** — the WebSocket transport + mobile remote (and drawing/recording sync
  actions) are Phase 11; the `SyncAction` union is already shaped to extend.
- **Next-preview reuses the deck runtime** — it boots a full (if follow-only) deck per iframe;
  fine for one preview, but not a lightweight render.
- **`S` (toggle layout)** from the plan isn't bound yet — pane sizes are drag-resizable and
  persisted, but there's no one-key layout preset swap.
- **Palette is jump-to-slide only** — no timer/blackout commands in it yet.
- **Timer has no visual "over time" alarm** beyond reaching 0 on countdown.
- **Presenter is dark-only** — the chrome doesn't follow the deck color scheme.

## Stats

New `packages/client/src/sync/` (types/reducer, channel, store, time) + `PresenterApp.tsx`
+ `presenter.astro` route + `presenter.css` + `core/notes.ts`; runtime/navigation gained
channel sync + blackout + `applyRemote`. Deps: `react-hotkeys-hook`, `cmdk`,
`react-resizable-panels` (v2). 198 unit tests (+17: reducer + timer drift + parseTimeString +
channel fan-out + notes markers) + 21 Playwright e2e (+4: two-way window sync,
presenter-drives-audience, blackout, notes highlight). `sync-state.md` finalized. Demo grew
to 22 slides (a stepped-notes slide + `duration:` headmatter).

---

**Workflow:** Created at phase close, before `todo/10-presenter-mode/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
