/**
 * Shared presenter state and the reducer that evolves it (Phase 10, ADR-0010). This is
 * the small state synced across the audience window, the presenter view, and (Phase 11)
 * mobile remotes — over `BroadcastChannel` (same-origin) and WebSocket (cross-origin).
 * Last-write-wins. See `docs/architecture/sync-state.md`.
 *
 * Timer drift across windows is avoided by syncing `startedAt` (epoch ms) rather than a
 * computed elapsed value — every client recomputes elapsed locally from the shared start.
 *
 * Phase 11 adds drawing + laser state. `drawings` is keyed `"<no>:<step>"` so an
 * annotation belongs to a specific slide + click step; the SVG payload is drauu's
 * `dump()`. `laser` is a normalized (0..1) pointer position, or null when off.
 */

export type TimerMode = "stopwatch" | "countdown" | "off";

/** Normalized pointer position (0..1 of the slide box), resolution-independent. */
export interface LaserPoint {
  x: number;
  y: number;
}

/** Key a drawing by slide number + click step: `"<no>:<step>"`. */
export function drawingKey(no: number, step: number): string {
  return `${no}:${step}`;
}

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
  /** Persisted annotations keyed `"<no>:<step>"` → drauu SVG dump. */
  drawings: Record<string, string>;
  /** Live laser-pointer position (normalized), or null when off. */
  laser: LaserPoint | null;
}

export type SyncAction =
  | { type: "goto"; no: number; step: number }
  | { type: "blackout"; on: boolean }
  | { type: "timer/start"; at: number }
  | { type: "timer/pause"; at: number }
  | { type: "timer/reset" }
  | { type: "timer/mode"; mode: TimerMode; durationMs: number | null }
  // Drawing + laser (Phase 11). `draw` sets/replaces one slide-step's SVG.
  | { type: "draw"; key: string; svg: string }
  | { type: "draw/clear"; key: string }
  | { type: "laser"; point: LaserPoint | null }
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
  return { no, step, blackout: false, timer: initialTimer(), drawings: {}, laser: null };
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
      // Idempotent: re-declaring the current mode (e.g. a presenter window
      // remounting mid-talk) must NOT reset a running timer across windows.
      if (state.timer.mode === action.mode && state.timer.durationMs === action.durationMs)
        return state;
      return {
        ...state,
        timer: {
          mode: action.mode,
          startedAt: null,
          elapsedBeforePause: 0,
          durationMs: action.durationMs,
        },
      };
    case "draw":
      return { ...state, drawings: { ...state.drawings, [action.key]: action.svg } };
    case "draw/clear": {
      if (!(action.key in state.drawings)) return state;
      const { [action.key]: _removed, ...rest } = state.drawings;
      return { ...state, drawings: rest };
    }
    case "laser":
      return { ...state, laser: action.point };
    case "state":
      // Merge defensively: a snapshot arriving over the wire (WebSocket JSON) may
      // predate the drawings/laser fields, so backfill them rather than leaving holes.
      return {
        ...action.state,
        drawings: action.state.drawings ?? {},
        laser: action.state.laser ?? null,
      };
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
