import { expect, test } from "@playwright/test";

test.describe("deck runtime", () => {
  test("renders every slide with the current one present", async ({ page }) => {
    await page.goto("/slides/1");
    await expect(page.locator(".as-slide")).toHaveCount(22);
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

  test("carries the resolved transition onto the deck root and slides", async ({ page }) => {
    await page.goto("/slides/1");
    // Deck default transition (fade) is mirrored onto the root...
    await expect(page.locator(".as-deck")).toHaveAttribute("data-transition", "fade");
    // ...and the per-slide `transition: slide-left` override reaches its section.
    await expect(page.locator('.as-slide[data-slide-no="10"]')).toHaveAttribute(
      "data-transition",
      "slide-left",
    );
  });

  test("keeps a morphed element present across the slide change", async ({ page }) => {
    // Slides 11 and 12 share a `<Morph id="hero">`. After advancing, the incoming
    // slide's morph element is present and settled (no view-transition-name leaks).
    await page.goto("/slides/11");
    await expect(page.locator('.as-slide[data-slide-no="11"] [data-morph="hero"]')).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/12$/);
    const hero = page.locator('.as-slide[data-slide-no="12"] [data-morph="hero"]');
    await expect(hero).toBeVisible();
    // The transition drops any dynamically-assigned view-transition-name when it ends.
    await expect
      .poll(() =>
        hero.evaluate((el) => getComputedStyle(el).getPropertyValue("view-transition-name")),
      )
      .toMatch(/^(none|)$/);
  });

  test("renders a Shiki-highlighted code block with the highlighted lines", async ({ page }) => {
    await page.goto("/slides/13");
    const block = page.locator('.as-slide[data-slide-no="13"] .as-code .shiki');
    await expect(block).toBeVisible();
    // Tokenized into colored spans (not a plain <pre>).
    await expect(block.locator("span").first()).toBeVisible();
    // `{2,4}` highlighted two lines.
    await expect(page.locator('.as-slide[data-slide-no="13"] .line.highlighted')).toHaveCount(2);
  });

  test("reveals click-stepped code lines as the step advances", async ({ page }) => {
    await page.goto("/slides/14");
    const shown = () =>
      page.locator('.as-slide[data-slide-no="14"] .as-code-line.as-click-shown').count();
    expect(await shown()).toBe(0);
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/14\?step=1/);
    expect(await shown()).toBe(1);
    await page.keyboard.press("ArrowRight");
    expect(await shown()).toBe(2);
  });

  test("animates a Magic Move block through its steps", async ({ page }) => {
    await page.goto("/slides/16");
    const mm = page.locator('.as-slide[data-slide-no="16"] .as-magic-move');
    await expect(mm).toBeVisible();
    // Hydrated: the renderer injected token elements into the empty container.
    await expect(mm.locator("span").first()).toBeVisible();
    const initial = (await mm.textContent()) ?? "";
    expect(initial).toContain("reduce");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/16\?step=1/);
    // Advancing changed the rendered code (step 2 introduces `item.price`).
    await expect(mm).toContainText("price");
  });

  test("renders KaTeX math and links its stylesheet only when the deck uses math", async ({
    page,
  }) => {
    await page.goto("/slides/17");
    // Inline + block math both rendered by KaTeX at build time.
    await expect(page.locator('.as-slide[data-slide-no="17"] .katex').first()).toBeVisible();
    await expect(
      page.locator('.as-slide[data-slide-no="17"] .katex-display').first(),
    ).toBeVisible();
    // The deck has math, so its stylesheet is linked.
    await expect(page.locator('link[href*="katex"]')).toHaveCount(1);
  });

  test("reveals stepped math rows as the step advances", async ({ page }) => {
    await page.goto("/slides/18");
    const shown = () =>
      page.locator('.as-slide[data-slide-no="18"] .as-math-row.as-click-shown').count();
    expect(await shown()).toBe(0);
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/slides\/18\?step=1/);
    expect(await shown()).toBe(1);
    await page.keyboard.press("ArrowRight");
    expect(await shown()).toBe(2);
  });

  test("renders a Mermaid diagram as SVG inside a Shadow DOM", async ({ page }) => {
    await page.goto("/slides/19");
    const host = page.locator('.as-slide[data-slide-no="19"] .as-mermaid');
    await expect(host).toBeVisible();
    // The SVG lives in the shadow root (CSS isolation) — assert via the host's shadow.
    await expect
      .poll(async () => host.evaluate((el) => el.shadowRoot?.querySelector("svg") != null))
      .toBe(true);
  });

  test("renders a PlantUML diagram as a server image", async ({ page }) => {
    await page.goto("/slides/20");
    const img = page.locator('.as-slide[data-slide-no="20"] img.as-plantuml');
    await expect(img).toHaveAttribute("src", /plantuml\.com\/plantuml\/svg\//);
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
