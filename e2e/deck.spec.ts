import { expect, test } from "@playwright/test";

test.describe("deck runtime", () => {
  test("renders every slide with the current one present", async ({ page }) => {
    await page.goto("/slides/1");
    await expect(page.locator(".as-slide")).toHaveCount(10);
    await expect(page.locator('.as-slide[data-slide-no="1"]')).toHaveClass(/present/);
    await expect(page.locator('.as-slide[data-slide-no="2"]')).toHaveClass(/future/);
  });

  test("steps through clicks before advancing the slide", async ({ page }) => {
    await page.goto("/slides/9"); // the click-demo slide
    const shownCount = () =>
      page.locator('.as-slide[data-slide-no="9"] [data-click].as-click-shown').count();
    expect(await shownCount()).toBe(0);

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/9\?step=1/);
    expect(await shownCount()).toBe(1);

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/9\?step=2/);
    expect(await shownCount()).toBe(2);

    // Still on slide 9 (walking clicks, not slides).
    await expect(page.locator('.as-slide[data-slide-no="9"]')).toHaveClass(/present/);
  });

  test("wraps each slide in its resolved layout", async ({ page }) => {
    await page.goto("/slides/1");
    // Cover slide uses the cover layout; the two-cols slide renders two columns.
    await expect(page.locator('[data-slide-no="1"] .layout-cover')).toBeVisible();
    await expect(page.locator('[data-slide-no="5"] .layout-two-cols .layout-col')).toHaveCount(2);
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
