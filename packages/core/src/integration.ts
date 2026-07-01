import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import Icons from "unplugin-icons/vite";
import type { ViteDevServer } from "vite";
import { remarkCode } from "./code/remark-code.js";
import { remarkSnippets } from "./code/snippets.js";
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

        // Code rendering (Phase 08). remark-code lazily loads `setup/shiki.ts` and
        // boots the highlighter on first render (not here — the config-load module
        // runner is gone by render time). Snippet imports are registered live so the
        // dev server watches them for HMR.
        const snippetFiles = new Set<string>();
        let devServer: ViteDevServer | null = null;
        const onSnippetFile = (file: string): void => {
          snippetFiles.add(file);
          devServer?.watcher.add(file);
        };

        const pluginOptions: VitePluginOptions = {
          root,
          snippetFiles,
          onServer: (server) => {
            devServer = server;
          },
        };
        if (options.decks) pluginOptions.decks = options.decks;
        updateConfig({
          // Our own Shiki pipeline highlights code (dual themes, click lines, Magic
          // Move); disable Astro's built-in highlighter so it doesn't also run.
          markdown: { syntaxHighlight: false },
          // Slides compile as MDX (components in scope) with React islands. Plugin
          // order: snippets -> clicks (numbers prose clicks + totalClicks) -> code
          // (highlights fences, appends code-line clicks after the prose ones).
          integrations: [
            react(),
            mdx({
              remarkPlugins: [
                [remarkSnippets, { root, onFile: onSnippetFile }],
                remarkClicks,
                [remarkCode, { root, twoslash: true }],
              ],
            }),
          ],
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
