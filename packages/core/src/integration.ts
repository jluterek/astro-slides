import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import Icons from "unplugin-icons/vite";
import { remarkClicks } from "./remark-clicks.js";
import { astroSlidesVitePlugin, type VitePluginOptions } from "./vite-plugin.js";

export interface AstroSlidesOptions {
  /**
   * Deck source files (relative to project root). Omit to auto-discover
   * `slides.{mdx,md}` at the root and `content/decks/<name>/slides.{mdx,md}`.
   */
  decks?: string[];
}

/**
 * The astro-slides Astro integration. Registers the virtual-module Vite plugin and
 * injects a prerendered per-slide route at `/[deck]/[slide]`.
 */
export function astroSlides(options: AstroSlidesOptions = {}): AstroIntegration {
  return {
    name: "@astro-slides/core",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute, logger }) => {
        const root = fileURLToPath(config.root);
        const pluginOptions: VitePluginOptions = { root };
        if (options.decks) pluginOptions.decks = options.decks;
        updateConfig({
          // Slides compile as MDX (components in scope) with React islands. The
          // remark-clicks plugin resolves click steps at compile time (ADR-0008).
          integrations: [react(), mdx({ remarkPlugins: [remarkClicks] })],
          vite: {
            plugins: [
              astroSlidesVitePlugin(pluginOptions),
              // `~icons/<collection>/<name>` imports compile to inline SVG Astro
              // components. Collections are opt-in via `@iconify-json/*` deps.
              Icons({ compiler: "astro" }),
            ],
          },
        });
        injectRoute({
          pattern: "/[deck]/[slide]",
          entrypoint: fileURLToPath(new URL("./routes/slide.astro", import.meta.url)),
          prerender: true,
        });
        logger.info("Registered virtual modules and the /[deck]/[slide] route.");
      },
    },
  };
}

export default astroSlides;
