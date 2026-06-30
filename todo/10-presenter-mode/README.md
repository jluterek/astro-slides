---
title: Phase 10 — Presenter mode
status: pending
started:
ended:
---

## Goal

Ship a presenter view that gives a speaker everything they need: current slide, next slide (with its own click context, so the preview shows the *next click's* result), speaker notes, a timer, and cross-window state sync. ADR-0010 mandates BroadcastChannel for same-origin sync; WebSocket lands in Phase 11 along with mobile remote.

## Exit criteria

- [ ] Route `/presenter/:deck/:n` renders the speaker view.
- [ ] Three-pane grid: current slide, next slide, notes + controls. Pane sizes persist in `localStorage`.
- [ ] Next-slide preview uses a *separate* `ClicksContext` so it shows the result of the next click, not the current click.
- [ ] Speaker notes rendered from the slide AST (the trailing HTML comment per Phase 02), with markdown formatting.
- [ ] Notes contain inline click markers (`[click]`, `[click:3]`) — the current click's marker is highlighted.
- [ ] Timer: stopwatch and countdown modes; respects `duration: "30min"` frontmatter from the deck headmatter.
- [ ] BroadcastChannel sync: opening `/presenter` and `/` in two tabs of the same origin syncs current slide, current step, timer state, and any drawing state (Phase 11).
- [ ] Keyboard shortcuts for the speaker: `S` to toggle pane layout, `B` to blackout, `F` for fullscreen, plus the standard navigation keys.
- [ ] Tests: e2e Playwright test that opens both tabs, asserts sync of slide changes from each side.

## Planned tasks

- Presenter route + base layout
- Three-pane grid with persistent sizing
- Next-slide preview with separate ClicksContext
- Speaker-notes renderer
- Timer composable + UI
- `sharedState` model (slide, step, timer, blackout)
- BroadcastChannel sync layer
- Presenter keyboard shortcuts
- Blackout / "show black screen" mode
- E2E sync tests

## Dependencies

- Phase 04 (runtime core — navigation drives the shared state)
- Phase 05 (layouts — presenter view is a layout)
- Phase 06 (click model — next-slide preview needs the per-click plan)

## Notes

Reference: `docs/reference-applications/slidev.md` § *Presenter mode* — the resizable-grid + separate-click-context pattern is exactly what we want. `docs/reference-applications/spectacle.md` § *Code patterns worth studying* / *BroadcastChannel sync* — the sync code is small and direct.

Cross-device control (phone-as-clicker) is Phase 11. This phase is intentionally same-origin only.

## Outcome

_Fill in when the phase closes._
