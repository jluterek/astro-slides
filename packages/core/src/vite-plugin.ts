import type { Plugin } from "vite";
import { discoverDeckFiles, loadAllDecks } from "./deck-loader.js";
import { resolveLayouts, userLayoutsDir } from "./layout-resolver.js";
import { emitSlideModules } from "./mdx-emit.js";
import {
  configsModuleSource,
  layoutsModuleSource,
  slidesModuleSource,
  titlesModuleSource,
  VIRTUAL_IDS,
} from "./virtual.js";

export interface VitePluginOptions {
  root: string;
  decks?: string[];
  /** Extra layout override folders (e.g. a theme's `layouts/`), low-to-high priority. */
  layoutDirs?: string[];
}

const resolvedId = (id: string): string => `\0${id}`;

/**
 * Serves the deck manifest as virtual modules and reloads the browser when any deck
 * source changes. Parse results are cached and invalidated on change. HMR is a full
 * reload for now — granular per-slide swapping arrives with the runtime (Phase 04); the
 * virtual-module seam is what makes that a drop-in later.
 */
export function astroSlidesVitePlugin(options: VitePluginOptions): Plugin {
  const ids: string[] = Object.values(VIRTUAL_IDS);
  let cache: ReturnType<typeof compute> | null = null;
  let layouts: Record<string, string> | null = null;

  function compute() {
    const decks = loadAllDecks(options.root, options.decks);
    // Emit the per-slide `.mdx` files now so the imports in the generated slides
    // module resolve when Vite/Astro loads it.
    const metas = emitSlideModules(options.root, decks);
    return { decks, metas };
  }
  function data() {
    if (!cache) cache = compute();
    return cache;
  }
  function resolvedLayouts() {
    if (!layouts) {
      layouts = resolveLayouts([...(options.layoutDirs ?? []), userLayoutsDir(options.root)]);
    }
    return layouts;
  }

  return {
    name: "astro-slides:virtual",
    resolveId(id) {
      return ids.includes(id) ? resolvedId(id) : null;
    },
    load(id) {
      if (id === resolvedId(VIRTUAL_IDS.slides)) return slidesModuleSource(data().metas);
      if (id === resolvedId(VIRTUAL_IDS.configs)) return configsModuleSource(data().decks);
      if (id === resolvedId(VIRTUAL_IDS.titles)) return titlesModuleSource(data().metas);
      if (id === resolvedId(VIRTUAL_IDS.layouts)) return layoutsModuleSource(resolvedLayouts());
      return null;
    },
    configureServer(server) {
      for (const file of discoverDeckFiles(options.root, options.decks)) {
        server.watcher.add(file);
      }
      const onChange = (file: string) => {
        // Reload on any deck/markdown source under the project (deck files, `src:`
        // imports, and snippets all affect the manifest).
        if (!/\.mdx?$/.test(file)) return;
        cache = null;
        for (const id of ids) {
          const mod = server.moduleGraph.getModuleById(resolvedId(id));
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
  };
}
