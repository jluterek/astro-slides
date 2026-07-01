import { expect, test } from "@playwright/test";

/**
 * Theme-by-name switching (Phase 16). A deck opts into a bundled theme via `theme:` headmatter;
 * the deck route stamps `data-theme="<name>"` on `.as-deck` and the non-default themes scope
 * their `--slide-*` tokens under `[data-theme="<name>"]`. The default `slides` deck (theme:
 * starter) resolves tokens from `:root`, so the two decks must compute different values. Cosmic
 * is the flagship: dark-primary palette + self-hosted Space Grotesk headings.
 */
test.describe("Theme switching", () => {
  test("the cosmic deck stamps data-theme and renders cosmic tokens", async ({ page }) => {
    await page.goto("/cosmic/1");
    const deck = page.locator(".as-deck");
    await expect(deck).toHaveAttribute("data-theme", "cosmic");

    // The cosmic accent token differs from starter's — proves the scoped override resolves.
    const accent = await deck.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--slide-accent").trim(),
    );
    expect(accent).not.toBe("");
    expect(accent).toContain("285"); // cosmic accent hue; starter's is 264.
  });

  test("the starter deck keeps the default :root tokens", async ({ page }) => {
    await page.goto("/slides/1");
    const deck = page.locator(".as-deck");
    await expect(deck).toHaveAttribute("data-theme", "starter");
    const accent = await deck.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--slide-accent").trim(),
    );
    // Starter accent hue is 264 — distinct from cosmic's 285.
    expect(accent).toContain("264");
  });

  test("cosmic headings use the self-hosted Space Grotesk display face", async ({ page }) => {
    await page.goto("/cosmic/1");
    const heading = page.locator('.as-slide[data-slide-no="1"] h1');
    const family = await heading.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain("Space Grotesk");
  });
});
