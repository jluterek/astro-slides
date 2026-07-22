import { expect, test } from "@playwright/test";

/**
 * Read mode (issue #45): the annotated deck view at /read/<deck>. Prerendered — runs
 * against the shared static preview like the other specs.
 */
test.describe("read mode", () => {
  test("renders every slide with anchors, read prose beneath, and nav links", async ({ page }) => {
    await page.goto("/read/slides");
    // Every slide renders as a static block, in order, with per-slide anchors.
    await expect(page.locator(".as-read-entry")).toHaveCount(22);
    await expect(page.locator("#slide-1 .as-read-slide")).toBeVisible();
    // The slide content is actually painted (scaled, not collapsed).
    const h1 = page.locator("#slide-1 h1").first();
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(50);
    // Slide 1 carries ::read:: prose; the speaker-note text must NOT leak into it.
    const prose = page.locator("#slide-1 .as-read-prose");
    await expect(prose).toContainText("companion prose");
    // Slides without ::read:: render the block only.
    await expect(page.locator("#slide-2 .as-read-prose")).toHaveCount(0);
    // Click-stepped content is fully revealed (no runtime to step it).
    await expect(page.locator("#slide-9 [data-click]").first()).toBeVisible();
    // Nav links: back to the live deck and to print.
    await expect(page.locator('.as-read-header a[href$="/slides/1"]')).toHaveText(/Present/);
    await expect(page.locator('.as-read-header a[href$="/print/slides"]')).toHaveText("Print");
  });

  test("read prose never renders in the live deck or print", async ({ page }) => {
    await page.goto("/slides/1");
    await expect(page.locator(".as-deck")).not.toContainText("companion prose");
    await page.goto("/print/slides");
    await expect(page.locator("body")).not.toContainText("companion prose");
  });

  test("the help overlay offers the reading view", async ({ page }) => {
    await page.goto("/slides/1");
    await page.keyboard.press("?");
    await expect(page.locator(".as-help-read")).toHaveText(/reading view/);
  });
});
