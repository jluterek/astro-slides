// @astro-slides/mcp-server — first-class Model Context Protocol tool surface (ADR-0009).
//
// Shipped from the CLI (`astro-slides mcp-server`). This package is bundled by tsup so the
// type-stripped CLI can `import()` it at runtime (workspace deps inlined). Read/write tools
// operate on deck source files; navigate tools drive a live `dev --remote` presentation;
// export/capture tools spawn the CLI's tested Playwright pipeline.

import type { ServerContext } from "./context.js";
import { createDeckServer } from "./server.js";
import { connectStdio, startHttp } from "./transports.js";

export type { ServerContext } from "./context.js";
export {
  deckNameFromFile,
  discoverDeckFiles,
  loadAllDecks,
  loadDeck,
  resolveDeckFile,
} from "./deck-loader.js";
export { BUILTIN_LAYOUTS, BUILTIN_THEMES, listLayouts, listThemes } from "./discovery.js";
export { createDeckServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
export { buildExportArgs } from "./tools/media.js";
export { gatewayWsUrl } from "./tools/navigate.js";
export {
  bearerToken,
  connectStdio,
  createHttpApp,
  type HttpHandle,
  type HttpOptions,
  isLoopbackHost,
  startHttp,
} from "./transports.js";
export * from "./write-engine.js";

export interface RunOptions extends ServerContext {
  transport: "stdio" | "http";
  host?: string;
  port?: number;
  token?: string | undefined;
}

/**
 * Boot the MCP server on the chosen transport. stdio wires a single long-lived server;
 * http serves a fresh server per request (Streamable HTTP is stateless per-request).
 * Returns void for stdio (runs until the pipe closes) or an `HttpHandle` for http.
 */
export async function runMcpServer(options: RunOptions) {
  const ctx: ServerContext = {
    root: options.root,
    readOnly: options.readOnly,
    ...(options.cliBin ? { cliBin: options.cliBin } : {}),
    ...(options.syncGateway ? { syncGateway: options.syncGateway } : {}),
    ...(options.syncToken ? { syncToken: options.syncToken } : {}),
  };
  if (options.transport === "http") {
    return startHttp({
      makeServer: () => createDeckServer(ctx),
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 4444,
      token: options.token,
    });
  }
  await connectStdio(createDeckServer(ctx));
  return undefined;
}
