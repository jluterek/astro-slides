import { describe, expect, it } from "vitest";
import { channelName } from "../sync/channel.js";
import {
  displayMs,
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
});
