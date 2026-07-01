# Sync state

- **Status:** implemented (Phase 10)
- **Owner phase:** Phase 10
- **Code:** `packages/client/src/sync/` (`types.ts`, `channel.ts`, `store.ts`, `time.ts`)

The state shared across the presenter window, audience window, and (Phase 11) mobile remotes, plus the sync protocol layered on `BroadcastChannel` (same-origin) and WebSocket (Phase 11, cross-origin/device).

## `SharedState` (as shipped)

Phase 10 syncs the small, always-present slice; drawings and recording arrive in Phase 11 as additional action types on the same channel.

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
}

export type SyncAction =
  | { type: "goto"; no: number; step: number }
  | { type: "blackout"; on: boolean }
  | { type: "timer/start"; at: number }        // `at` = epoch ms (keeps the reducer pure)
  | { type: "timer/pause"; at: number }
  | { type: "timer/reset" }
  | { type: "timer/mode"; mode: TimerMode; durationMs: number | null }
  | { type: "hello" }                          // join handshake: request a snapshot
  | { type: "state"; state: SharedState };     // snapshot reply
```

`reduce(state, action)` is a pure function (unit-tested). Local `dispatch` reduces **and** broadcasts; received actions reduce **without** re-broadcasting, so there is no echo loop.

## Timer drift

The timer syncs `startedAt` (epoch ms) and `elapsedBeforePause`, never a computed elapsed value. Every window recomputes `elapsedMs = elapsedBeforePause + (now - startedAt)` locally, so clocks can't drift apart. `displayMs` derives the countdown remainder from the same fields.

## Channel naming

Same-origin: `BroadcastChannel("astro-slides:<deck-id>")`, per-deck so multi-deck pages don't collide. The presenter's **next-slide preview** uses a separate `astro-slides:<deck-id>:preview` channel so it can be driven to the *next* click independently of the main window.

Cross-origin (Phase 11): a WebSocket gateway fans actions between the BroadcastChannel and remote clients.

## Join / reconnect

On creation a window posts `hello`; any publishing peer replies with a `state` snapshot, so a freshly-opened or reloaded window adopts the current slide/step/timer/blackout. Follow-only windows (the preview iframe) set `publish: false` and never answer `hello`.

## Wiring

- **Runtime** (`runtime.ts`): each `.as-deck` creates a `SyncStore`. Local navigation publishes `goto`; remote `goto` is applied via `DeckController.applyRemote` (URL replace, no history entry). `blackout` toggles a full-screen overlay. `?as-preview` puts the window in follow-only mode on the `preview` channel.
- **Presenter** (`PresenterApp.tsx`): owns a main store (drives the audience + current iframe) and a preview store (drives the next iframe with `nextState(current)`), plus the timer/blackout controls.

## Conflict resolution

Last-write-wins; the small state and human-paced actions make arbitration unnecessary. A future CRDT collaborative-edit mode can replace the channel layer — see ADR-0010.

## Deferred to Phase 11

- Drawing frames (`drawing/append`, `drawing/clear`) and recording state on the same channel.
- The WebSocket transport + mobile remote bootstrap.

## Change history

- 2026-06-30 — stub (Phase 01 prep).
- 2026-07-01 — implemented in Phase 10: `SharedState` (slide/step/blackout/timer), pure reducer, BroadcastChannel transport, hello/state handshake, preview channel.
