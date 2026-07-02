import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listLayouts, listThemes } from "../discovery.js";
import { createDeckServer } from "../server.js";
import { buildExportArgs } from "../tools/media.js";
import { gatewayWsUrl } from "../tools/navigate.js";
import {
  bearerToken,
  createHttpApp,
  hostHeaderName,
  isLoopbackHost,
  startHttp,
  tokenMatches,
} from "../transports.js";

describe("buildExportArgs", () => {
  it("builds format + output + flags", () => {
    expect(buildExportArgs({ root: "/p", format: "pdf", output: "out.pdf" })).toEqual([
      "export",
      "/p",
      "--format",
      "pdf",
      "--output",
      "out.pdf",
    ]);
  });
  it("adds range, clicks, per-slide, rasterize", () => {
    const args = buildExportArgs({
      root: "/p",
      format: "pptx",
      range: "1-3",
      withClicks: true,
      perSlide: true,
      rasterize: true,
    });
    expect(args).toContain("--range");
    expect(args).toContain("1-3");
    expect(args).toContain("--with-clicks");
    expect(args).toContain("--per-slide");
    expect(args).toContain("--rasterize");
  });
});

describe("gatewayWsUrl", () => {
  it("switches http→ws and encodes deck + token", () => {
    expect(gatewayWsUrl("http://127.0.0.1:4321", "talk")).toBe(
      "ws://127.0.0.1:4321/__astro-slides/sync?deck=talk",
    );
    expect(gatewayWsUrl("http://h:4321", "talk", "secret")).toContain("token=secret");
  });
});

describe("transport auth helpers", () => {
  it("classifies loopback hosts", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
  });
  it("parses a bearer token", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
    expect(bearerToken("bearer xyz")).toBe("xyz");
    expect(bearerToken(undefined)).toBeUndefined();
    expect(bearerToken("Basic abc")).toBeUndefined();
  });
  it("refuses a non-loopback bind without a token", () => {
    expect(() =>
      startHttp({
        makeServer: () => createDeckServer({ root: "/p", readOnly: true }),
        host: "0.0.0.0",
        port: 0,
      }),
    ).toThrow(/non-loopback/);
  });
});

describe("createHttpApp auth gate", () => {
  const makeServer = () => createDeckServer({ root: "/p", readOnly: true });

  it("401s a token-protected endpoint without the bearer header", async () => {
    const app = createHttpApp({ makeServer, token: "s3cret" });
    const res = await app.request("/mcp", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
  });

  it("does not 401 when the correct bearer is sent", async () => {
    const app = createHttpApp({ makeServer, token: "s3cret" });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: { authorization: "Bearer s3cret", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).not.toBe(401);
  });

  it("403s a tokenless server on a non-loopback Host (DNS rebinding)", async () => {
    const app = createHttpApp({ makeServer });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: { host: "evil.example.com:4444", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).toBe(403);
  });

  it("403s a tokenless server on a non-loopback Origin", async () => {
    const app = createHttpApp({ makeServer });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        host: "127.0.0.1:4444",
        origin: "https://evil.example.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).toBe(403);
  });

  it("accepts a tokenless request with loopback Host and Origin", async () => {
    const app = createHttpApp({ makeServer });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        host: "localhost:4444",
        origin: "http://localhost:5173",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).not.toBe(403);
  });
});

describe("host/token helpers", () => {
  it("hostHeaderName strips ports and IPv6 brackets", () => {
    expect(hostHeaderName("127.0.0.1:4444")).toBe("127.0.0.1");
    expect(hostHeaderName("localhost")).toBe("localhost");
    expect(hostHeaderName("[::1]:4444")).toBe("::1");
    expect(hostHeaderName("::1")).toBe("::1");
    expect(hostHeaderName("evil.com:80")).toBe("evil.com");
  });

  it("tokenMatches accepts only the exact token", () => {
    expect(tokenMatches("s3cret", "s3cret")).toBe(true);
    expect(tokenMatches("wrong", "s3cret")).toBe(false);
    expect(tokenMatches(undefined, "s3cret")).toBe(false);
    expect(tokenMatches("", "s3cret")).toBe(false);
  });
});

describe("discovery", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "as-disc-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("lists built-in layouts and marks project overrides", () => {
    mkdirSync(join(root, "layouts"));
    writeFileSync(join(root, "layouts", "cover.astro"), "");
    writeFileSync(join(root, "layouts", "custom.astro"), "");
    const layouts = listLayouts(root);
    expect(layouts.find((l) => l.name === "cover")?.source).toBe("project");
    expect(layouts.find((l) => l.name === "default")?.source).toBe("builtin");
    expect(layouts.find((l) => l.name === "custom")?.source).toBe("project");
  });

  it("lists the built-in theme plus project theme folders", () => {
    mkdirSync(join(root, "themes", "cosmic"), { recursive: true });
    const themes = listThemes(root);
    expect(themes.find((t) => t.name === "starter")?.source).toBe("builtin");
    expect(themes.find((t) => t.name === "cosmic")?.source).toBe("project");
  });
});
