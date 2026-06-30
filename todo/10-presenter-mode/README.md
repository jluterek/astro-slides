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
- [ ] Next-slide preview uses a *separate* click context so it shows the result of the next click, not the current click.
- [ ] Speaker notes rendered from the slide AST (the trailing HTML comment per Phase 02), with markdown formatting.
- [ ] Notes contain inline click markers (`[click]`, `[click:3]`) — the current click's marker is highlighted.
- [ ] Timer: stopwatch and countdown modes; respects `duration: "30min"` frontmatter from the deck headmatter.
- [ ] BroadcastChannel sync: opening `/presenter` and `/` in two tabs of the same origin syncs current slide, current step, timer state, and any drawing state (Phase 11).
- [ ] `docs/architecture/sync-state.md` finalized.
- [ ] Keyboard shortcuts for the speaker (via `react-hotkeys-hook`): `S` toggle pane layout, `B` blackout, `F` fullscreen, plus the standard navigation keys.
- [ ] Optional command palette (`cmdk`) for fast navigation across slides.
- [ ] Tests: Playwright e2e test that opens both tabs, asserts sync of slide changes from each side.

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

_Fill in when the phase closes._
