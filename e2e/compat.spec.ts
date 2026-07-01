import { expect, test } from "@playwright/test";

/**
 * Marp/Slidev compatibility (Phase 15). The `compat` deck (examples/minimal/content/decks/
 * compat) exercises the Slidev `v-click` directive aliases and the component shims in a real
 * build. Marp directive/image translation is covered by parser unit tests.
 */
test.describe("Slidev compat", () => {
  test("v-click aliases become click-stepped reveals (element + attribute forms)", async ({
    page,
  }) => {
    await page.goto("/compat/2");
    // Two reveals on this slide: the <v-click> element and the `v-click` attribute form.
    const clicks = page.locator('.as-slide[data-slide-no="2"] [data-click]');
    await expect(clicks).toHaveCount(2);
    // Before stepping, revealed content is hidden.
    const first = clicks.first();
    await expect(first).not.toHaveClass(/as-click-shown/);
    // Advance one step → the first reveal shows.
    await page.keyboard.press("ArrowRight");
    await expect(first).toHaveClass(/as-click-shown/);
  });

  test("the Youtube shim renders an embed iframe", async ({ page }) => {
    await page.goto("/compat/3");
    const iframe = page.locator('iframe[src*="youtube.com/embed/dQw4w9WgXcQ"]');
    await expect(iframe).toHaveCount(1);
  });

  test("the AutoFitText shim renders fit-text markup", async ({ page }) => {
    await page.goto("/compat/3");
    await expect(page.locator(".p-fittext")).toHaveCount(1);
  });
});
