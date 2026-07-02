import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { guard, ok, type ServerContext } from "../context.js";

const SYNC_PATH = "/__astro-slides/sync";

/** Build the gateway WS URL for a deck room (mirrors the client's `gatewayUrl`). */
export function gatewayWsUrl(base: string, deck: string, token?: string): string {
  const url = new URL(SYNC_PATH, base.replace(/^http/, "ws"));
  url.searchParams.set("deck", deck);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

interface SharedStateish {
  no: number;
  step: number;
}

/**
 * Connect to the running deck's sync gateway, run `fn`, then close. `send` broadcasts a
 * `SyncAction`; `currentState` does a `hello`→`state` round-trip to learn where the live
 * presentation is (for relative moves). Requires `astro-slides dev --remote`.
 */
async function withSocket<T>(
  ctx: ServerContext,
  deck: string,
  fn: (send: (action: unknown) => void, currentState: () => Promise<SharedStateish>) => Promise<T>,
): Promise<T> {
  if (!ctx.syncGateway) {
    throw new Error(
      "No running presentation. Navigate tools need `astro-slides dev --remote` and its gateway URL.",
    );
  }
  const url = gatewayWsUrl(ctx.syncGateway, deck, ctx.syncToken);
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    // A black-holed connection (firewall drop) never fires open OR error — bound it,
    // and close the socket on any failure path so nothing leaks.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = (err: Error): void => {
      if (timer) clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // already closed
      }
      reject(err);
    };
    timer = setTimeout(() => fail(new Error(`Timed out reaching gateway at ${url}`)), 5000);
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener("error", () => fail(new Error(`Cannot reach gateway at ${url}`)), {
      once: true,
    });
  });
  const send = (action: unknown) => socket.send(JSON.stringify(action));
  const currentState = () =>
    new Promise<SharedStateish>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No live deck window replied with its state (is a deck open?).")),
        1500,
      );
      socket.addEventListener("message", (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; state?: SharedStateish };
          if (msg.type === "state" && msg.state) {
            clearTimeout(timer);
            resolve(msg.state);
          }
        } catch {
          // ignore non-JSON frames
        }
      });
      send({ type: "hello" });
    });
  try {
    return await fn(send, currentState);
  } finally {
    socket.close();
  }
}

export function registerNavigateTools(server: McpServer, ctx: ServerContext): void {
  const deckArg = z.string().describe("Deck id of the running presentation.");

  server.registerTool(
    "goto_slide",
    {
      title: "Go to slide",
      description: "Drive the live presentation to a slide (1-based). Requires `dev --remote`.",
      inputSchema: { deck: deckArg, no: z.number().int().positive() },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, no }) =>
      guard(() =>
        withSocket(ctx, deck, async (send) => {
          send({ type: "goto", no, step: 0 });
          return ok({ ok: true, no });
        }),
      ),
  );

  server.registerTool(
    "next_slide",
    {
      title: "Next slide",
      description: "Advance the live presentation by one slide.",
      inputSchema: { deck: deckArg },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck }) =>
      guard(() =>
        withSocket(ctx, deck, async (send, currentState) => {
          const { no } = await currentState();
          send({ type: "goto", no: no + 1, step: 0 });
          return ok({ no: no + 1 });
        }),
      ),
  );

  server.registerTool(
    "prev_slide",
    {
      title: "Previous slide",
      description: "Move the live presentation back one slide.",
      inputSchema: { deck: deckArg },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck }) =>
      guard(() =>
        withSocket(ctx, deck, async (send, currentState) => {
          const { no } = await currentState();
          const target = Math.max(1, no - 1);
          send({ type: "goto", no: target, step: 0 });
          return ok({ no: target });
        }),
      ),
  );

  server.registerTool(
    "set_step",
    {
      title: "Set click step",
      description: "Set the current slide and click step of the live presentation.",
      inputSchema: {
        deck: deckArg,
        no: z.number().int().positive(),
        step: z.number().int().nonnegative(),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    ({ deck, no, step }) =>
      guard(() =>
        withSocket(ctx, deck, async (send) => {
          send({ type: "goto", no, step });
          return ok({ ok: true, no, step });
        }),
      ),
  );
}
