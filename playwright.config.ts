import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const isCI = !!process.env.CI;

/**
 * End-to-end tests for the in-browser slide runtime. The web server builds the
 * minimal example and serves the static output; tests drive real keyboard/URL
 * navigation against it. Locally an already-running `astro preview` is reused.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "dot" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "pnpm --filter @astro-slides/example-minimal exec astro build && " +
      `pnpm --filter @astro-slides/example-minimal exec astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}/slides/1`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
