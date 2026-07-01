// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDeck } from "../runtime.js";

function buildDeck(current = 1): HTMLElement {
  const root = document.createElement("div");
  root.className = "as-deck";
  root.dataset.deck = "talk";
  root.dataset.designWidth = "1920";
  root.dataset.designHeight = "1080";
  const sections = [
    { no: 1, steps: 0, title: "Intro" },
    { no: 2, steps: 2, title: "Body" },
    { no: 3, steps: 0, title: "End" },
  ]
    .map(
      (s) =>
        `<section class="as-slide ${s.no === current ? "present" : s.no < current ? "past" : "future"}" ` +
        `data-slide-no="${s.no}" data-steps="${s.steps}" data-title="${s.title}"></section>`,
    )
    .join("");
  root.innerHTML = `<div class="as-viewport">${sections}</div><div class="as-status" aria-live="polite"></div>`;
  document.body.append(root);
  return root;
}

function press(key: string, code = key): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
}

let handle: ReturnType<typeof initDeck> | null = null;

beforeEach(() => {
  history.replaceState(null, "", "/talk/1");
  document.body.innerHTML = "";
});

afterEach(() => {
  handle?.destroy();
  handle = null;
});

describe("initDeck", () => {
  it("applies initial state from the URL", () => {
    history.replaceState(null, "", "/talk/2?step=1");
    const root = buildDeck(2);
    handle = initDeck(root);

    expect(handle.controller.current).toEqual({ slide: 2, step: 1 });
    expect(root.querySelector('[data-slide-no="2"]')?.classList.contains("present")).toBe(true);
    expect(root.dataset.current).toBe("2");
  });

  it("advances slides on ArrowRight and mirrors state into the URL", () => {
    const root = buildDeck(1);
    handle = initDeck(root);

    press("ArrowRight");
    expect(handle.controller.current).toEqual({ slide: 2, step: 0 });
    expect(location.pathname).toBe("/talk/2");
    expect(root.querySelector('[data-slide-no="2"]')?.classList.contains("present")).toBe(true);
  });

  it("walks click steps before changing slides, encoding step in the query", () => {
    const root = buildDeck(2);
    history.replaceState(null, "", "/talk/2");
    handle = initDeck(root);
    handle.controller.goto(2, 0);

    press("Space");
    expect(handle.controller.current).toEqual({ slide: 2, step: 1 });
    expect(location.search).toBe("?step=1");
  });

  it("announces the new slide to the aria-live region", () => {
    const root = buildDeck(1);
    handle = initDeck(root);
    press("ArrowRight");
    expect(root.querySelector(".as-status")?.textContent).toBe("Slide 2 of 3: Body");
  });

  it("opens the presenter view for the current slide with the P key", () => {
    const root = buildDeck(1);
    handle = initDeck(root);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    press("ArrowRight"); // -> slide 2
    press("p", "KeyP");
    expect(open).toHaveBeenCalledWith("/presenter/talk/2", "_blank", "noopener");
    open.mockRestore();
  });

  it("toggles overview with the O key", () => {
    const root = buildDeck(1);
    handle = initDeck(root);
    press("o", "KeyO");
    expect(root.classList.contains("as-overview")).toBe(true);
    expect(handle.store.overview.get()).toBe(true);
    press("Escape");
    expect(root.classList.contains("as-overview")).toBe(false);
  });

  it("honors browser back/forward via popstate", () => {
    const root = buildDeck(1);
    handle = initDeck(root);
    press("ArrowRight"); // -> /talk/2 (pushState)
    history.replaceState(null, "", "/talk/1"); // simulate popping back
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(handle.controller.current.slide).toBe(1);
    expect(root.querySelector('[data-slide-no="1"]')?.classList.contains("present")).toBe(true);
  });

  it("cleans up listeners on destroy", () => {
    const root = buildDeck(1);
    const h = initDeck(root);
    h.destroy();
    press("ArrowRight");
    expect(h.controller.current.slide).toBe(1);
    vi.restoreAllMocks();
  });
});
