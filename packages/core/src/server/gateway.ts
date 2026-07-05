import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { saveDrawing } from "../drawing/persistence.js";
import { renderAudiencePage } from "./audience-page.js";
import { audienceAllowed, type EngagementSnapshot, saveEngagement } from "./engagement.js";
import { renderEntryPage } from "./entry-page.js";
import { type HubClient, roomKey, SyncHub } from "./hub.js";

/**
 * The sync gateway (Phase 11): a Hono app that serves the mobile remote (`/entry`),
 * persists drawings (`/__astro-slides/drawings`), and relays shared-state actions over a
 * WebSocket (`/__astro-slides/sync`). It mounts inside the Vite dev server — the WS is
 * attached to the dev server's Node `httpServer`, and the HTTP routes run as Connect
 * middleware. The relay logic itself lives in `SyncHub` (transport-agnostic, unit-tested).
 *
 * Auth: without a token the gateway is open on the LAN. With a token (`--remote <pw>`),
 * every `/entry` load and WS handshake must carry `?token=<derived>`.
 */

export const SYNC_PATH = "/__astro-slides/sync";
export const DRAWINGS_PATH = "/__astro-slides/drawings";
export const ENGAGEMENT_PATH = "/__astro-slides/engagement";
export const ENTRY_PATH = "/entry";
export const AUDIENCE_PATH = "/audience";

export interface GatewayOptions {
  /** Project root — where drawings persist. */
  root: string;
  /** Slide count per deck, so `/entry` can bound "next". A getter — deck files change
   * while the dev server runs, and the remote must see fresh totals. */
  deckTotals: () => Record<string, number>;
  /** First deck id, used when `/entry` is loaded without `?deck=`. */
  defaultDeck: () => string;
  /** Shared-secret token; when set, `/entry` + WS require `?token=` to match. */
  token?: string | undefined;
}

export interface Gateway {
  app: Hono;
  hub: SyncHub;
  /** Attach the WebSocket upgrade handler to the dev server's Node http server. */
  injectWebSocket(server: HttpServer | Http2Server | Http2SecureServer): void;
}

export function createSyncGateway(options: GatewayOptions): Gateway {
  const app = new Hono();
  const hub = new SyncHub();
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  const authOk = (token: string | undefined): boolean => !options.token || token === options.token;

  // Mobile remote page.
  app.get(ENTRY_PATH, (c) => {
    if (!authOk(c.req.query("token"))) return c.text("Forbidden", 403);
    const deck = c.req.query("deck") || options.defaultDeck();
    const total = options.deckTotals()[deck] ?? 1;
    return c.html(renderEntryPage({ deck, wsPath: SYNC_PATH, total, token: options.token }));
  });

  // Audience page (Phase 19): vote / ask / react, joined by QR. Same auth as /entry.
  app.get(AUDIENCE_PATH, (c) => {
    if (!authOk(c.req.query("token"))) return c.text("Forbidden", 403);
    const deck = c.req.query("deck") || options.defaultDeck();
    return c.html(renderAudiencePage({ deck, wsPath: SYNC_PATH, token: options.token }));
  });

  // Engagement persistence (Phase 19): the publisher deck window debounce-POSTs its
  // poll + question state; results survive a refresh, like drawings.
  app.post(ENGAGEMENT_PATH, async (c) => {
    if (!authOk(c.req.query("token"))) return c.text("Forbidden", 403);
    const body = (await c.req.json().catch(() => null)) as
      | ({ deck?: string } & Partial<EngagementSnapshot>)
      | null;
    if (!body?.deck) return c.json({ ok: false }, 400);
    const ok = saveEngagement(options.root, body.deck, {
      polls: body.polls ?? {},
      questions: body.questions ?? [],
    });
    return c.json({ ok }, ok ? 200 : 400);
  });

  // Drawing persistence.
  app.post(DRAWINGS_PATH, async (c) => {
    if (!authOk(c.req.query("token"))) return c.text("Forbidden", 403);
    const body = (await c.req.json().catch(() => null)) as {
      deck?: string;
      key?: string;
      svg?: string;
    } | null;
    if (!body?.deck || !body.key) return c.json({ ok: false }, 400);
    const ok = saveDrawing(options.root, body.deck, body.key, body.svg ?? "");
    return c.json({ ok }, ok ? 200 : 400);
  });

  // Shared-state relay.
  app.get(
    SYNC_PATH,
    upgradeWebSocket((c) => {
      const authorized = authOk(c.req.query("token"));
      // Audience-role connections (Phase 19) get a server-side action allowlist —
      // client-side scoping alone would let a modified page drive the deck.
      const audience = c.req.query("role") === "audience";
      const room = roomKey(
        c.req.query("deck") || options.defaultDeck(),
        c.req.query("suffix") || "",
      );
      let leave: (() => void) | null = null;
      let client: HubClient | null = null;
      return {
        onOpen(_evt, ws) {
          if (!authorized) {
            ws.close(1008, "unauthorized");
            return;
          }
          client = { send: (data) => ws.send(data) };
          leave = hub.join(room, client);
        },
        onMessage(evt) {
          if (!client || typeof evt.data !== "string") return;
          if (audience && !audienceAllowed(evt.data)) return;
          hub.broadcast(room, client, evt.data);
        },
        onClose() {
          leave?.();
        },
      };
    }),
  );

  return { app, hub, injectWebSocket };
}
