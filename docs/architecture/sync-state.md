# Sync state

- **Status:** stub (designed in Phase 10)
- **Owner phase:** Phase 10

The shape of state shared across presenter window, audience window, and connected mobile remotes — plus the sync protocol layered on `BroadcastChannel` (same-origin) and WebSocket (Phase 11, cross-origin/device).

## Scope

- The `SharedState` shape
- Reducer-style updates (action types)
- Channel naming (`astro-slides:<deck-id>`)
- Conflict resolution (last-write-wins for v1; deferred CRDT)
- How drawings, timer, and recording state participate

## Sketch (lands in Phase 10)

```ts
export type SharedState = {
  no: number;                 // current slide
  step: number;               // current click index within slide
  timer: {
    mode: "stopwatch" | "countdown" | "off";
    startedAt: number | null; // epoch ms
    pausedAt: number | null;
    durationMs: number | null;
  };
  blackout: boolean;
  drawings: DrawingFrame[];   // per slide
  recording: { active: boolean; kind: "screen" | "camera" | "both" } | null;
  lastUpdate: { source: ClientId; at: number };
};

export type SyncAction =
  | { type: "goto"; no: number; step?: number }
  | { type: "step"; step: number }
  | { type: "timer/start" | "timer/pause" | "timer/reset" }
  | { type: "blackout/toggle" }
  | { type: "drawing/append"; no: number; svgPath: string }
  | { type: "drawing/clear"; no: number }
  | { type: "recording/start"; kind: "screen" | "camera" | "both" }
  | { type: "recording/stop" };
```

## Channel naming

Same-origin: `BroadcastChannel("astro-slides:<deck-id>")` where `<deck-id>` is the deck's slug. Multi-deck pages avoid collisions because the channel key is per-deck.

Cross-origin (Phase 11): WebSocket gateway at `/__astro-slides/sync?deck=<deck-id>&token=<token>` fans out actions between BroadcastChannel and the WebSocket.

## Conflict resolution

- Last-write-wins. The `lastUpdate.source` and `lastUpdate.at` fields exist for debugging, not arbitration.
- Drawing appends are commutative (additive); clear is a destructive event with timestamp.
- A future CRDT-based collaborative-edit mode can slot in by replacing the channel layer — see ADR-0010.

## Open questions

- Whether the timer's `startedAt` is per-client (local) or per-deck (synced). Probably synced.
- How a late-joining mobile remote bootstraps state (snapshot on first message?).

## Change history

- 2026-06-30 — stub (Phase 01 prep). Full spec in Phase 10.
