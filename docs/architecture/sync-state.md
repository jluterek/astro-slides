# Sync state

- **Status:** implemented (Phase 10)
- **Owner phase:** Phase 10
- **Code:** `packages/client/src/sync/` (`types.ts`, `channel.ts`, `store.ts`, `time.ts`)

The state shared across the presenter window, audience window, and (Phase 11) mobile remotes, plus the sync protocol layered on `BroadcastChannel` (same-origin) and WebSocket (Phase 11, cross-origin/device).

## `SharedState` (as shipped)

Phase 10 syncs the small, always-present slice; Phase 11 adds drawing + laser fields and
action types on the same channel.

```ts
export interface TimerState {
  mode: "stopwatch" | "countdown" | "off";
  startedAt: number | null;    // epoch ms of the current run (null = paused/stopped)
  elapsedBeforePause: number;  // ms accumulated across previous runs
  durationMs: number | null;   // countdown length
}

export interface SharedState {
  no: number;      // current slide
  step: number;    // current click index within the slide
  blackout: boolean;
  timer: TimerState;
  drawings: Record<string, string>;   // Phase 11: "<no>:<step>" -> drauu SVG dump
  laser: { x: number; y: number } | null;  // Phase 11: normalized 0..1, or off
}

export type SyncAction =
  | { type: "goto"; no: number; step: number }
  | { type: "blackout"; on: boolean }
  | { type: "timer/start"; at: number }        // `at` = epoch ms (keeps the reducer pure)
  | { type: "timer/pause"; at: number }
  | { type: "timer/reset" }
  | { type: "timer/mode"; mode: TimerMode; durationMs: number | null }
  | { type: "draw"; key: string; svg: string } // Phase 11: set one slide-step's annotation
  | { type: "draw/clear"; key: string }
  | { type: "laser"; point: { x: number; y: number } | null }
  | { type: "hello" }                          // join handshake: request a snapshot
  | { type: "state"; state: SharedState };     // snapshot reply
```

`reduce(state, action)` is a pure function (unit-tested). Local `dispatch` reduces **and**
broadcasts; received actions reduce **without** re-broadcasting, so there is no echo loop. Every
Phase 11 action is idempotent (`draw`/`laser` set values), which is what makes fanning the same
dispatch out to two transports (BroadcastChannel **and** WebSocket) safe.

## Timer drift

The timer syncs `startedAt` (epoch ms) and `elapsedBeforePause`, never a computed elapsed value. Every window recomputes `elapsedMs = elapsedBeforePause + (now - startedAt)` locally, so clocks can't drift apart. `displayMs` derives the countdown remainder from the same fields.

## Channel naming

Same-origin: `BroadcastChannel("astro-slides:<deck-id>")`, per-deck so multi-deck pages don't collide. The presenter's **next-slide preview** uses a separate `astro-slides:<deck-id>:preview` channel so it can be driven to the *next* click independently of the main window.

Cross-origin (Phase 11): a window in dev `--remote` also joins a WebSocket to the sync gateway (`createWebSocketTransport`), using the same room key (`?deck=<id>&suffix=<suffix>`). The gateway (`SyncHub`) is a dumb relay — it broadcasts a room's messages to every other client and never parses payloads, so the reducer + `hello`/`state` handshake stay entirely client-side. A phone at `/entry` is just another client on that room.

## Join / reconnect

On creation a window posts `hello`; any publishing peer replies with a `state` snapshot, so a freshly-opened or reloaded window adopts the current slide/step/timer/blackout. Follow-only windows (the preview iframe) set `publish: false` and never answer `hello`.

## Wiring

- **Runtime** (`runtime.ts`): each `.as-deck` creates a `SyncStore`. Local navigation publishes `goto`; remote `goto` is applied via `DeckController.applyRemote` (URL replace, no history entry). `blackout` toggles a full-screen overlay. `?as-preview` puts the window in follow-only mode on the `preview` channel. In dev `--remote` (advertised via the `@astro-slides/runtime-config` virtual module) the store also gets a WebSocket transport. Drawing (`drawing/overlay.ts`) and laser (`drawing/laser.ts`) dispatch `draw`/`laser` and render from state.
- **Presenter** (`PresenterApp.tsx`): owns a main store (drives the audience + current iframe) and a preview store (drives the next iframe with `nextState(current)`), plus the timer/blackout controls and the recording island.
- **Gateway** (`packages/core/src/server/`): `SyncHub` relay + a Hono app (`@hono/node-ws`) serving `/entry`, `POST /__astro-slides/drawings`, and the `/__astro-slides/sync` WebSocket. Mounted in the dev server only under `--remote`, prepended onto Vite's Connect stack.

## Conflict resolution

Last-write-wins; the small state and human-paced actions make arbitration unnecessary. A future CRDT collaborative-edit mode can replace the channel layer — see ADR-0010.

## Change history

- 2026-06-30 — stub (Phase 01 prep).
- 2026-07-01 — implemented in Phase 10: `SharedState` (slide/step/blackout/timer), pure reducer, BroadcastChannel transport, hello/state handshake, preview channel.
- 2026-07-01 — Phase 11: `drawings`/`laser` state + `draw`/`draw/clear`/`laser` actions; `SyncChannel` generalized to a transport interface with multi-transport fan-out; WebSocket transport + `SyncHub` gateway relay + `/entry` mobile remote.
