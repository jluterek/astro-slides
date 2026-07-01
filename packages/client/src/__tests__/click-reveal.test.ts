// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDeck } from "../runtime.js";

function buildClickDeck(): HTMLElement {
  const root = document.createElement("div");
  root.className = "as-deck";
  root.dataset.deck = "talk";
  root.innerHTML = `
    <div class="as-viewport">
      <section class="as-slide present" data-slide-no="1" data-title="Clicks">
        <span data-click="1">a</span>
        <span data-click="2">b</span>
        <span data-click="2" data-click-to="3">range</span>
        <span data-click="4">d</span>
      </section>
    </div>
    <div class="as-status" aria-live="polite"></div>`;
  document.body.append(root);
  return root;
}

const shown = (root: HTMLElement, i: number): boolean =>
  root.querySelectorAll<HTMLElement>("[data-click]")[i]?.classList.contains("as-click-shown") ??
  false;

let handle: ReturnType<typeof initDeck> | null = null;
beforeEach(() => {
  history.replaceState(null, "", "/talk/1");
  document.body.innerHTML = "";
});
afterEach(() => {
  handle?.destroy();
  handle = null;
});

describe("click-step reveal", () => {
  it("derives the step total from the DOM when metadata is absent", () => {
    handle = initDeck(buildClickDeck());
    // max(data-click, data-click-to) across the slide = 4.
    expect(handle.controller.current).toEqual({ slide: 1, step: 0 });
    handle.controller.last();
    expect(handle.controller.current.step).toBe(4);
  });

  it("reveals point clicks cumulatively as the step advances", () => {
    const root = buildClickDeck();
    handle = initDeck(root);
    handle.controller.goto(1, 0);
    expect([shown(root, 0), shown(root, 1)]).toEqual([false, false]);
    handle.controller.goto(1, 1);
    expect([shown(root, 0), shown(root, 1)]).toEqual([true, false]);
    handle.controller.goto(1, 2);
    expect([shown(root, 0), shown(root, 1)]).toEqual([true, true]);
  });

  it("hides a range element once the step passes its end", () => {
    const root = buildClickDeck();
    handle = initDeck(root);
    handle.controller.goto(1, 2); // within [2,3]
    expect(shown(root, 2)).toBe(true);
    handle.controller.goto(1, 4); // past the range end (3)
    expect(shown(root, 2)).toBe(false);
    // point clicks remain shown
    expect(shown(root, 0)).toBe(true);
  });
});
