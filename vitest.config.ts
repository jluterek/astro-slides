import { defineConfig } from "vitest/config";

// Single root config for the whole monorepo. Tests are discovered from every
// package's `src/`; individual packages should NOT add their own vitest config
// unless they need a different environment (e.g. the client package may opt into
// jsdom later via `test.projects`).
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "**/dist/**"],
    },
  },
});
