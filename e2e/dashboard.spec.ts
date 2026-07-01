import { expect, test } from "@playwright/test";

/**
 * Deck dashboard + presenter launch. The minimal example has three decks, so `/` renders the
 * dashboard (a single-deck project would redirect instead). `P` and the help-overlay button open
 * the presenter view for the current slide in a new tab.
 */
test.describe("deck dashboard", () => {
  test("lists every deck with open / present / print links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Decks");
    await expect(page.locator(".card")).toHaveCount(3);
    // The cosmic deck exposes all three actions.
    await expect(page.locator('.card a[href="/cosmic/1"]').first()).toBeVisible();
    await expect(page.locator('a[href="/presenter/cosmic/1"]')).toBeVisible();
    await expect(page.locator('a[href="/print/cosmic"]')).toBeVisible();
  });
});

test.describe("presenter launch", () => {
  test("the P key opens the presenter view for the current slide", async ({ page, context }) => {
    await page.goto("/cosmic/2");
    const [popup] = await Promise.all([context.waitForEvent("page"), page.keyboard.press("p")]);
    await popup.waitForLoadState("domcontentloaded");
    expect(new URL(popup.url()).pathname).toBe("/presenter/cosmic/2");
  });

  test("the help overlay has a working presenter button", async ({ page, context }) => {
    await page.goto("/cosmic/1");
    await page.keyboard.press("Shift+?");
    const button = page.locator(".as-help-present");
    await expect(button).toBeVisible();
    const [popup] = await Promise.all([context.waitForEvent("page"), button.click()]);
    await popup.waitForLoadState("domcontentloaded");
    expect(new URL(popup.url()).pathname).toBe("/presenter/cosmic/1");
  });
});
