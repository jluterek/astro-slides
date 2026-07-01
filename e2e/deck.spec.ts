import { expect, test } from "@playwright/test";

test.describe("deck runtime", () => {
  test("renders every slide with the current one present", async ({ page }) => {
    await page.goto("/slides/1");
    await expect(page.locator(".as-slide")).toHaveCount(3);
    await expect(page.locator('.as-slide[data-slide-no="1"]')).toHaveClass(/present/);
    await expect(page.locator('.as-slide[data-slide-no="2"]')).toHaveClass(/future/);
  });

  test("advances with ArrowRight and mirrors the slide into the URL", async ({ page }) => {
    await page.goto("/slides/1");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/2$/);
    await expect(page.locator('.as-slide[data-slide-no="2"]')).toHaveClass(/present/);
  });

  test("goes back with ArrowLeft and browser history", async ({ page }) => {
    await page.goto("/slides/1");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/2$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/slides\/1$/);
    await expect(page.locator('.as-slide[data-slide-no="1"]')).toHaveClass(/present/);
  });

  test("reads the initial slide from the URL", async ({ page }) => {
    await page.goto("/slides/3");
    await expect(page.locator('.as-slide[data-slide-no="3"]')).toHaveClass(/present/);
  });

  test("toggles overview mode with the O key", async ({ page }) => {
    await page.goto("/slides/1");
    await page.keyboard.press("o");
    await expect(page.locator(".as-deck")).toHaveClass(/as-overview/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".as-deck")).not.toHaveClass(/as-overview/);
  });

  test("scales the viewport to fit the window", async ({ page }) => {
    await page.goto("/slides/1");
    const scale = await page
      .locator(".as-deck")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--as-scale").trim());
    expect(Number(scale)).toBeGreaterThan(0);
    expect(Number(scale)).toBeLessThanOrEqual(1);
  });
});
