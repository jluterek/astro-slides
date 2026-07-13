import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import remarkMath from "remark-math";
import Icons from "unplugin-icons/vite";
import type { ViteDevServer } from "vite";
import { remarkCode } from "./code/remark-code.js";
import { remarkSnippets } from "./code/snippets.js";
import { remarkSlidev } from "./compat/remark-slidev.js";
import { remarkDiagrams } from "./diagrams/remark-diagrams.js";
import { remarkKatex } from "./math/remark-katex.js";
import { remarkClicks } from "./remark-clicks.js";
import { astroSlidesVitePlugin, type VitePluginOptions } from "./vite-plugin.js";

export interface AstroSlidesOptions {
  /**
   * Deck source files (relative to project root). Omit to auto-discover
   * `slides.{mdx,md}` at the root and `content/decks/<name>/slides.{mdx,md}`.
   */
  decks?: string[];
  /** PlantUML server base URL (default the public plantuml.com). */
  plantumlServer?: string;
  /**
   * Route prefix for every injected route, e.g. `"/slides"` →
   * `/slides/[deck]/[slide]`, `/slides/presenter/…`, `/slides/print/…`, and the
   * root redirect/dashboard at `/slides/`. Lets decks live inside an existing site
   * without claiming its top-level namespace. Default: no prefix.
   */
  prefix?: string;
  /**
   * Inject the root route (redirect for a single deck, dashboard for several) at
   * `/` — or at `<prefix>/` when a prefix is set. Turn off when the host site owns
   * its homepage and you only want the deck/presenter/print routes. Default: true.
   */
  injectRoot?: boolean;
  /**
   * Scope the bundled React renderer to astro-slides' own components. Set this when
   * the host site uses another JSX framework (Solid, Preact, Vue-JSX) whose renderer
   * would otherwise fight React over `.jsx`/`.tsx` files. With scoping on, YOUR
   * `.tsx` files are ignored by astro-slides' React — register your own renderer
   * for them. Default: false (React claims JSX project-wide, as before).
   */
  scopedReact?: boolean;
}

/** Normalize a route prefix to `""` or `"/seg(/seg)*"` — leading slash, no trailing. */
export function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  const trimmed = prefix.trim().replace(/\/+$/, "").replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : "";
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
        const prefix = normalizePrefix(options.prefix);
        const injectRoot = options.injectRoot !== false;

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
        pluginOptions.routePrefix = prefix;
        updateConfig({
          // Our own Shiki pipeline highlights code (dual themes, click lines, Magic
          // Move); disable Astro's built-in highlighter so it doesn't also run.
          markdown: { syntaxHighlight: false },
          // Slides compile as MDX (components in scope) with React islands. Plugin
          // order: snippets -> clicks (numbers prose clicks + totalClicks) -> katex
          // (math + stepped-math clicks) -> diagrams (mermaid/plantuml fences become
          // components, so remark-code skips them) -> code (highlights the rest,
          // appends code-line clicks). katex + code both bump the shared totalClicks.
          integrations: [
            // Scoped mode (embedding, issue #41): limit the React renderer to
            // astro-slides' own island sources so a host site's Solid/Preact/etc.
            // renderer keeps `.jsx`/`.tsx` for its files.
            options.scopedReact
              ? react({ include: ["**/@astro-slides/**", "**/packages/client/**"] })
              : react(),
            mdx({
              remarkPlugins: [
                [remarkSnippets, { root, onFile: onSnippetFile }],
                // Slidev compat (Phase 15): rewrite `v-click`/`v-after`/`v-clicks` to our
                // components BEFORE remark-clicks assigns their step indices.
                remarkSlidev,
                remarkClicks,
                // remark-math tokenizes `$…$`/`$$…$$` (protects LaTeX braces under MDX);
                // remark-katex then renders those nodes with KaTeX.
                remarkMath,
                remarkKatex,
                [remarkDiagrams, { plantumlServer: options.plantumlServer }],
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
          pattern: `${prefix}/[deck]/[slide]`,
          entrypoint: fileURLToPath(new URL("./routes/slide.astro", import.meta.url)),
          prerender: true,
        });
        // Presenter view (Phase 10) — a hydrated React island at /presenter/<deck>/<n>.
        injectRoute({
          pattern: `${prefix}/presenter/[deck]/[slide]`,
          entrypoint: fileURLToPath(new URL("./routes/presenter.astro", import.meta.url)),
          prerender: true,
        });
        // Print route (Phase 12) — all slides stacked for `window.print()` / PDF export.
        injectRoute({
          pattern: `${prefix}/print/[deck]`,
          entrypoint: fileURLToPath(new URL("./routes/print.astro", import.meta.url)),
          prerender: true,
        });
        // SPA entry (Phase 12) — redirect (single deck) / dashboard (several). Under a
        // prefix it lives at `<prefix>/`, out of the host homepage's way; `injectRoot:
        // false` skips it entirely (issue #40).
        if (injectRoot) {
          injectRoute({
            pattern: prefix || "/",
            entrypoint: fileURLToPath(new URL("./routes/index.astro", import.meta.url)),
            prerender: true,
          });
        }
        logger.info(
          `Registered virtual modules and the deck + presenter + print routes${prefix ? ` under ${prefix}` : ""}.`,
        );
      },
      // GitHub Pages fallback (Phase 12): copy the SPA entry to 404.html so deep links
      // (e.g. /slides/7 refreshed on a static host) resolve to the app instead of a 404.
      // Standalone only: when embedding (prefix set / root not injected) the host owns
      // `/` and its own 404 — clobbering dist/404.html would overwrite the host's page.
      "astro:build:done": ({ dir, logger }) => {
        if (normalizePrefix(options.prefix) || options.injectRoot === false) return;
        const out = fileURLToPath(dir);
        const index = `${out}/index.html`;
        const notFound = `${out}/404.html`;
        if (existsSync(index) && !existsSync(notFound)) {
          copyFileSync(index, notFound);
          logger.info("Copied index.html → 404.html for static-host deep links.");
        }
      },
    },
  };
}

export default astroSlides;
