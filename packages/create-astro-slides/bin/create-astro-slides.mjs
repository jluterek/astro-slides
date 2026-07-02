#!/usr/bin/env node
// Entry point. Published installs run the compiled `dist/` (Node REFUSES type-stripping
// for files under node_modules, so importing ../src/main.ts would crash every
// `pnpm create astro-slides`). In the workspace, dist may not exist yet — fall back to
// the TS source via Node's native type stripping (Node 22.18+/24).
let run;
try {
  ({ run } = await import("../dist/main.js"));
} catch {
  ({ run } = await import("../src/main.ts"));
}

run(process.argv.slice(2));
