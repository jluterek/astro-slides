import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createSyncGateway, originAllowed } from "../server/gateway.js";

/** Cross-origin gateway hardening (issue #62). */

describe("originAllowed", () => {
  const allow = ["https://site.example"];
  it("accepts requests without an Origin header (non-browser / same-origin nav)", () => {
    expect(originAllowed(undefined, "gw.example", allow)).toBe(true);
  });
  it("accepts the gateway's own origin (its /audience and /entry pages)", () => {
    expect(originAllowed("https://gw.example", "gw.example", allow)).toBe(true);
    expect(originAllowed("http://localhost:8899", "localhost:8899", [])).toBe(true);
  });
  it("accepts allowlisted origins and rejects the rest", () => {
    expect(originAllowed("https://site.example", "gw.example", allow)).toBe(true);
    expect(originAllowed("https://evil.example", "gw.example", allow)).toBe(false);
    expect(originAllowed("https://evil.example", "gw.example", undefined)).toBe(false);
  });
  it("wildcard allows anything", () => {
    expect(originAllowed("https://anywhere.example", "gw.example", ["*"])).toBe(true);
  });
  it("rejects malformed origins", () => {
    expect(originAllowed("not a url", "gw.example", ["*"])).toBe(false);
  });
});

describe("engagement CORS", () => {
  const root = mkdtempSync(join(tmpdir(), "as-gateway-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const gateway = (allowOrigins?: string[]) =>
    createSyncGateway({
      root,
      deckTotals: () => ({}),
      defaultDeck: () => "d",
      allowOrigins,
    });

  it("answers preflight for allowlisted origins and refuses others", async () => {
    const { app } = gateway(["https://site.example"]);
    const ok = await app.request("/__astro-slides/engagement", {
      method: "OPTIONS",
      headers: { origin: "https://site.example", host: "gw.example" },
    });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://site.example");
    const bad = await app.request("/__astro-slides/engagement", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", host: "gw.example" },
    });
    expect(bad.status).toBe(403);
  });

  it("persists allowlisted cross-origin POSTs with ACAO, 403s disallowed ones", async () => {
    const { app } = gateway(["https://site.example"]);
    const post = (origin: string) =>
      app.request("/__astro-slides/engagement", {
        method: "POST",
        headers: { origin, host: "gw.example", "content-type": "application/json" },
        body: JSON.stringify({ deck: "d", polls: {}, questions: [] }),
      });
    const ok = await post("https://site.example");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://site.example");
    expect((await post("https://evil.example")).status).toBe(403);
  });

  it("keeps the dev gateway's same-origin behavior when no allowlist is set", async () => {
    const { app } = gateway(undefined);
    // No Origin header (same-origin request) → accepted, no CORS headers.
    const res = await app.request("/__astro-slides/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deck: "d", polls: {}, questions: [] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    // Cross-origin without an allowlist → refused.
    const bad = await app.request("/__astro-slides/engagement", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "gw.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ deck: "d", polls: {}, questions: [] }),
    });
    expect(bad.status).toBe(403);
  });
});
