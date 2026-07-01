---
title: Phase 10 — Presenter mode
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Ship a presenter view that gives a speaker everything they need: current slide, next slide (with its own click context, so the preview shows the *next click's* result), speaker notes, a timer, and cross-window state sync. ADR-0010 mandates BroadcastChannel for same-origin sync; WebSocket lands in Phase 11 along with mobile remote.

## Exit criteria

- [x] Route `/presenter/[deck]/[slide]` renders the speaker view.
- [x] Three-pane grid: current slide, next slide, notes + controls. Pane sizes persist in `localStorage` (`react-resizable-panels` `autoSaveId`).
- [x] Next-slide preview uses a *separate* click context (the `preview` channel) so it shows the next click's result.
- [x] Speaker notes rendered from the slide AST trailing comment, with markdown formatting.
- [x] Notes inline click markers (`[click]`, `[click:3]`) — the current step's marker is highlighted.
- [x] Timer: stopwatch and countdown modes; countdown respects `duration:` headmatter.
- [x] BroadcastChannel sync: two same-origin windows sync current slide + step + timer + blackout. (Drawings deferred to Phase 11.)
- [x] `docs/architecture/sync-state.md` finalized.
- [x] Keyboard shortcuts (`react-hotkeys-hook`): nav keys + `B` blackout, `F` fullscreen, `K`/`/` palette. (`S` layout-toggle deferred — see loose ends.)
- [x] Command palette (`cmdk`) for jump-to-slide.
- [x] Playwright e2e: two windows sync slide changes both ways, presenter drives audience, blackout, notes.

> **Deviation:** `react-resizable-panels` pinned to **v2** (documented `PanelGroup`/`autoSaveId`
> API) — v4 renamed everything and dropped auto-persistence. `S` (toggle pane layout) is a
> deferred loose end; pane sizes are drag-resizable + persisted.

## Locked decisions

- **Presenter UI:** React island (it's interactive).
- **Cross-window state:** `nanostores` + `BroadcastChannel`. Same-origin only in this phase.
- **Keyboard (presenter UI):** `react-hotkeys-hook` v5+ for component-scoped bindings.
- **Command palette:** `cmdk` v1.1+ (unstyled, composable, ships its own scorer).
- **Notes parsing:** the last HTML comment per slide (parsed in Phase 02). Markdown-rendered server-side; click markers injected during render.
- **Timer:** stopwatch and countdown modes. Duration parsed from `duration:` headmatter using a small `parseTimeString` utility (`"30min"`, `"1:05"`, `"2:30"`).
- **Pane layout persistence:** `localStorage` keyed by deck slug.

## Tasks (planned)

- Presenter route + base layout
- Three-pane grid with persistent sizing (React + `nanostores`)
- Next-slide preview with separate click context
- Speaker-notes renderer (markdown → HTML at parse time; click markers at render)
- Timer composable + UI
- `sharedState` nanostore (slide, step, timer, blackout)
- BroadcastChannel sync layer wired to nanostore
- Presenter keyboard shortcuts (`react-hotkeys-hook`)
- Command palette (`cmdk`) with goto-slide entries
- Blackout / "show black screen" mode
- E2E sync test

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| `sharedState` design + sync-state.md spec | first — everything binds to this |
| After state design | **three-pane grid, next-slide preview, notes renderer, timer, blackout, keyboard, command palette** — seven parallel agents possible |
| BroadcastChannel sync layer | after grid + state |
| E2E test | after sync layer |

## Dependencies

- Phase 04 (runtime core — navigation drives shared state)
- Phase 05 (layouts — presenter view is a layout)
- Phase 06 (click model — next-slide preview needs the per-click plan)

## Risks

- **Pane resizing UX with React.** Plenty of libraries exist (`react-resizable-panels` is the modern pick) — consider adding to the dependency matrix if hand-rolling drag handles is too much.
- **Notes click markers escape rules.** The `[click]` syntax inside notes must not collide with author content. Mitigation: only match `[click]` / `[click:N]` at line start or after whitespace, and require markdown rendering to preserve them as elements with a class.
- **Timer drift across windows.** Sync timer with `startedAt` (epoch ms) rather than computed elapsed — clients recompute locally from the shared start time.

## Notes

Reference: `docs/reference-applications/slidev.md` § *Presenter mode* — the resizable-grid + separate-click-context pattern is exactly what we want. `docs/reference-applications/spectacle.md` § *Code patterns worth studying* / *BroadcastChannel sync*.

Cross-device control (phone-as-clicker) is Phase 11.

## Outcome

Shipped. Presenter view at `/presenter/[deck]/[slide]`: three resizable panes (current +
next iframes, notes + controls), timer (stopwatch/countdown from `duration:`), blackout,
`react-hotkeys-hook` shortcuts, `cmdk` jump-to-slide palette. Cross-window sync over
`BroadcastChannel` — a pure-reducer `SharedState` (slide/step/blackout/timer) with a
hello/state handshake and a separate `preview` channel for the next-click context; the deck
runtime publishes/follows `goto` and toggles a blackout overlay. Notes rendered at build time
with highlightable `[click]` markers. `react-resizable-panels` pinned to v2 (v4 renamed the
API). 198 unit + 21 e2e green; demo grew to 22 slides. `sync-state.md` finalized. Distilled →
`docs/built/10-presenter-mode.md`.
