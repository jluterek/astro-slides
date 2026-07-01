import { describe, expect, it } from "vitest";
import { type HubClient, roomKey, SyncHub } from "../server/hub.js";

/** A synthetic gateway client that records what it was sent. */
function client(): HubClient & { received: string[] } {
  const received: string[] = [];
  return { received, send: (d) => received.push(d) };
}

describe("roomKey", () => {
  it("keys per deck with an optional suffix", () => {
    expect(roomKey("talk")).toBe("talk");
    expect(roomKey("talk", "preview")).toBe("talk:preview");
  });
});

describe("SyncHub", () => {
  it("relays a message to every other client in the room", () => {
    const hub = new SyncHub();
    const a = client();
    const b = client();
    const c = client();
    hub.join("r", a);
    hub.join("r", b);
    hub.join("r", c);

    const n = hub.broadcast("r", a, "hello");
    expect(n).toBe(2);
    expect(a.received).toEqual([]); // never echoed to the sender
    expect(b.received).toEqual(["hello"]);
    expect(c.received).toEqual(["hello"]);
  });

  it("isolates rooms (a phone only reaches its own deck)", () => {
    const hub = new SyncHub();
    const a = client();
    const other = client();
    hub.join("deck-a", a);
    hub.join("deck-b", other);
    hub.broadcast("deck-a", client(), "x");
    expect(a.received).toEqual(["x"]);
    expect(other.received).toEqual([]);
  });

  it("stops delivering after a client leaves", () => {
    const hub = new SyncHub();
    const a = client();
    const b = client();
    hub.join("r", a);
    const leave = hub.join("r", b);
    leave();
    hub.broadcast("r", a, "x");
    expect(b.received).toEqual([]);
    expect(hub.size("r")).toBe(1);
  });

  it("drops a client whose send throws (dead socket)", () => {
    const hub = new SyncHub();
    const dead: HubClient = {
      send: () => {
        throw new Error("closed");
      },
    };
    const live = client();
    hub.join("r", dead);
    hub.join("r", live);
    hub.broadcast("r", live, "x");
    expect(hub.size("r")).toBe(1); // dead one pruned
  });
});
