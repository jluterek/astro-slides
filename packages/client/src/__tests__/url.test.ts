import { describe, expect, it } from "vitest";
import { basePath, buildLocation, parseLocation } from "../url.js";

describe("parseLocation", () => {
  it("reads the slide from the last path segment", () => {
    expect(parseLocation("/talk/3", "")).toEqual({ slide: 3, step: 0 });
  });

  it("reads the step from the query", () => {
    expect(parseLocation("/talk/3", "?step=2")).toEqual({ slide: 3, step: 2 });
  });

  it("defaults malformed slides to 1 and steps to 0", () => {
    expect(parseLocation("/talk/oops", "?step=-4")).toEqual({ slide: 1, step: 0 });
    expect(parseLocation("/", "")).toEqual({ slide: 1, step: 0 });
  });
});

describe("basePath", () => {
  it("drops the trailing slide segment", () => {
    expect(basePath("/talk/3")).toBe("/talk");
    expect(basePath("/decks/intro/5")).toBe("/decks/intro");
  });

  it("returns empty for a single segment", () => {
    expect(basePath("/3")).toBe("");
  });
});

describe("buildLocation", () => {
  it("omits step 0 and includes higher steps", () => {
    expect(buildLocation("/talk", { slide: 2, step: 0 })).toBe("/talk/2");
    expect(buildLocation("/talk", { slide: 2, step: 3 })).toBe("/talk/2?step=3");
  });
});
