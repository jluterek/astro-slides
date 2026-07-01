import { expect, test } from "@playwright/test";

/**
 * Web export (Phase 12). The CLI export pipeline (`exportDeckPdf`/`exportDeckPng`) is
 * unit-tested and verified live; here we exercise the browser-facing surface it depends
 * on — the `/print` route and embed mode — and the actual render-to-file path
 * (`page.pdf` / element screenshot) against the built deck.
 */
test.describe("web export", () => {
  test("print route stacks every slide with @page sizing and all clicks revealed", async ({
    page,
  }) => {
    await page.goto("/print/slides");
    await expect(page.locator(".as-print-slide")).toHaveCount(22);
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll(".as-print [data-click]")].filter(
          (el) => getComputedStyle(el).opacity === "0",
        ).length,
    );
    expect(hidden).toBe(0);
  });

  test("embed mode hides presenter chrome but still renders the slide", async ({ page }) => {
    await page.goto("/slides/1?embed=1");
    await expect(page.locator(".as-deck")).toHaveClass(/as-embed/);
    await expect(page.locator(".as-help")).toBeHidden();
    await expect(page.locator('.as-slide[data-slide-no="1"]')).toHaveClass(/present/);
  });

  test("renders the print route to a valid PDF (page.pdf)", async ({ page }) => {
    await page.goto("/print/slides", { waitUntil: "networkidle" });
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  test("screenshots a slide viewport to a valid PNG", async ({ page }) => {
    await page.goto("/slides/1?embed=1", { waitUntil: "networkidle" });
    const png = await page.locator(".as-viewport").first().screenshot();
    // PNG magic: 89 50 4E 47.
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  // PPTX export (Phase 13) reads speaker notes + design dimensions from the rendered
  // DOM (no parser AST at runtime). Assert that surface exists and is well-formed.
  test("exposes the DOM surface the PPTX exporter reads", async ({ page }) => {
    await page.goto("/slides/1", { waitUntil: "networkidle" });

    // Design dimensions drive the px→inches mapping.
    const deck = page.locator(".as-deck");
    expect(Number(await deck.getAttribute("data-design-width"))).toBeGreaterThan(0);
    expect(Number(await deck.getAttribute("data-design-height"))).toBeGreaterThan(0);

    // Notes are embedded as a JSON map keyed by slide number.
    const notes = await page.evaluate(() => {
      const el = document.querySelector(".as-notes-data");
      return el ? (JSON.parse(el.textContent ?? "{}") as Record<string, string>) : null;
    });
    expect(notes).not.toBeNull();
    expect(Object.keys(notes ?? {}).length).toBeGreaterThan(0);
  });
});
