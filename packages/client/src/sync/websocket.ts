import type { SyncChannel } from "./channel.js";
import type { SyncAction } from "./types.js";

/**
 * A `SyncChannel` over a WebSocket to the dev-server sync gateway (Phase 11). This is
 * the cross-origin transport — a phone on the LAN or the audience screen on another
 * host joins the same "room" (deck + suffix) and relays actions through the gateway.
 * Same-origin tabs still use `BroadcastChannel`; a window fans out to both (see
 * `store.ts`), which is safe because every action reduces idempotently.
 *
 * The socket reconnects with backoff and buffers posts made while it is (re)connecting,
 * so callers never need to check readiness. Degrades to a no-op where WebSocket is
 * absent.
 */
export interface WebSocketTransportOptions {
  /** Base path of the gateway, e.g. `/__astro-slides/sync`. */
  path: string;
  suffix?: string;
  /** Injected for tests. */
  makeSocket?: (url: string) => WebSocketLike;
  /** Reconnect backoff base (ms). */
  reconnectMs?: number;
}

/** The slice of the WebSocket API this transport uses (so tests can fake it). */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((this: unknown, ev: unknown) => unknown) | null;
  onclose: ((this: unknown, ev: unknown) => unknown) | null;
  onerror: ((this: unknown, ev: unknown) => unknown) | null;
  onmessage: ((this: unknown, ev: { data: unknown }) => unknown) | null;
}

const OPEN = 1;

/** Build the gateway URL for a deck room from a same-origin path. */
export function gatewayUrl(path: string, deckId: string, suffix = "", loc = location): string {
  const scheme = loc.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ deck: deckId });
  if (suffix) params.set("suffix", suffix);
  return `${scheme}//${loc.host}${path}?${params.toString()}`;
}

export function createWebSocketTransport(
  deckId: string,
  options: WebSocketTransportOptions,
): SyncChannel {
  const make =
    options.makeSocket ??
    (typeof WebSocket !== "undefined"
      ? (url: string) => new WebSocket(url) as unknown as WebSocketLike
      : null);
  if (!make) return { post: () => {}, subscribe: () => () => {}, close: () => {} };
  const makeSocket = make;

  const url = gatewayUrl(options.path, deckId, options.suffix);
  const listeners = new Set<(action: SyncAction) => void>();
  // Buffered posts while (re)connecting. High-frequency actions (laser ~25/s, goto)
  // are coalesced — only the latest matters — and the buffer is capped so a long
  // gateway outage can't grow it unbounded / replay a stale firehose on reconnect.
  const COALESCED = new Set(["laser", "goto"]);
  const BACKLOG_MAX = 256;
  const backlog: Array<{ type: string; msg: string }> = [];
  const reconnectMs = options.reconnectMs ?? 1000;
  let socket: WebSocketLike | null = null;
  let closed = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    if (!socket || socket.readyState !== OPEN) return;
    while (backlog.length) {
      const entry = backlog.shift();
      if (entry != null) socket.send(entry.msg);
    }
  }

  function connect(): void {
    if (closed) return;
    socket = makeSocket(url);
    socket.onopen = () => {
      attempts = 0;
      flush();
    };
    socket.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let action: SyncAction;
      try {
        action = JSON.parse(ev.data) as SyncAction;
      } catch {
        return;
      }
      for (const listener of listeners) listener(action);
    };
    const retry = (): void => {
      if (closed) return;
      // Exponential backoff, capped at 10s.
      const delay = Math.min(reconnectMs * 2 ** attempts++, 10_000);
      timer = setTimeout(connect, delay);
    };
    socket.onclose = retry;
    socket.onerror = () => socket?.close();
  }

  connect();

  return {
    post: (action) => {
      const msg = JSON.stringify(action);
      if (COALESCED.has(action.type)) {
        const prior = backlog.findIndex((e) => e.type === action.type);
        if (prior !== -1) backlog.splice(prior, 1);
      }
      backlog.push({ type: action.type, msg });
      if (backlog.length > BACKLOG_MAX) backlog.shift();
      flush();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      listeners.clear();
      socket?.close();
    },
  };
}
