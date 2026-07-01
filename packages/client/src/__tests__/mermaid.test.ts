// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initMermaid, parseOptions } from "../diagrams/mermaid.js";

describe("parseOptions", () => {
  it("parses theme and numeric scale", () => {
    expect(parseOptions("theme: neutral, scale: 0.8")).toEqual({ theme: "neutral", scale: 0.8 });
  });
  it("returns an empty object for undefined / blank input", () => {
    expect(parseOptions(undefined)).toEqual({});
    expect(parseOptions("")).toEqual({});
  });
  it("ignores unknown keys", () => {
    expect(parseOptions("theme: dark, foo: bar")).toEqual({ theme: "dark" });
  });
});

describe("initMermaid", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is a no-op (never imports mermaid) when no .as-mermaid elements exist", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const stop = initMermaid(root);
    expect(typeof stop).toBe("function");
    stop(); // clean shutdown without having loaded mermaid
  });
});
