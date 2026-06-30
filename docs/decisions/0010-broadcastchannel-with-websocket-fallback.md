# 0010. BroadcastChannel for same-origin sync, WebSocket for remote

- **Status:** accepted
- **Date:** 2026-06-30

## Context

The presenter mode needs cross-window state sync: the current slide and step, the timer, drawings, optional cursor position. Sometimes it's two tabs on one laptop (audience window + presenter view). Sometimes it's a phone in the speaker's hand controlling a projector. The mechanisms in the reference field:

- **BroadcastChannel** (Spectacle, Slidev default) — same-origin only. Open a second tab, both subscribe to a channel, messages flow. Zero infrastructure.
- **postMessage with heartbeat** (reveal.js speaker view) — opens a popup with `window.open`, posts messages to it, popup heartbeats back so the host can reconnect after reload. Works cross-window but not cross-device.
- **localStorage `storage` event** (MDX Deck) — fires on other tabs when localStorage changes. Same-origin, hacky, but works.
- **WebSocket** (Slidev with `--remote`, via `vite-plugin-vue-server-ref`) — cross-origin and cross-device. Needs a server process.
- **WebRTC / Socket.IO / Y.js** — overkill for v1; needed if we ever want collaborative editing.

The 95% case is "two tabs on the same laptop" — that case should be zero-config, zero-infrastructure. The remaining 5% (mobile remote, cross-device projector) needs a real network path.

## Decision

- **Default:** `BroadcastChannel`. Same-origin tabs and windows sync over a channel keyed by deck identifier. No server, no setup.
- **Remote mode:** When the dev server is bound to `0.0.0.0` (e.g., `astro-slides dev --remote`), the MCP/dev server process also exposes a **WebSocket endpoint** for cross-origin clients (typically a phone on the LAN). State updates fan out from the WebSocket to all BroadcastChannel subscribers and vice versa.
- **No third-party sync library.** No Y.js, no Automerge, no Socket.IO in v1. The state we sync is small (current slide, step, timer, drawings) and a hand-rolled diff is fine.

The drawing layer (drauu) syncs over the same channel — drawings are part of `sharedState`.

## Consequences

- The same-origin presenter case is zero-infrastructure. Open `/presenter` in a new tab, it just works.
- The mobile-remote case has a real network path with auth (a session token derived from the `--remote` flag, optionally `--remote <password>`).
- The same `syncState` abstraction backs both transports, so application code doesn't care which is active.
- Trade-off: no collaborative editing in v1. CRDT can layer on later by adding a sync method to the same seam.
- Trade-off: remote mode requires the user's laptop to be reachable from the phone. Slidev's Cloudflare quick-tunnel pattern (`untun`) is a reasonable opt-in for when that's not the case — defer to a future decision.
- Trade-off: BroadcastChannel browser support is solid in evergreen browsers but absent in some embedded webviews. Documented as a limitation.
