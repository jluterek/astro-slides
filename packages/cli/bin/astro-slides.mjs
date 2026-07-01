#!/usr/bin/env node
// Entry point. Runs the CLI directly from TypeScript source via Node's native type
// stripping (Node 24+). No build step needed for local/workspace use.
import { runMain } from "citty";
import { main } from "../src/main.ts";

runMain(main);
