import { getRequestListener } from "@hono/node-server";
import type { Plugin, ViteDevServer } from "vite";
import { discoverDeckFiles, loadAllDecks } from "./deck-loader.js";
import { loadDrawings } from "./drawing/persistence.js";
import { resolveLayouts, userLayoutsDir } from "./layout-resolver.js";
import { emitSlideModules } from "./mdx-emit.js";
import { createSyncGateway } from "./server/gateway.js";
import {
  configsModuleSource,
  drawingsModuleSource,
  layoutsModuleSource,
  runtimeConfigModuleSource,
  slidesModuleSource,
  titlesModuleSource,
  VIRTUAL_IDS,
} from "./virtual.js";

export interface VitePluginOptions {
  /** Normalized route prefix ("" or "/seg") — advertised to routes/runtime. */
  routePrefix?: string;
  root: string;
  decks?: string[];
  /** Extra layout override folders (e.g. a theme's `layouts/`), low-to-high priority. */
  layoutDirs?: string[];
  /** Snippet files (`<<<` imports) to watch for HMR; populated during rendering. */
  snippetFiles?: Set<string>;
  /** Called once with the dev server so the integration can add watch files live. */
  onServer?: (server: ViteDevServer) => void;
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

  /**
   * Stand up the Phase 11 sync gateway inside the dev server (only under --remote).
   * Imported statically (not lazily) because a runtime `import()` from an integration
   * hits Vite's already-closed module runner. The middleware is *prepended* onto the
   * Connect stack so it runs before Astro's SSR router (a plain `.use()` appends after
   * it, and Astro would 404 `/entry` first).
   */
  function mountGateway(server: ViteDevServer, root: string): void {
    const gatewayPaths = ["/entry", "/__astro-slides/drawings", "/__astro-slides/sync"];
    const isGatewayPath = (url: string | undefined): boolean => {
      const path = (url ?? "").split("?")[0] ?? "";
      return gatewayPaths.some((p) => path === p || path.startsWith(`${p}/`));
    };

    // Getters, not snapshots: `data()` re-parses after deck edits, so the mobile
    // remote's slide bounds stay current across the dev session.
    const gateway = createSyncGateway({
      root,
      deckTotals: () => Object.fromEntries(data().decks.map((d) => [d.name, d.deck.slides.length])),
      defaultDeck: () => data().decks[0]?.name ?? "slides",
      token: process.env.ASTRO_SLIDES_REMOTE_TOKEN || undefined,
    });
    if (server.httpServer) gateway.injectWebSocket(server.httpServer);
    const handle = getRequestListener(gateway.app.fetch);

    const layer = (req: { url?: string }, res: unknown, next: () => void): void => {
      if (!isGatewayPath(req.url)) {
        next();
        return;
      }
      handle(req as never, res as never);
    };
    const connect = server.middlewares as unknown as {
      stack: { route: string; handle: unknown }[];
    };
    connect.stack.unshift({ route: "", handle: layer });
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
      if (id === resolvedId(VIRTUAL_IDS.drawings)) {
        // Read fresh so a persisted annotation shows after a reload (not cached).
        const map = Object.fromEntries(
          data().decks.map((d) => [d.name, loadDrawings(options.root, d.name)]),
        );
        return drawingsModuleSource(map);
      }
      if (id === resolvedId(VIRTUAL_IDS.runtimeConfig)) {
        // Advertise the sync gateway only when the dev server runs with --remote
        // (the CLI sets ASTRO_SLIDES_REMOTE); static builds get null.
        const remote = process.env.ASTRO_SLIDES_REMOTE ? "/__astro-slides/sync" : null;
        return runtimeConfigModuleSource(remote, options.routePrefix ?? "");
      }
      return null;
    },
    configureServer(server) {
      options.onServer?.(server);
      for (const file of discoverDeckFiles(options.root, options.decks)) {
        server.watcher.add(file);
      }
      const onChange = (file: string) => {
        // Reload on any deck/markdown source (deck files, `src:` imports) or a
        // watched snippet file (`<<<` imports) — all affect the rendered output.
        if (!/\.mdx?$/.test(file) && !options.snippetFiles?.has(file)) return;
        cache = null;
        for (const id of ids) {
          const mod = server.moduleGraph.getModuleById(resolvedId(id));
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);

      // Sync gateway (Phase 11): only when the CLI passed --remote. Serves the mobile
      // remote (/entry), drawing persistence, and the shared-state WebSocket. The WS is
      // attached to the dev server's Node httpServer; the HTTP routes run as middleware.
      if (process.env.ASTRO_SLIDES_REMOTE) mountGateway(server, options.root);
    },
  };
}
