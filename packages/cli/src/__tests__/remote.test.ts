import { describe, expect, it } from "vitest";
import { buildRemoteUrl, deriveToken, lanAddress } from "../main.js";

describe("deriveToken", () => {
  it("is stable and short for a given password", () => {
    const t = deriveToken("hunter2");
    expect(t).toHaveLength(12);
    expect(t).toBe(deriveToken("hunter2"));
    expect(t).not.toBe(deriveToken("other"));
  });
});

describe("buildRemoteUrl", () => {
  it("builds the /entry URL, with the token when present", () => {
    expect(buildRemoteUrl({ host: "10.0.0.5", port: 4321 })).toBe("http://10.0.0.5:4321/entry");
    expect(buildRemoteUrl({ host: "h", port: 3000, token: "abc" })).toBe(
      "http://h:3000/entry?token=abc",
    );
  });
});

describe("lanAddress", () => {
  it("picks the first non-internal IPv4", () => {
    const ifaces = {
      lo0: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
      en0: [
        { family: "IPv6", internal: false, address: "fe80::1" },
        { family: "IPv4", internal: false, address: "192.168.1.42" },
      ],
      // biome-ignore lint/suspicious/noExplicitAny: minimal fixture of os.networkInterfaces()
    } as any;
    expect(lanAddress(ifaces)).toBe("192.168.1.42");
  });

  it("returns null when only loopback is available", () => {
    const ifaces = {
      lo0: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
      // biome-ignore lint/suspicious/noExplicitAny: minimal fixture
    } as any;
    expect(lanAddress(ifaces)).toBeNull();
  });
});
