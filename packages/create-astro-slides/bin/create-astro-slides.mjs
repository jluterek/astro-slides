#!/usr/bin/env node
// Entry point. Runs directly from TypeScript source via Node's native type stripping
// (Node 24+). No build step needed for local/workspace use.
import { run } from "../src/main.ts";

run(process.argv.slice(2));
