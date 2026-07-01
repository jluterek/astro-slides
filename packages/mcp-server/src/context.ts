import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Runtime configuration for a deck MCP server. */
export interface ServerContext {
  /** Project root — where decks, layouts, and themes are discovered. */
  root: string;
  /** When true, write tools are not registered (publish-only). */
  readOnly: boolean;
  /**
   * Absolute path to the `astro-slides` CLI bin, used by export/capture tools that spawn
   * the tested Playwright pipeline as a subprocess. Defaults to resolving `astro-slides`
   * on PATH when unset.
   */
  cliBin?: string;
  /**
   * Base URL of a running sync gateway (`astro-slides dev --remote`), e.g.
   * `ws://127.0.0.1:4321`. Required for the navigate tools to drive a live presentation.
   */
  syncGateway?: string;
  /** Shared-secret token for the sync gateway, when the dev server set one. */
  syncToken?: string;
}

/** A JSON tool result (text content the model reads; the JSON is the machine payload). */
export function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** An error tool result — `isError` lets the client surface it as a tool failure. */
export function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Wrap a tool body so thrown errors become clean MCP error results, not crashes. */
export async function guard(
  fn: () => Promise<CallToolResult> | CallToolResult,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
