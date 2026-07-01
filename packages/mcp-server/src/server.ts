import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerContext } from "./context.js";
import { registerMediaTools } from "./tools/media.js";
import { registerNavigateTools } from "./tools/navigate.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";

export const SERVER_NAME = "astro-slides";
export const SERVER_VERSION = "0.0.0";

/**
 * Build the deck MCP server with its tool surface registered. Read, navigate, and
 * export/capture tools are always present; write tools are omitted in `readOnly` mode so a
 * deck can be "published" to an MCP audience without granting authoring.
 */
export function createDeckServer(ctx: ServerContext): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Read, author, present, and export astro-slides decks. Deck ids come from list_decks; " +
        "slide numbers are 1-based. Read a slide before editing it.",
    },
  );
  registerReadTools(server, ctx);
  if (!ctx.readOnly) registerWriteTools(server, ctx);
  registerNavigateTools(server, ctx);
  registerMediaTools(server, ctx);
  return server;
}
