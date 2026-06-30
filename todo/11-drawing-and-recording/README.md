---
title: Phase 11 — Drawing, recording, and mobile remote
status: pending
started:
ended:
---

## Goal

Three related features that all build on the sync layer from Phase 10: a freehand drawing overlay (Drauu), in-browser camera/screen recording (RecordRTC), and a phone-as-clicker remote over WebSocket. Each is independently valuable; bundled here because they all push state through `sharedState`.

## Exit criteria

- [ ] **Drawing**: Drauu-powered overlay with brush colors, stylus/line/arrow/rect/ellipse/eraser modes, undo/redo. Drawings persist to disk as SVG when `drawings.persist: true` in headmatter.
- [ ] Drawings sync across presenter/audience tabs over BroadcastChannel.
- [ ] **Recording**: in-browser capture of two streams (camera+mic via `getUserMedia`, screen via `getDisplayMedia`). User picks devices via in-app UI. Output: WebM with duration fix, optionally MP4/MKV.
- [ ] Recording UI: start/stop controls, file-naming, beforeunload guard.
- [ ] **Mobile remote**: `--remote` flag binds dev server to `0.0.0.0`, prints a QR code (via `uqr`) and a LAN URL.
- [ ] WebSocket endpoint added to the dev server; mobile route `/entry` provides a touch-friendly remote with next/prev/laser-pointer/blackout.
- [ ] Optional `--remote <password>` adds a shared-secret token to the URL.
- [ ] All three respect cross-window sync — a drawing on the presenter laptop shows on the audience screen and any connected phones.
- [ ] Tests: drawing serialization round-trip, recording produces a valid WebM, mobile-remote integration test (synthetic WebSocket client).

## Planned tasks

- Drauu integration + drawing overlay component
- Drawing persistence (`.astro-slides/drawings/<deck>/`)
- Drawing sync over BroadcastChannel
- RecordRTC integration: device picker, recording controller
- Recording UI (start/stop, device selection, format selection)
- WebSocket endpoint in dev server
- `--remote` CLI flag + QR code generation
- Mobile remote route (`/entry`) with touch-friendly controls
- Sync bridge: BroadcastChannel ↔ WebSocket fan-out

## Dependencies

- Phase 10 (presenter mode — `sharedState` is the integration point)

## Notes

Reference: `docs/reference-applications/slidev.md` § *Drawing/annotation overlay*, *Camera & recording*, *Mobile remote control*. The implementations are usable shapes; we adapt to React/Astro.

The `--tunnel` flag (Cloudflare quick-tunnel via `untun`) is **not** in scope for v1. It's a small follow-up if demand exists.

Drauu doesn't ship a React wrapper; we write one (or use the framework-agnostic API directly).

## Outcome

_Fill in when the phase closes._
