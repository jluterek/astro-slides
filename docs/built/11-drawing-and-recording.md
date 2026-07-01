---
phase: 11-drawing-and-recording
status: distilled
distilled: 2026-07-01
---

# Phase 11 — Drawing, recording, and mobile remote

Three features that all push state through the Phase 10 sync layer: a freehand **drawing
overlay** (drauu) with a **laser pointer**, in-browser **recording** (RecordRTC), and a
**phone-as-remote** over a dev-server WebSocket **gateway**. Archived task notes:
`todo/archive/11-drawing-and-recording/`.

## What shipped

**Sync layer, generalized** — `packages/client/src/sync/`
- `SyncChannel` is now a transport interface. `store.ts` fans a local `dispatch` out to
  **every** channel — same-origin `BroadcastChannel` **plus** (in dev `--remote`) a
  `createWebSocketTransport` (`websocket.ts`) to the gateway. Remote actions reduce
  **without** re-forwarding; the new actions (`draw`, `draw/clear`, `laser`) are all
  idempotent, so double-delivery (BC + WS) is harmless.
- `SharedState` gained `drawings` (keyed `"<no>:<step>"` → drauu SVG) and `laser` (a
  normalized 0..1 point, or null). The `state` snapshot backfills both, so a wire snapshot
  that predates them still reduces cleanly.
- The WebSocket transport reconnects with backoff and buffers posts made before it opens.

**Drawing overlay** — `packages/client/src/drawing/` (vanilla, not a React island)
- `overlay.ts` mounts drauu on an `<svg>` in the deck's **design coordinate space**
  (viewBox), so it rides the viewport transform and annotations are resolution-independent
  and round-trip through `dump()`/`load()`. A floating toolbar has stylus/pen/line/arrow/
  rect/ellipse/eraser modes, six colors, undo/redo/clear. Toggle with `d`.
- Committing a stroke dispatches `draw` for the current slide-step; switching slides loads
  that step's stored SVG. `persist` POSTs the SVG to the gateway.
- `laser.ts` renders `state.laser` as a dot; holding laser mode (`l`) emits throttled
  normalized positions.

**Recording** — `packages/client/src/recording/` + `components/recording/RecordingControls.tsx`
- `mime.ts` negotiates a MIME at runtime (H.264-in-WebM → VP9 → VP8 → WebM → MP4); pure +
  unit-tested. `recorder.ts` **lazy-imports** recordrtc + `@fix-webm-duration/fix` only when
  recording starts, captures screen (`getDisplayMedia`) and/or camera+mic (`getUserMedia`)
  as **separate clips**, and repairs the WebM duration on stop.
- The presenter island adds a device picker, screen/camera toggles, file-name stem, a
  `beforeunload` guard while recording, and per-clip download links.

**Sync gateway + mobile remote** — `packages/core/src/server/`
- `hub.ts` — `SyncHub`, a transport-agnostic room relay (broadcast to all-but-sender);
  unit-tested with synthetic clients.
- `gateway.ts` — a Hono app (`@hono/node-ws`) serving `/entry`, `POST /__astro-slides/drawings`
  (→ `saveDrawing`), and the `/__astro-slides/sync` WebSocket. Optional shared-secret token.
- `entry-page.ts` — a self-contained touch remote (prev/next, blackout, laser pad).
- Wired in `vite-plugin.ts` `configureServer` (only under `--remote`): the WS attaches to the
  dev server's Node `httpServer`; the HTTP routes are **prepended** onto Vite's Connect stack.
- CLI (`packages/cli/src/main.ts`) `dev --remote[=password]` binds `0.0.0.0`, sets the env the
  integration reads, and prints a `uqr` QR + LAN URL. `deriveToken`/`buildRemoteUrl`/
  `lanAddress` are pure + tested.

## How to navigate the result

- `packages/client/src/sync/websocket.ts` + `store.ts` — the multi-transport fan-out.
- `packages/client/src/drawing/` — overlay + laser (start with `overlay.ts`).
- `packages/client/src/recording/` — `mime.ts` (pure) then `recorder.ts` (lazy core).
- `packages/core/src/server/` — `hub.ts` (relay), `gateway.ts` (routes + WS), `entry-page.ts`.
- `packages/core/src/vite-plugin.ts` (`mountGateway`) — how it all attaches to the dev server.
- `docs/architecture/sync-state.md` — the state/protocol spec, updated for Phase 11.

## Key decisions

- **drauu is vanilla, so drawing lives in the deck runtime**, not a hydrated island — it
  layers over every deck for free and toggles with a key.
- **Design-coordinate SVG surface** — annotations are resolution-independent and their SVG
  dump renders identically at any window size.
- **Sync layer became transport-agnostic** — one `dispatch` fans out to BroadcastChannel +
  WebSocket; idempotent actions make the redundancy safe.
- **Gateway is a dumb relay** — the reducer + `hello`/`state` handshake stay client-side; the
  server never parses payloads.
- **Static gateway import + Connect-stack prepend** — a runtime `import()` hits Vite's closed
  module runner, and a plain `.use()` lands after Astro's 404 router.
- **Dev-only WS advertisement** via the `@astro-slides/runtime-config` virtual module, so
  static builds never open a socket.
- **Persistence under `<root>/.astro-slides/drawings/<deck>/`** (gitignored), a deviation from
  the per-deck-dir path in the plan — one scratch dir, namespaced by deck.

## What surprised us

- **A runtime `import()` from an integration throws "Vite module runner has been closed"** —
  the same limitation the code already notes for the Shiki setup loader. The gateway had to be
  a static import.
- **A plain `server.middlewares.use()` runs *after* Astro's SSR router**, which 404s `/entry`
  before we see it. Prepending onto `server.middlewares.stack` fixes the order.
- **`@hono/node-ws@1.3` peers on `@hono/node-server@^1.19`, not v2** — pinned v1.19.
- **The bin runs `main.ts` under Node type-stripping**, which can't resolve a relative
  `./remote.js` to a `.ts` file — so the remote helpers had to stay inlined in the
  self-contained `main.ts`.

## Loose ends

- **Recording isn't e2e-tested** — a real WebM assertion needs a browser `MediaRecorder`; only
  the MIME negotiation is unit-tested and the recorder core is verified to compile.
- **The phone remote advances whole slides** (absolute `goto`), not per-click steps.
- **Camera + screen are separate clips**, not a composited picture-in-picture.
- **Gateway auth is LAN-convenience only** — a URL-query token, not a security boundary; no
  TLS (`getUserMedia`/recording needs HTTPS in production, localhost excepted).
- **`--tunnel` (public URL) is explicitly out of scope** — same-LAN only for v1.
- **No drawing/recording demo slide** was added to the example deck (defaults enable drawing);
  kept out to avoid renumbering the e2e fixtures.

## Stats

New `packages/client/src/sync/websocket.ts`, `drawing/` (overlay + laser), `recording/`
(mime + recorder) + `RecordingControls.tsx`; `packages/core/src/server/` (hub + gateway +
entry-page) + `drawing/persistence.ts`; `@astro-slides/drawings` + `@astro-slides/runtime-config`
virtual modules; CLI `--remote`. Deps: `drauu`, `recordrtc`, `@fix-webm-duration/fix`, `hono`,
`@hono/node-ws`, `@hono/node-server`, `uqr`. **232 unit tests** (+34: drawing/laser reducer,
WebSocket transport, MIME, `normalizePointer`, `SyncHub`, drawing persistence, entry page, CLI
remote) + **23 Playwright e2e** (+2: drawing overlay toggle, cross-window annotation sync).
Verified live: `/entry` 200, WS relay, drawing POST → disk.

---

**Workflow:** Created at phase close, before `todo/11-drawing-and-recording/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
