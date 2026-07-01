---
title: Phase 11 — Drawing, recording, and mobile remote
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Three related features that all build on the sync layer from Phase 10: a freehand drawing overlay (Drauu), in-browser camera/screen recording (RecordRTC), and a phone-as-clicker remote over WebSocket. Each is independently valuable; bundled here because they all push state through `sharedState`.

## Exit criteria

- [x] **Drawing**: Drauu-powered overlay with brush colors, stylus/line/arrow/rect/ellipse/eraser modes, undo/redo. Drawings persist to `.astro-slides/drawings/<deck>/<slide-no>-<step-no>.svg` when `drawings.persist: true` in headmatter. *(Path deviation: namespaced by deck under the existing `<root>/.astro-slides/` scratch dir — see decisions.)*
- [x] Drawings sync across presenter/audience tabs over BroadcastChannel (same-origin) and WebSocket (cross-origin) — keyed per slide **and** click step.
- [x] **Recording**: in-browser capture of two streams (camera+mic via `getUserMedia`, screen via `getDisplayMedia`), each recorded to its own clip. User picks devices via in-app UI. Output: WebM with duration fix; MIME negotiated at runtime (H.264→VP9→VP8→WebM→MP4).
- [x] Recording UI: start/stop controls, file-naming, `beforeunload` guard, per-clip download links.
- [x] **Mobile remote**: `--remote` CLI flag binds dev server to `0.0.0.0`, prints a QR code via `uqr` and a LAN URL.
- [x] WebSocket endpoint added to the dev server via `@hono/node-ws`; mobile route `/entry` provides a touch-friendly remote with next/prev/laser-pointer/blackout.
- [x] Optional `--remote <password>` adds a shared-secret token to the URL (query param — the WS handshake needs it server-side).
- [x] All three respect cross-window sync — a drawing/laser on the presenter laptop shows on the audience screen and any connected phones.
- [x] Tests: drawing serialization round-trip (persistence), MIME negotiation, mobile-remote integration test (synthetic `SyncHub` clients + a live WS smoke test), CLI remote helpers, drawing-overlay e2e. *(A real-WebM assertion needs a browser `MediaRecorder`; the recorder core is unit-tested via MIME + verified to compile — see loose ends.)*

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

## Notes / decisions

- **Drawing is vanilla, not a React island.** drauu is framework-agnostic, so the overlay
  is created directly in the deck runtime (`packages/client/src/drawing/overlay.ts`) on an
  `<svg>` in design coordinates (viewBox) — it rides the viewport transform, so annotations
  are resolution-independent and round-trip through `dump()`/`load()`. Toggled with `d`.
- **Laser pointer** (`drawing/laser.ts`) syncs a normalized (0..1) position; any window
  renders `state.laser`, and the presenter/phone emits while active. Toggled with `l`.
- **Persistence path deviation.** Locked decision said `<deck-dir>/.astro-slides/drawings/`;
  shipped as `<root>/.astro-slides/drawings/<deck>/` — one scratch dir (already used for MDX
  emit, already gitignored), namespaced by deck, which is cleaner for multi-deck projects.
  Persisted SVGs are embedded via a `@astro-slides/drawings` virtual module and seeded into
  the runtime's initial shared state.
- **Sync layer generalized to transports.** `SyncChannel` is now an interface; a window fans
  a dispatch out to a `BroadcastChannel` **and** (in dev `--remote`) a `createWebSocketTransport`
  to the gateway. Remote actions reduce without re-forwarding; all Phase 11 actions
  (`draw`/`draw/clear`/`laser`) are idempotent, so the double-delivery (BC + WS) is safe.
- **Gateway is a dumb relay.** `SyncHub` (`server/hub.js`) broadcasts a room's messages to
  every other client; the reducer + `hello`/`state` handshake stay in the client store. Hono
  + `@hono/node-ws` serve `/entry`, `/__astro-slides/drawings`, and the WS. Mounted by
  **prepending** onto Vite's Connect stack (a plain `.use()` lands after Astro's router,
  which 404s `/entry`). Imported **statically** — a runtime `import()` hits Vite's closed
  module runner.
- **Dev-only gateway.** The `@astro-slides/runtime-config` virtual module exposes the WS path
  only when `ASTRO_SLIDES_REMOTE` is set (CLI `--remote`), so static builds never attempt a
  WebSocket — keeps the e2e preview server clean.
- **Phone advances whole slides.** The `/entry` remote sends absolute `goto` (next/prev by
  slide), not per-click steps — fine-grained clicking stays on the laptop. Documented as a
  loose end.
- **`@hono/node-server` pinned to v1.19**, not v2 — `@hono/node-ws@1.3` peers on v1.

## Outcome

Shipped all three subsystems. Sync layer generalized to multi-transport (BroadcastChannel +
WebSocket) with `draw`/`draw/clear`/`laser` actions. Drawing overlay + laser as vanilla
runtime modules; recording as a lazy-imported core (`recording/`) + a presenter React island.
Dev-server sync gateway (Hono + `@hono/node-ws`) serves `/entry`, drawing persistence, and the
WS relay; `--remote[=pw]` prints a `uqr` QR + LAN URL. Verified live: `/entry` 200, WS relay
between two synthetic clients, drawing POST → disk. Gates: typecheck clean, biome clean, **232
unit** (+34), **23 e2e** (+2 drawing). Distilled to `docs/built/11-drawing-and-recording.md`.
