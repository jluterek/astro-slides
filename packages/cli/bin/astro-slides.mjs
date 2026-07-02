#!/usr/bin/env node
// Entry point. Published installs run the compiled `dist/` (Node REFUSES type-stripping
// for files under node_modules, so importing ../src/main.ts would crash every registry
// install). In the workspace, dist may not exist yet — fall back to the TS source via
// Node's native type stripping (Node 22.18+/24).
let main;
try {
  ({ main } = await import("../dist/main.js"));
} catch {
  ({ main } = await import("../src/main.ts"));
}
const { runMain } = await import("citty");

runMain(main);
