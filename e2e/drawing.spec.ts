import { expect, test } from "@playwright/test";

test.describe("drawing overlay + sync", () => {
  test("toggles the drawing overlay with the D key", async ({ page }) => {
    await page.goto("/slides/1");
    const deck = page.locator(".as-deck");
    const toolbar = page.locator(".as-drawing-toolbar");

    // The surface exists but the toolbar is hidden until drawing is on.
    await expect(page.locator(".as-drawing-layer")).toHaveCount(1);
    await expect(toolbar).toBeHidden();

    await page.keyboard.press("d");
    await expect(deck).toHaveClass(/as-drawing-on/);
    await expect(toolbar).toBeVisible();

    await page.keyboard.press("d");
    await expect(deck).not.toHaveClass(/as-drawing-on/);
    await expect(toolbar).toBeHidden();
  });

  test("syncs an annotation to another window over BroadcastChannel", async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto("/slides/1");
    await b.goto("/slides/1");

    // Simulate a committed stroke on window A by broadcasting a `draw` action for
    // slide 1 / step 0 — the runtime reduces it and loads the SVG into the surface.
    await a.evaluate(() => {
      const ch = new BroadcastChannel("astro-slides:slides");
      ch.postMessage({
        type: "draw",
        key: "1:0",
        svg: '<path d="M10 10 L120 120" stroke="red" fill="none" />',
      });
      ch.close();
    });

    // Window B renders the annotation into its drawing layer.
    await expect(b.locator(".as-drawing-layer path")).toHaveCount(1);

    await a.close();
    await b.close();
  });
});
