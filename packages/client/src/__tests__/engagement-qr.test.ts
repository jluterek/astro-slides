import { describe, expect, it } from "vitest";
import { audienceJoinUrl } from "../engagement/index.js";

/** Audience-join URL for the in-deck QR overlay (issue #60). */

const loc = (protocol: string, hostname: string, port: string) => ({
  protocol,
  hostname,
  port,
  host: port ? `${hostname}:${port}` : hostname,
});

describe("audienceJoinUrl", () => {
  it("is null without a live gateway", () => {
    expect(audienceJoinUrl(undefined, "talk", undefined, loc("http:", "localhost", "3030"))).toBe(
      null,
    );
  });

  it("uses the page origin for the same-origin dev gateway", () => {
    expect(
      audienceJoinUrl("/__astro-slides/sync", "talk", undefined, loc("http:", "10.0.0.5", "3030")),
    ).toBe("http://10.0.0.5:3030/audience?deck=talk");
  });

  it("swaps a loopback host for the LAN publicHost so phones can follow", () => {
    expect(
      audienceJoinUrl(
        "/__astro-slides/sync",
        "talk",
        "192.168.1.20",
        loc("http:", "localhost", "3030"),
      ),
    ).toBe("http://192.168.1.20:3030/audience?deck=talk");
    // A non-loopback page host is already reachable — leave it alone.
    expect(
      audienceJoinUrl(
        "/__astro-slides/sync",
        "talk",
        "192.168.1.20",
        loc("http:", "10.0.0.5", "3030"),
      ),
    ).toBe("http://10.0.0.5:3030/audience?deck=talk");
  });

  it("uses the external gateway's own origin (issue #62 deployments)", () => {
    expect(
      audienceJoinUrl(
        "wss://live.example.com",
        "talk",
        undefined,
        loc("https:", "you.github.io", ""),
      ),
    ).toBe("https://live.example.com/audience?deck=talk");
  });

  it("URL-encodes the deck name", () => {
    expect(
      audienceJoinUrl("/__astro-slides/sync", "my talk", undefined, loc("http:", "h", "")),
    ).toBe("http://h/audience?deck=my%20talk");
  });
});
