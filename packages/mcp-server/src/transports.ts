import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";

/** Connect a server to stdio (the default local transport). Resolves when wired. */
export async function connectStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/** Read a bearer token from an `Authorization: Bearer <token>` header. */
export function bearerToken(header: string | undefined | null): string | undefined {
  const m = header?.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

export interface HttpOptions {
  /** Fresh server per request — Streamable HTTP is managed per-request (stateless). */
  makeServer: () => McpServer;
  host: string;
  port: number;
  /** Required for non-loopback; when set, also enforced on loopback. */
  token?: string | undefined;
  path?: string;
}

/** Build the Hono app for the Streamable HTTP transport (auth-gated). */
export function createHttpApp(opts: Pick<HttpOptions, "makeServer" | "token" | "path">): Hono {
  const app = new Hono();
  const path = opts.path ?? "/mcp";
  app.all(path, async (c) => {
    if (opts.token && bearerToken(c.req.header("authorization")) !== opts.token) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const server = opts.makeServer();
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    return (await transport.handleRequest(c)) ?? c.body(null, 204);
  });
  return app;
}

export interface HttpHandle {
  close(): void;
  url: string;
}

/**
 * Serve the MCP tool surface over Streamable HTTP. Non-loopback binds require a bearer
 * token (the loopback trust boundary doesn't extend to the network). OAuth 2.1 + PKCE is a
 * deferred follow-up (ADR-0009); v1 uses a static bearer token.
 */
export function startHttp(opts: HttpOptions): HttpHandle {
  if (!isLoopbackHost(opts.host) && !opts.token) {
    throw new Error(
      "Refusing to bind a non-loopback host without --token (or ASTRO_SLIDES_MCP_TOKEN).",
    );
  }
  const path = opts.path ?? "/mcp";
  const app = createHttpApp({ makeServer: opts.makeServer, token: opts.token, path });
  const server = serve({ fetch: app.fetch, hostname: opts.host, port: opts.port });
  return {
    close: () => server.close(),
    url: `http://${opts.host}:${opts.port}${path}`,
  };
}
