import { describe, expect, it } from "vitest";
import { astroSlides } from "../integration.js";

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
