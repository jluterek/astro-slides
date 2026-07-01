/**
 * Shared presenter state and the reducer that evolves it (Phase 10, ADR-0010). This is
 * the small state synced across the audience window, the presenter view, and (Phase 11)
 * mobile remotes over `BroadcastChannel`. Last-write-wins; drawings/recording are
 * deferred to Phase 11. See `docs/architecture/sync-state.md`.
 *
 * Timer drift across windows is avoided by syncing `startedAt` (epoch ms) rather than a
 * computed elapsed value — every client recomputes elapsed locally from the shared start.
 */

export type TimerMode = "stopwatch" | "countdown" | "off";

export interface TimerState {
  mode: TimerMode;
  /** Epoch ms the current run started, or null when paused/stopped. */
  startedAt: number | null;
  /** Accumulated running time from previous runs (ms). */
  elapsedBeforePause: number;
  /** Countdown length in ms (null for stopwatch/off). */
  durationMs: number | null;
}

export interface SharedState {
  no: number;
  step: number;
  blackout: boolean;
  timer: TimerState;
}

export type SyncAction =
  | { type: "goto"; no: number; step: number }
  | { type: "blackout"; on: boolean }
  | { type: "timer/start"; at: number }
  | { type: "timer/pause"; at: number }
  | { type: "timer/reset" }
  | { type: "timer/mode"; mode: TimerMode; durationMs: number | null }
  // Full-snapshot exchange so a late-joining window catches up.
  | { type: "hello" }
  | { type: "state"; state: SharedState };

export function initialTimer(
  mode: TimerMode = "off",
  durationMs: number | null = null,
): TimerState {
  return { mode, startedAt: null, elapsedBeforePause: 0, durationMs };
}

export function initialState(no = 1, step = 0): SharedState {
  return { no, step, blackout: false, timer: initialTimer() };
}

/** Pure reducer: `(state, action) -> state`. Unknown / signalling actions are no-ops. */
export function reduce(state: SharedState, action: SyncAction): SharedState {
  switch (action.type) {
    case "goto":
      return { ...state, no: action.no, step: action.step };
    case "blackout":
      return { ...state, blackout: action.on };
    case "timer/start":
      if (state.timer.startedAt != null) return state;
      return { ...state, timer: { ...state.timer, startedAt: action.at } };
    case "timer/pause": {
      if (state.timer.startedAt == null) return state;
      const elapsed = state.timer.elapsedBeforePause + (action.at - state.timer.startedAt);
      return { ...state, timer: { ...state.timer, startedAt: null, elapsedBeforePause: elapsed } };
    }
    case "timer/reset":
      return { ...state, timer: { ...state.timer, startedAt: null, elapsedBeforePause: 0 } };
    case "timer/mode":
      return {
        ...state,
        timer: {
          mode: action.mode,
          startedAt: null,
          elapsedBeforePause: 0,
          durationMs: action.durationMs,
        },
      };
    case "state":
      return action.state;
    default:
      return state;
  }
}

/** Running elapsed time (ms) at `now`, accounting for pause accumulation. */
export function elapsedMs(timer: TimerState, now: number): number {
  return timer.startedAt != null
    ? timer.elapsedBeforePause + (now - timer.startedAt)
    : timer.elapsedBeforePause;
}

/** Remaining time for a countdown (ms, clamped at 0); elapsed for stopwatch. */
export function displayMs(timer: TimerState, now: number): number {
  const elapsed = elapsedMs(timer, now);
  if (timer.mode === "countdown" && timer.durationMs != null) {
    return Math.max(0, timer.durationMs - elapsed);
  }
  return elapsed;
}
