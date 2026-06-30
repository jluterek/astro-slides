---
title: Phase 11 — Drawing, recording, and mobile remote
status: pending
started:
ended:
---

## Goal

Three related features that all build on the sync layer from Phase 10: a freehand drawing overlay (Drauu), in-browser camera/screen recording (RecordRTC), and a phone-as-clicker remote over WebSocket. Each is independently valuable; bundled here because they all push state through `sharedState`.

## Exit criteria

- [ ] **Drawing**: Drauu-powered overlay with brush colors, stylus/line/arrow/rect/ellipse/eraser modes, undo/redo. Drawings persist to `<deck>/.astro-slides/drawings/<slide-no>-<step-no>.svg` when `drawings.persist: true` in headmatter.
- [ ] Drawings sync across presenter/audience tabs over BroadcastChannel (same-origin) and WebSocket (cross-origin).
- [ ] **Recording**: in-browser capture of two streams (camera+mic via `getUserMedia`, screen via `getDisplayMedia`). User picks devices via in-app UI. Output: WebM with duration fix, optionally MP4/MKV depending on browser support.
- [ ] Recording UI: start/stop controls, file-naming, `beforeunload` guard.
- [ ] **Mobile remote**: `--remote` CLI flag binds dev server to `0.0.0.0`, prints a QR code via `uqr` and a LAN URL.
- [ ] WebSocket endpoint added to the dev server via `@hono/node-ws`; mobile route `/entry` provides a touch-friendly remote with next/prev/laser-pointer/blackout.
- [ ] Optional `--remote <password>` adds a shared-secret token to the URL.
- [ ] All three respect cross-window sync — a drawing on the presenter laptop shows on the audience screen and any connected phones.
- [ ] Tests: drawing serialization round-trip, recording produces a valid WebM, mobile-remote integration test (synthetic WebSocket client).

## Locked decisions

- **Drawing engine:** `drauu` v1.0+ used directly via a ref inside a React client island. No wrapper library needed.
- **Drawing persistence path:** `<deck-dir>/.astro-slides/drawings/<slide-no>-<step-no>.svg`. `.astro-slides/` added to `.gitignore` template; users opt in to commit drawings.
- **Recording library:** `recordrtc` v5.6+, lazy-imported only when the user starts a recording.
- **WebM repair:** `@fix-webm-duration/fix`.
- **WebSocket library:** `@hono/node-ws` (Hono is already in the stack for MCP Streamable HTTP in Phase 14; reuse).
- **HTTP server for `/entry` and `/__astro-slides/sync`:** Hono routes registered alongside the dev server.
- **QR code:** `uqr` v0.1+.
- **Auth model:** `--remote` alone is open on LAN. `--remote <password>` derives a token from the password and requires it in the URL fragment. Document the security model.

## Tasks (planned)

- Drauu integration in a React client-island overlay component
- Drawing serialization to SVG + filesystem persistence
- Drawing sync over BroadcastChannel (extended with WebSocket fan-out)
- RecordRTC integration with device picker UI
- Recording UI controls (React island)
- WebSocket gateway (Hono + `@hono/node-ws`) integrated with dev server
- Mobile remote route `/entry` (touch-friendly controls)
- `--remote` CLI flag handler + QR code printing
- Sync bridge: BroadcastChannel ↔ WebSocket fan-out
- Tests for each subsystem

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| WebSocket gateway + Sync bridge | first — drawing/recording/remote all depend |
| After gateway | **Drauu overlay, RecordRTC capture, mobile remote route, --remote flag** — four parallel agents |
| Persistence + serialization | parallel with overlay |
| Tests | parallel with each subsystem |

## Dependencies

- Phase 10 (presenter mode — `sharedState` and BroadcastChannel layer)

## Risks

- **Browser MediaRecorder MIME availability varies.** Negotiate at runtime: prefer `video/webm;codecs=h264`, fallback to `video/webm;codecs=vp9`, fallback to plain `video/webm`. Document supported outputs.
- **`getUserMedia` requires HTTPS in production.** Localhost dev works on HTTP. Document this constraint for users hosting the deck.
- **Drauu in a React island.** Mount/unmount lifecycle matters — drauu instances must be cleaned up on island re-hydration. Test with HMR.
- **WebSocket auth via URL fragment:** the fragment isn't sent to servers, so token validation happens client-side. The server's WebSocket handshake validates a `Sec-WebSocket-Protocol` subprotocol or query param instead. Document.
- **`--tunnel` (Cloudflare quick-tunnel via `untun`)** is **not** in scope for v1. Mobile-remote requires same-LAN. Follow-up phase if demand exists.

## Notes

Reference: `docs/reference-applications/slidev.md` § *Drawing/annotation overlay*, *Camera & recording*, *Mobile remote control*. We adopt their patterns; the React/Hono substitution is mechanical.

## Outcome

_Fill in when the phase closes._
