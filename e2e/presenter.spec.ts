import { expect, test } from "@playwright/test";

test.describe("presenter mode + sync", () => {
  test("syncs slide changes between two same-origin windows both ways", async ({ context }) => {
    // Two tabs of the audience deck share a BroadcastChannel (ADR-0010).
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto("/slides/1");
    await b.goto("/slides/1");

    // Advance in A → B follows.
    await a.keyboard.press("ArrowRight");
    await expect(b.locator('.as-slide[data-slide-no="2"]')).toHaveClass(/present/);

    // Advance in B → A follows (bidirectional).
    await b.keyboard.press("ArrowRight");
    await expect(a.locator('.as-slide[data-slide-no="3"]')).toHaveClass(/present/);

    await a.close();
    await b.close();
  });

  test("presenter navigation drives the audience window", async ({ context }) => {
    const audience = await context.newPage();
    const presenter = await context.newPage();
    await audience.goto("/slides/1");
    await presenter.goto("/presenter/slides/1");

    // The presenter renders three panes (current + next iframes, notes).
    await expect(presenter.locator("iframe[title='Current slide']")).toBeVisible();
    await expect(presenter.locator("iframe[title='Next slide']")).toBeVisible();

    // Clicking Next in the presenter advances the audience deck.
    await presenter.getByRole("button", { name: "Next" }).click();
    await expect(audience.locator('.as-slide[data-slide-no="2"]')).toHaveClass(/present/);

    await audience.close();
    await presenter.close();
  });

  test("blackout from the presenter blacks out the audience", async ({ context }) => {
    const audience = await context.newPage();
    const presenter = await context.newPage();
    await audience.goto("/slides/1");
    await presenter.goto("/presenter/slides/1");

    await expect(audience.locator(".as-blackout")).toBeHidden();
    await presenter.getByRole("button", { name: "Black" }).click();
    await expect(audience.locator(".as-blackout")).toBeVisible();

    await audience.close();
    await presenter.close();
  });

  test("shows speaker notes with the current click marker highlighted", async ({ page }) => {
    // Slide 21 has stepped notes (`[click]` markers).
    await page.goto("/presenter/slides/21");
    const notes = page.locator(".as-notes");
    await expect(notes).toBeVisible();
    await expect(notes.locator(".as-note-click")).toHaveCount(2);
  });
});
