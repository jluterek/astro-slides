import { describe, expect, it } from "vitest";
import { channelName } from "../sync/channel.js";
import {
  displayMs,
  drawingKey,
  elapsedMs,
  initialState,
  initialTimer,
  reduce,
  type SharedState,
  type SyncAction,
  type SyncChannel,
} from "../sync/index.js";
import { createSyncStore } from "../sync/store.js";
import { formatDuration, parseTimeString } from "../sync/time.js";
import { tallyVotes } from "../sync/types.js";

describe("parseTimeString", () => {
  it("parses unit suffixes", () => {
    expect(parseTimeString("30min")).toBe(30 * 60_000);
    expect(parseTimeString("90s")).toBe(90_000);
    expect(parseTimeString("2h")).toBe(2 * 3_600_000);
    expect(parseTimeString("500ms")).toBe(500);
  });
  it("parses clock forms", () => {
    expect(parseTimeString("1:05")).toBe(65_000);
    expect(parseTimeString("2:30:00")).toBe((2 * 3600 + 30 * 60) * 1000);
  });
  it("treats a bare number as minutes", () => {
    expect(parseTimeString(30)).toBe(30 * 60_000);
  });
  it("returns null for junk / empty / null", () => {
    expect(parseTimeString("soon")).toBeNull();
    expect(parseTimeString("")).toBeNull();
    expect(parseTimeString(null)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats under and over an hour", () => {
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_661_000)).toBe("1:01:01");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("reduce", () => {
  it("applies goto and blackout", () => {
    let s = reduce(initialState(1, 0), { type: "goto", no: 4, step: 2 });
    expect(s).toMatchObject({ no: 4, step: 2 });
    s = reduce(s, { type: "blackout", on: true });
    expect(s.blackout).toBe(true);
  });

  it("accumulates timer elapsed across start/pause without drift", () => {
    let s: SharedState = { ...initialState(), timer: initialTimer("stopwatch") };
    s = reduce(s, { type: "timer/start", at: 1000 });
    expect(elapsedMs(s.timer, 4000)).toBe(3000);
    s = reduce(s, { type: "timer/pause", at: 4000 });
    expect(elapsedMs(s.timer, 9999)).toBe(3000); // frozen while paused
    s = reduce(s, { type: "timer/start", at: 5000 });
    expect(elapsedMs(s.timer, 6000)).toBe(4000); // resumes from accumulated
  });

  it("ignores a second start while running", () => {
    let s = reduce({ ...initialState(), timer: initialTimer() }, { type: "timer/start", at: 1000 });
    s = reduce(s, { type: "timer/start", at: 2000 });
    expect(s.timer.startedAt).toBe(1000);
  });

  it("computes countdown remaining via displayMs", () => {
    let s: SharedState = {
      ...initialState(),
      timer: { mode: "countdown", startedAt: null, elapsedBeforePause: 0, durationMs: 10_000 },
    };
    s = reduce(s, { type: "timer/start", at: 0 });
    expect(displayMs(s.timer, 3000)).toBe(7000);
    expect(displayMs(s.timer, 99_000)).toBe(0); // clamped
  });

  it("adopts a full snapshot via the `state` action", () => {
    const snap = { ...initialState(7, 1), blackout: true };
    expect(reduce(initialState(), { type: "state", state: snap })).toEqual(snap);
  });

  it("backfills drawings/laser when a snapshot predates them", () => {
    // A snapshot arriving over the wire may lack the Phase 11 fields.
    const legacy = { no: 2, step: 0, blackout: false, timer: initialTimer() } as SharedState;
    const s = reduce(initialState(), { type: "state", state: legacy });
    expect(s.drawings).toEqual({});
    expect(s.laser).toBeNull();
  });

  it("sets, replaces, and clears drawings by slide-step key", () => {
    const key = drawingKey(3, 1);
    expect(key).toBe("3:1");
    let s = reduce(initialState(), { type: "draw", key, svg: "<path/>" });
    expect(s.drawings[key]).toBe("<path/>");
    s = reduce(s, { type: "draw", key, svg: "<path d='m'/>" }); // last-write-wins
    expect(s.drawings[key]).toBe("<path d='m'/>");
    s = reduce(s, { type: "draw/clear", key });
    expect(key in s.drawings).toBe(false);
  });

  it("tracks the laser position and turning it off", () => {
    let s = reduce(initialState(), { type: "laser", point: { x: 0.5, y: 0.25 } });
    expect(s.laser).toEqual({ x: 0.5, y: 0.25 });
    s = reduce(s, { type: "laser", point: null });
    expect(s.laser).toBeNull();
  });
});

describe("channelName", () => {
  it("keys per deck with an optional suffix", () => {
    expect(channelName("talk")).toBe("astro-slides:talk");
    expect(channelName("talk", "preview")).toBe("astro-slides:talk:preview");
  });
});

describe("createSyncStore", () => {
  /** In-memory channel pair sharing one listener bus (simulates two windows). */
  function fakeBus() {
    const listeners = new Set<(a: SyncAction) => void>();
    const make = (): SyncChannel => ({
      post: (a) => {
        for (const l of listeners) l(a);
      },
      subscribe: (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      close: () => {},
    });
    return make;
  }

  it("reduces local dispatches and broadcasts to peers", () => {
    const make = fakeBus();
    const a = createSyncStore("d", initialState(), { channel: make() });
    const b = createSyncStore("d", initialState(), { channel: make() });
    a.dispatch({ type: "goto", no: 3, step: 1 });
    expect(a.state.get()).toMatchObject({ no: 3, step: 1 });
    expect(b.state.get()).toMatchObject({ no: 3, step: 1 }); // peer received it
    a.close();
    b.close();
  });

  it("fans a local dispatch out to every transport", () => {
    const posted: SyncAction[] = [];
    const extra: SyncChannel = {
      post: (a) => posted.push(a),
      subscribe: () => () => {},
      close: () => {},
    };
    const make = fakeBus();
    const store = createSyncStore("d", initialState(), { channel: make(), transports: [extra] });
    store.dispatch({ type: "goto", no: 5, step: 0 });
    // hello (join) + goto both reach the extra transport (e.g. the WebSocket).
    expect(posted).toContainEqual({ type: "goto", no: 5, step: 0 });
    expect(posted.some((a) => a.type === "hello")).toBe(true);
    store.close();
  });
});

// --- Audience engagement (Phase 19) ------------------------------------------------

describe("engagement reducer", () => {
  const open = (s = initialState()) =>
    reduce(s, {
      type: "poll/open",
      poll: { id: "p1", question: "Best fruit?", options: ["apple", "kiwi"] },
    });

  it("poll/open sets the active poll idempotently and seeds vote state", () => {
    const s1 = open();
    expect(s1.activePoll?.id).toBe("p1");
    expect(s1.polls.p1).toEqual({ votes: {} });
    const again = s1.activePoll ?? { id: "p1", question: "", options: [] };
    expect(reduce(s1, { type: "poll/open", poll: again })).toBe(s1); // no-op repeat
  });

  it("vote is one-per-client, revisable, idempotent, and rejected when closed", () => {
    let s = open();
    s = reduce(s, { type: "vote", poll: "p1", client: "c1", option: 0 });
    expect(s.polls.p1?.votes).toEqual({ c1: 0 });
    // Idempotent repeat (double-delivery) — same state object back.
    expect(reduce(s, { type: "vote", poll: "p1", client: "c1", option: 0 })).toBe(s);
    // Revision replaces, never double-counts.
    s = reduce(s, { type: "vote", poll: "p1", client: "c1", option: 1 });
    expect(s.polls.p1?.votes).toEqual({ c1: 1 });
    // Closed poll rejects further votes.
    s = reduce(s, { type: "poll/close", id: "p1" });
    expect(s.activePoll).toBeNull();
    expect(reduce(s, { type: "vote", poll: "p1", client: "c2", option: 0 })).toBe(s);
  });

  it("tallyVotes counts per option and ignores out-of-range votes", () => {
    const poll = { votes: { a: 0, b: 1, c: 1, d: 9 } };
    expect(tallyVotes(poll, 2)).toEqual([1, 2]);
    expect(tallyVotes(undefined, 3)).toEqual([0, 0, 0]);
  });

  it("qa/ask is idempotent by id; qa/moderate keeps at most one question shown", () => {
    let s = initialState();
    s = reduce(s, { type: "qa/ask", id: "q1", text: "Why?", at: 1 });
    expect(reduce(s, { type: "qa/ask", id: "q1", text: "Why?", at: 1 })).toBe(s); // dedup
    s = reduce(s, { type: "qa/ask", id: "q2", text: "How?", at: 2 });
    s = reduce(s, { type: "qa/moderate", id: "q1", status: "shown" });
    s = reduce(s, { type: "qa/moderate", id: "q2", status: "shown" });
    expect(s.questions.map((q) => [q.id, q.status])).toEqual([
      ["q1", "new"], // demoted when q2 was shown
      ["q2", "shown"],
    ]);
  });

  it("react is a state no-op but reaches action listeners on the store", () => {
    let seen: SyncAction | null = null;
    const channel: SyncChannel = { post: () => {}, subscribe: () => () => {}, close: () => {} };
    const store = createSyncStore("talk", initialState(), { channel });
    store.onAction((a) => {
      seen = a;
    });
    const before = store.state.get();
    store.dispatch({ type: "react", id: "r1", emoji: "🎉" });
    expect(store.state.get()).toBe(before);
    expect(seen).toEqual({ type: "react", id: "r1", emoji: "🎉" });
    store.close();
  });

  it("state snapshots from older peers backfill engagement fields", () => {
    const legacy = { ...initialState() } as Record<string, unknown>;
    delete legacy.polls;
    delete legacy.activePoll;
    delete legacy.questions;
    const s = reduce(initialState(), { type: "state", state: legacy as unknown as SharedState });
    expect(s.polls).toEqual({});
    expect(s.activePoll).toBeNull();
    expect(s.questions).toEqual([]);
  });
});
