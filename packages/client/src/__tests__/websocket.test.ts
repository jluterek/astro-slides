// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { SyncAction } from "../sync/types.js";
import {
  createWebSocketTransport,
  gatewayHttpOrigin,
  gatewayUrl,
  type WebSocketLike,
} from "../sync/websocket.js";

/** A controllable fake WebSocket implementing the slice the transport uses. */
class FakeSocket implements WebSocketLike {
  readyState = 0;
  sent: string[] = [];
  onopen: ((ev: unknown) => unknown) | null = null;
  onclose: ((ev: unknown) => unknown) | null = null;
  onerror: ((ev: unknown) => unknown) | null = null;
  onmessage: ((ev: { data: unknown }) => unknown) | null = null;
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.(null);
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.(null);
  }
  receive(data: unknown): void {
    this.onmessage?.({ data });
  }
}

describe("gatewayUrl", () => {
  it("builds a ws URL with deck (and optional suffix) from the location", () => {
    const loc = { protocol: "http:", host: "10.0.0.5:4321" } as Location;
    expect(gatewayUrl("/__astro-slides/sync", "talk", "", loc)).toBe(
      "ws://10.0.0.5:4321/__astro-slides/sync?deck=talk",
    );
    expect(gatewayUrl("/__astro-slides/sync", "talk", "preview", loc)).toContain("suffix=preview");
  });
  it("upgrades to wss on https", () => {
    const loc = { protocol: "https:", host: "h" } as Location;
    expect(gatewayUrl("/s", "d", "", loc)).toMatch(/^wss:\/\//);
  });

  // Deployed decks (issue #62): the path can be an absolute gateway URL.
  it("accepts an absolute gateway URL, translating scheme and defaulting the path", () => {
    const loc = { protocol: "https:", host: "site.example" } as Location;
    expect(gatewayUrl("wss://live.example.com", "talk", "", loc)).toBe(
      "wss://live.example.com/__astro-slides/sync?deck=talk",
    );
    expect(gatewayUrl("https://live.example.com", "talk", "", loc)).toMatch(/^wss:\/\//);
    expect(gatewayUrl("http://10.0.0.5:8787", "talk", "", loc)).toBe(
      "ws://10.0.0.5:8787/__astro-slides/sync?deck=talk",
    );
    // An explicit path on the URL is kept.
    expect(gatewayUrl("wss://live.example.com/custom/sync", "d", "s", loc)).toBe(
      "wss://live.example.com/custom/sync?deck=d&suffix=s",
    );
  });
});

describe("gatewayHttpOrigin", () => {
  it("is empty for same-origin dev paths", () => {
    expect(gatewayHttpOrigin("/__astro-slides/sync")).toBe("");
    expect(gatewayHttpOrigin("")).toBe("");
  });
  it("maps ws(s) gateway URLs to their http(s) origin", () => {
    expect(gatewayHttpOrigin("wss://live.example.com/x")).toBe("https://live.example.com");
    expect(gatewayHttpOrigin("ws://10.0.0.5:8787")).toBe("http://10.0.0.5:8787");
    expect(gatewayHttpOrigin("https://live.example.com")).toBe("https://live.example.com");
  });
});

describe("createWebSocketTransport", () => {
  it("buffers posts made before open, then flushes on open", () => {
    const socket = new FakeSocket();
    const t = createWebSocketTransport("d", {
      path: "/sync",
      makeSocket: () => socket,
    });
    t.post({ type: "goto", no: 2, step: 0 });
    expect(socket.sent).toHaveLength(0); // not open yet
    socket.open();
    // The join `hello` from the transport isn't posted (the store posts hello); the
    // buffered goto flushes on open.
    expect(socket.sent).toContainEqual(JSON.stringify({ type: "goto", no: 2, step: 0 }));
    t.close();
  });

  it("parses incoming JSON and dispatches to subscribers", () => {
    const socket = new FakeSocket();
    const t = createWebSocketTransport("d", { path: "/sync", makeSocket: () => socket });
    const seen: SyncAction[] = [];
    t.subscribe((a) => seen.push(a));
    socket.open();
    socket.receive(JSON.stringify({ type: "blackout", on: true }));
    socket.receive("not json{"); // ignored
    socket.receive(42); // non-string ignored
    expect(seen).toEqual([{ type: "blackout", on: true }]);
    t.close();
  });

  it("reconnects with backoff on close and stops after close()", () => {
    vi.useFakeTimers();
    let made = 0;
    let last = new FakeSocket();
    const t = createWebSocketTransport("d", {
      path: "/sync",
      reconnectMs: 100,
      makeSocket: () => {
        made++;
        last = new FakeSocket();
        return last;
      },
    });
    expect(made).toBe(1);
    last.onclose?.(null); // server dropped us
    vi.advanceTimersByTime(100);
    expect(made).toBe(2); // reconnected
    t.close();
    last.onclose?.(null);
    vi.advanceTimersByTime(10_000);
    expect(made).toBe(2); // no reconnect after close()
    vi.useRealTimers();
  });
});
