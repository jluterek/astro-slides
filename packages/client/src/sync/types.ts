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

// --- Audience engagement (Phase 19) ----------------------------------------------

/** One poll's live state. Votes are revisable until closed; keyed by anonymous client id. */
export interface PollState {
  /** client id → chosen option index. */
  votes: Record<string, number>;
  closed?: boolean;
}

/** The poll currently offered to the audience. Options come from the `<Poll>` MDX —
 * the deck island publishes them so audience phones never need the deck bundle. */
export interface ActivePoll {
  id: string;
  question: string;
  options: string[];
}

export type QaStatus = "new" | "shown" | "dismissed";

export interface QaQuestion {
  /** Client-generated id — `qa/ask` is idempotent by it (the wire can double-deliver). */
  id: string;
  text: string;
  /** Epoch ms, for ordering. */
  at: number;
  status: QaStatus;
}

/** Tally votes into per-option counts (out-of-range votes ignored). */
export function tallyVotes(poll: PollState | undefined, optionCount: number): number[] {
  const counts = new Array<number>(optionCount).fill(0);
  if (!poll) return counts;
  for (const idx of Object.values(poll.votes)) {
    if (Number.isInteger(idx) && idx >= 0 && idx < optionCount)
      counts[idx] = (counts[idx] ?? 0) + 1;
  }
  return counts;
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
  /** Poll votes per poll id (Phase 19). */
  polls: Record<string, PollState>;
  /** The poll the audience page should offer right now, or null. */
  activePoll: ActivePoll | null;
  /** Moderated audience questions (Phase 19). */
  questions: QaQuestion[];
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
  // Audience engagement (Phase 19). All idempotent — the wire can double-deliver.
  | { type: "poll/open"; poll: ActivePoll }
  | { type: "poll/close"; id: string }
  | { type: "vote"; poll: string; client: string; option: number }
  | { type: "qa/ask"; id: string; text: string; at: number }
  | { type: "qa/moderate"; id: string; status: QaStatus }
  // Transient: floats an emoji on watching windows; reduces to a no-op (not state).
  | { type: "react"; id: string; emoji: string }
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
  return {
    no,
    step,
    blackout: false,
    timer: initialTimer(),
    drawings: {},
    laser: null,
    polls: {},
    activePoll: null,
    questions: [],
  };
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
    // --- Audience engagement (Phase 19) ---------------------------------------
    case "poll/open": {
      // Idempotent: re-opening the same poll (island remount, double-delivery) is a no-op.
      if (state.activePoll?.id === action.poll.id) return state;
      const existing = state.polls[action.poll.id] ?? { votes: {} };
      return {
        ...state,
        activePoll: action.poll,
        polls: { ...state.polls, [action.poll.id]: existing },
      };
    }
    case "poll/close": {
      const poll = state.polls[action.id];
      const closed = poll ? { ...poll, closed: true } : { votes: {}, closed: true };
      return {
        ...state,
        polls: { ...state.polls, [action.id]: closed },
        activePoll: state.activePoll?.id === action.id ? null : state.activePoll,
      };
    }
    case "vote": {
      const poll = state.polls[action.poll] ?? { votes: {} };
      // Closed polls reject votes; a repeat of the same vote is a no-op (idempotent);
      // a different option from the same client REVISES the vote (one vote per client).
      if (poll.closed) return state;
      if (poll.votes[action.client] === action.option) return state;
      return {
        ...state,
        polls: {
          ...state.polls,
          [action.poll]: { ...poll, votes: { ...poll.votes, [action.client]: action.option } },
        },
      };
    }
    case "qa/ask": {
      // Idempotent by id — double-delivery must not duplicate the question.
      if (state.questions.some((q) => q.id === action.id)) return state;
      const question: QaQuestion = {
        id: action.id,
        text: action.text,
        at: action.at,
        status: "new",
      };
      return { ...state, questions: [...state.questions, question] };
    }
    case "qa/moderate": {
      const target = state.questions.find((q) => q.id === action.id);
      if (!target || target.status === action.status) return state;
      // At most one question is `shown` at a time — showing one demotes the previous.
      const questions = state.questions.map((q) => {
        if (q.id === action.id) return { ...q, status: action.status };
        if (action.status === "shown" && q.status === "shown")
          return { ...q, status: "new" as QaStatus };
        return q;
      });
      return { ...state, questions };
    }
    case "react":
      // Transient event — observers (the reactions overlay) act on the action itself.
      return state;
    case "state":
      // Merge defensively: a snapshot arriving over the wire (WebSocket JSON) may
      // predate newer fields, so backfill them rather than leaving holes.
      return {
        ...action.state,
        drawings: action.state.drawings ?? {},
        laser: action.state.laser ?? null,
        polls: action.state.polls ?? {},
        activePoll: action.state.activePoll ?? null,
        questions: action.state.questions ?? [],
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
