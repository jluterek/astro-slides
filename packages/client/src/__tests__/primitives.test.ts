import { describe, expect, it } from "vitest";
import { cssVars, flexBlockClass } from "../primitives.js";

describe("cssVars", () => {
  it("maps props to --p-* custom properties", () => {
    expect(cssVars({ gap: "16px", align: "center" })).toBe("--p-gap:16px;--p-align:center");
  });

  it("skips undefined and empty values", () => {
    expect(cssVars({ gap: "8px", align: undefined, justify: "" })).toBe("--p-gap:8px");
    expect(cssVars({ gap: undefined })).toBe("");
  });

  it("stringifies numeric values (FlexBlock columns)", () => {
    expect(cssVars({ cols: 3 })).toBe("--p-cols:3");
  });
});

describe("flexBlockClass", () => {
  it("composes the base class with the variant modifier", () => {
    expect(flexBlockClass("metrics")).toBe("p-flexblock variant-metrics");
    expect(flexBlockClass("steps")).toBe("p-flexblock variant-steps");
  });
});
