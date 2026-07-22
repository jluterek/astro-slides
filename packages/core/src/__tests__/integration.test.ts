import { describe, expect, it } from "vitest";
import { astroSlides, normalizePrefix } from "../integration.js";

describe("astroSlides", () => {
  it("is an AstroIntegration with a config:setup hook", () => {
    const integration = astroSlides();
    expect(integration.name).toBe("@astro-slides/core");
    expect(integration.hooks["astro:config:setup"]).toBeTypeOf("function");
  });

  it("injects the slide route and registers a Vite plugin", () => {
    const integration = astroSlides();
    const injected: Array<{ pattern: string }> = [];
    let updated: { vite?: { plugins?: unknown[] } } | undefined;

    const setup = integration.hooks["astro:config:setup"];
    setup?.({
      config: { root: new URL("file:///proj/") },
      updateConfig: (c: unknown) => {
        updated = c as typeof updated;
      },
      injectRoute: (r: unknown) => injected.push(r as { pattern: string }),
      logger: { info: () => {} },
    } as never);

    expect(injected[0]?.pattern).toBe("/[deck]/[slide]");
    // Slides virtual-module plugin + unplugin-icons.
    expect(updated?.vite?.plugins?.length).toBe(2);
  });
});

describe("normalizePrefix (issue #39)", () => {
  it("normalizes to '' or '/seg(/seg)*'", () => {
    expect(normalizePrefix(undefined)).toBe("");
    expect(normalizePrefix("")).toBe("");
    expect(normalizePrefix("/")).toBe("");
    expect(normalizePrefix("slides")).toBe("/slides");
    expect(normalizePrefix("/slides")).toBe("/slides");
    expect(normalizePrefix("/slides/")).toBe("/slides");
    expect(normalizePrefix("//talks/decks//")).toBe("/talks/decks");
  });
});

describe("embedding options (issues #39/#40)", () => {
  function runSetup(options: Parameters<typeof astroSlides>[0]) {
    const integration = astroSlides(options);
    const injected: Array<{ pattern: string }> = [];
    integration.hooks["astro:config:setup"]?.({
      config: { root: new URL("file:///proj/") },
      updateConfig: () => {},
      injectRoute: (r: unknown) => injected.push(r as { pattern: string }),
      logger: { info: () => {} },
    } as never);
    return injected.map((r) => r.pattern);
  }

  it("namespaces every route under the prefix and moves the root there", () => {
    expect(runSetup({ prefix: "/slides" })).toEqual([
      "/slides/[deck]/[slide]",
      "/slides/presenter/[deck]/[slide]",
      "/slides/read/[deck]",
      "/slides/print/[deck]",
      "/slides",
    ]);
  });

  it("injectRoot: false leaves the host homepage alone", () => {
    expect(runSetup({ injectRoot: false })).toEqual([
      "/[deck]/[slide]",
      "/presenter/[deck]/[slide]",
      "/read/[deck]",
      "/print/[deck]",
    ]);
  });

  it("defaults are unchanged: top-level routes plus the root redirect", () => {
    expect(runSetup(undefined).at(-1)).toBe("/");
  });
});
