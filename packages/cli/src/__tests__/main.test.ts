import { describe, expect, it } from "vitest";
import { keyToAction, main, SHORTCUTS, shortcutHelp } from "../main.js";

describe("keyToAction", () => {
  it("maps keys to actions", () => {
    expect(keyToAction("q", { ctrl: false, name: "q" })).toBe("quit");
    expect(keyToAction("r", { ctrl: false, name: "r" })).toBe("restart");
    expect(keyToAction("?", { ctrl: false, name: undefined })).toBe("help");
    expect(keyToAction("x", { ctrl: false, name: "x" })).toBeNull();
  });

  it("treats Ctrl-C as quit", () => {
    expect(keyToAction("", { ctrl: true, name: "c" })).toBe("quit");
  });
});

describe("shortcutHelp", () => {
  it("lists every shortcut key", () => {
    const help = shortcutHelp();
    for (const key of Object.keys(SHORTCUTS)) expect(help).toContain(key);
  });
});

describe("main command", () => {
  it("registers dev, build, export, and mcp-server subcommands", () => {
    const subs = main.subCommands as Record<string, unknown>;
    expect(Object.keys(subs)).toEqual(["dev", "build", "export", "mcp-server"]);
  });
});
