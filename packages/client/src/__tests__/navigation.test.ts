import { describe, expect, it } from "vitest";
import { gotoState, nextState, prevState, type SlideMeta } from "../navigation.js";

const slides: SlideMeta[] = [
  { no: 1, steps: 0, title: "One" },
  { no: 2, steps: 2, title: "Two" },
  { no: 3, steps: 0, title: "Three" },
];

describe("nextState", () => {
  it("advances to the next slide when there are no steps", () => {
    expect(nextState({ slide: 1, step: 0 }, slides)).toEqual({ slide: 2, step: 0 });
  });

  it("walks steps before leaving a slide", () => {
    expect(nextState({ slide: 2, step: 0 }, slides)).toEqual({ slide: 2, step: 1 });
    expect(nextState({ slide: 2, step: 1 }, slides)).toEqual({ slide: 2, step: 2 });
    expect(nextState({ slide: 2, step: 2 }, slides)).toEqual({ slide: 3, step: 0 });
  });

  it("stays put at the end", () => {
    expect(nextState({ slide: 3, step: 0 }, slides)).toEqual({ slide: 3, step: 0 });
  });
});

describe("prevState", () => {
  it("retreats onto the previous slide's last step", () => {
    expect(prevState({ slide: 3, step: 0 }, slides)).toEqual({ slide: 2, step: 2 });
  });

  it("walks steps back down", () => {
    expect(prevState({ slide: 2, step: 2 }, slides)).toEqual({ slide: 2, step: 1 });
  });

  it("stays put at the start", () => {
    expect(prevState({ slide: 1, step: 0 }, slides)).toEqual({ slide: 1, step: 0 });
  });
});

describe("gotoState", () => {
  it("clamps step to the target slide's range", () => {
    expect(gotoState(2, slides, 9)).toEqual({ slide: 2, step: 2 });
    expect(gotoState(1, slides, 5)).toEqual({ slide: 1, step: 0 });
  });

  it("falls back to the first slide for unknown numbers", () => {
    expect(gotoState(99, slides)).toEqual({ slide: 1, step: 0 });
  });
});
