/**
 * The sync gateway's relay core (Phase 11), framework-agnostic and unit-tested. Clients
 * (WebSocket connections) join a "room" keyed by deck + channel suffix; a message from
 * one client is broadcast to every *other* client in the same room. This is a dumb relay
 * — the shared-state reducer + `hello`/`state` handshake live in the client store, so the
 * gateway never needs to understand the payloads. Cross-origin peers (phones, a second
 * screen) thus share the same channel semantics as same-origin `BroadcastChannel` tabs.
 */

export interface HubClient {
  send(data: string): void;
}

/** Room key from a deck id + optional channel suffix (mirrors `channelName`). */
export function roomKey(deck: string, suffix = ""): string {
  return suffix ? `${deck}:${suffix}` : deck;
}

export class SyncHub {
  private readonly rooms = new Map<string, Set<HubClient>>();

  /** Register a client in a room; returns a leave function. */
  join(room: string, client: HubClient): () => void {
    let set = this.rooms.get(room);
    if (!set) {
      set = new Set();
      this.rooms.set(room, set);
    }
    set.add(client);
    return () => this.leave(room, client);
  }

  leave(room: string, client: HubClient): void {
    const set = this.rooms.get(room);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) this.rooms.delete(room);
  }

  /** Send `data` to every client in `room` except `from`. Returns the number reached. */
  broadcast(room: string, from: HubClient, data: string): number {
    const set = this.rooms.get(room);
    if (!set) return 0;
    let n = 0;
    for (const client of set) {
      if (client === from) continue;
      try {
        client.send(data);
        n++;
      } catch {
        // A dead socket throws on send — drop it so it can't wedge the room.
        set.delete(client);
      }
    }
    return n;
  }

  /** Client count in a room (test/inspection aid). */
  size(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }
}
