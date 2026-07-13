import { type ChildProcess, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * Audience-engagement join flow (Phase 19). Unlike the other specs (static preview via
 * the shared webServer), this drives a REAL `dev --remote` gateway: a deck window and
 * an audience "phone" page in separate browser contexts, connected over the gateway's
 * WebSocket. Serial — one dev server for the whole file, on its own port.
 */

const ROOT = fileURLToPath(new URL("../examples/audience-engagement", import.meta.url));
const BIN = fileURLToPath(new URL("../packages/cli/bin/astro-slides.mjs", import.meta.url));

let dev: ChildProcess;
let base = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // Clean slate: engagement results PERSIST across runs by design (that's the
  // feature) — wipe the example's saved votes so the tally assertions are absolute.
  rmSync(join(ROOT, ".astro-slides", "engagement"), { recursive: true, force: true });
  // Own port: the shared e2e webServer holds 4321, and two servers on one port
  // silently share it via SO_REUSEPORT (the #29 lesson) — requests would round-robin.
  dev = spawn("node", [BIN, "dev", ".", "--remote", "--port", "4471"], { cwd: ROOT });
  base = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("dev --remote did not start")), 90_000);
    dev.stdout?.on("data", (d: Buffer) => {
      const m = String(d).match(/http:\/\/localhost:(\d+)/);
      if (m) {
        clearTimeout(t);
        resolve(`http://localhost:${m[1]}`);
      }
    });
  });
});

test.afterAll(() => {
  dev?.kill();
});

test("audience joins by URL, votes, and the tally lands on the slide", async ({ browser }) => {
  test.setTimeout(60_000);
  const deck = await (await browser.newContext()).newPage();
  const phone = await (
    await browser.newContext({ viewport: { width: 390, height: 800 } })
  ).newPage();

  // The deck window opens the poll slide and publishes the active poll.
  await deck.goto(`${base}/engage/2`, { waitUntil: "domcontentloaded" });
  await expect
    .poll(
      () =>
        deck.evaluate(
          () => (window as { __ASTRO_SLIDES_SYNC__?: string }).__ASTRO_SLIDES_SYNC__ ?? null,
        ),
      {
        timeout: 15_000,
      },
    )
    .toBe("/__astro-slides/sync");

  // The audience page sees the poll go active with its question.
  await phone.goto(`${base}/audience?deck=engage`, { waitUntil: "domcontentloaded" });
  await expect(phone.locator("#poll")).toHaveClass(/active/, { timeout: 15_000 });
  await expect(phone.locator("#poll-q")).toContainText("How are you presenting");

  // A vote from the phone tallies live on the slide.
  await phone.locator("#poll-opts button").nth(1).click();
  await expect(deck.locator(".as-poll-total")).toHaveText("1 vote", { timeout: 10_000 });
  await expect(deck.locator(".as-poll-count").nth(1)).toHaveText("1");

  // Server-side scoping: a forged `goto` from an audience socket must be dropped.
  await phone.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://${location.host}/__astro-slides/sync?deck=engage&role=audience`,
        );
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "goto", no: 4, step: 0 }));
          setTimeout(resolve, 600);
        };
        ws.onerror = () => resolve();
      }),
  );
  await deck.waitForTimeout(500);
  await expect(deck.locator(".as-slide.present")).toHaveAttribute("data-slide-no", "2");
});
