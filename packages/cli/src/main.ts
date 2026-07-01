import { emitKeypressEvents, type Key } from "node:readline";
import { defineCommand } from "citty";
import pc from "picocolors";

/**
 * The `astro-slides` CLI. Self-contained (no relative imports) so the `bin` can run it
 * directly under Node's native TypeScript support. `dev`/`build` drive Astro through its
 * programmatic API; `export`/`mcp-server` are registered here but land in Phases 12/14.
 */

/** In-TTY shortcuts shown while the dev server runs. */
export const SHORTCUTS: Record<string, string> = {
  r: "restart the dev server",
  o: "open the deck in your browser",
  e: "open the deck source in your editor",
  c: "clear the console",
  m: "toggle the MCP server",
  q: "quit",
  "?": "show this shortcut list",
};

export function shortcutHelp(): string {
  const lines = Object.entries(SHORTCUTS).map(
    ([key, desc]) => `  ${pc.bold(pc.cyan(key))}  ${pc.dim(desc)}`,
  );
  return `${pc.bold("Shortcuts")}\n${lines.join("\n")}`;
}

export type ShortcutAction = "restart" | "open" | "edit" | "clear" | "mcp" | "quit" | "help" | null;

/** Map a keypress to a shortcut action. Ctrl-C always quits. Pure — unit-tested. */
export function keyToAction(
  str: string | undefined,
  key: Pick<Key, "ctrl" | "name">,
): ShortcutAction {
  if (key.ctrl && key.name === "c") return "quit";
  switch (str) {
    case "r":
      return "restart";
    case "o":
      return "open";
    case "e":
      return "edit";
    case "c":
      return "clear";
    case "m":
      return "mcp";
    case "q":
      return "quit";
    case "?":
      return "help";
    default:
      return null;
  }
}

/** Attach the TTY keypress handler. Returns a detach function. No-op when not a TTY. */
export function attachShortcuts(
  handlers: Partial<Record<ShortcutAction & string, () => void>>,
): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY) return () => {};
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  const onKey = (str: string | undefined, key: Key): void => {
    const action = keyToAction(str, key);
    if (action === "help") {
      console.log(shortcutHelp());
      return;
    }
    if (action && handlers[action]) handlers[action]?.();
  };
  stdin.on("keypress", onKey);
  return () => {
    stdin.off("keypress", onKey);
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
  };
}

// Minimal shape of Astro's programmatic API we rely on (avoids a hard type dep).
interface AstroModule {
  dev(config: { root: string }): Promise<{ stop(): Promise<void> }>;
  build(config: { root: string }): Promise<unknown>;
}

const devCommand = defineCommand({
  meta: { name: "dev", description: "Start the dev server and watch the deck." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
  },
  async run({ args }) {
    const astro = (await import("astro")) as unknown as AstroModule;
    const root = args.root ?? process.cwd();
    const server = await astro.dev({ root });
    console.log(shortcutHelp());
    const quit = async (): Promise<void> => {
      await server.stop();
      process.exit(0);
    };
    attachShortcuts({
      quit: () => void quit(),
      clear: () => console.clear(),
    });
  },
});

const buildCommand = defineCommand({
  meta: { name: "build", description: "Build the deck to static output." },
  args: {
    root: { type: "positional", required: false, description: "Project directory (default: cwd)." },
  },
  async run({ args }) {
    const astro = (await import("astro")) as unknown as AstroModule;
    await astro.build({ root: args.root ?? process.cwd() });
  },
});

const notImplemented = (name: string, phase: string) =>
  defineCommand({
    meta: { name, description: `(${phase}) not implemented yet.` },
    run() {
      console.error(pc.yellow(`\`astro-slides ${name}\` arrives in ${phase}.`));
      process.exit(1);
    },
  });

export const main = defineCommand({
  meta: {
    name: "astro-slides",
    version: "0.0.0",
    description: "Author, present, and export web-native slide decks.",
  },
  subCommands: {
    dev: devCommand,
    build: buildCommand,
    export: notImplemented("export", "Phase 12"),
    "mcp-server": notImplemented("mcp-server", "Phase 14"),
  },
});
