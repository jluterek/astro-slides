// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDeck } from "../runtime.js";
import { getStartViewTransition, prefersReducedMotion } from "../transitions/detect.js";
import { matchMorphs } from "../transitions/flip.js";
import { createSlideTransition } from "../transitions/index.js";

function slide(html: string): HTMLElement {
  const el = document.createElement("section");
  el.innerHTML = html;
  return el;
}

describe("matchMorphs", () => {
  it("pairs elements by explicit data-morph id", () => {
    const from = slide(`<div data-morph="logo">A</div><div data-morph="x">B</div>`);
    const to = slide(`<div data-morph="logo">A'</div>`);
    const pairs = matchMorphs(from, to);
    expect(pairs).toHaveLength(1);
    expect((pairs[0]?.from as HTMLElement).textContent).toBe("A");
    expect((pairs[0]?.to as HTMLElement).textContent).toBe("A'");
  });

  it("falls back to matching headings by tag + text", () => {
    const from = slide(`<h2>Roadmap</h2><h2>Other</h2>`);
    const to = slide(`<h2>Roadmap</h2>`);
    const pairs = matchMorphs(from, to);
    expect(pairs).toHaveLength(1);
    expect((pairs[0]?.from as HTMLElement).textContent).toBe("Roadmap");
  });

  it("does not match headings with differing tag levels", () => {
    const from = slide(`<h2>Title</h2>`);
    const to = slide(`<h3>Title</h3>`);
    expect(matchMorphs(from, to)).toHaveLength(0);
  });

  it("prefers a data-morph id over the heading heuristic and never reuses a target", () => {
    const from = slide(`<h2 data-morph="t">Title</h2>`);
    const to = slide(`<h2 data-morph="t">Title</h2>`);
    // Should match once (by id), not twice (id + heading).
    expect(matchMorphs(from, to)).toHaveLength(1);
  });
});

describe("detect", () => {
  it("returns null when startViewTransition is unavailable", () => {
    // jsdom has no View Transitions API.
    expect(getStartViewTransition()).toBeNull();
  });

  it("reports reduced-motion from matchMedia", () => {
    const spy = vi
      .spyOn(globalThis, "matchMedia")
      .mockReturnValue({ matches: true } as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
    spy.mockRestore();
  });
});

describe("createSlideTransition", () => {
  const root = document.createElement("div");

  afterEach(() => {
    vi.restoreAllMocks();
    delete root.dataset.morphing;
  });

  it("applies instantly under reduced motion", () => {
    vi.spyOn(globalThis, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const apply = vi.fn();
    createSlideTransition(root)(apply, { from: slide(""), to: slide("") });
    expect(apply).toHaveBeenCalledOnce();
  });

  it("applies once for a plain slide change with no morphs and no VTA", () => {
    vi.spyOn(globalThis, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    const apply = vi.fn();
    createSlideTransition(root)(apply, { from: slide("<p>a</p>"), to: slide("<p>b</p>") });
    expect(apply).toHaveBeenCalledOnce();
    expect(root.dataset.morphing).toBeUndefined();
  });

  it("runs a FLIP morph (marking data-morphing=flip) when morphs exist without VTA", () => {
    vi.spyOn(globalThis, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    const from = slide(`<div data-morph="x">A</div>`);
    const to = slide(`<div data-morph="x">A</div>`);
    // jsdom's getBoundingClientRect returns zeroes, so no Animation is produced and
    // the flag clears synchronously — but apply must still run exactly once.
    const apply = vi.fn();
    createSlideTransition(root)(apply, { from, to });
    expect(apply).toHaveBeenCalledOnce();
  });
});

describe("controller wiring", () => {
  function buildDeck(): HTMLElement {
    const root = document.createElement("div");
    root.className = "as-deck";
    root.dataset.deck = "talk";
    root.innerHTML = `
      <div class="as-viewport">
        <section class="as-slide present" data-slide-no="1" data-title="One"></section>
        <section class="as-slide future" data-slide-no="2" data-title="Two"></section>
      </div>
      <div class="as-status" aria-live="polite"></div>`;
    document.body.append(root);
    return root;
  }

  let handle: ReturnType<typeof initDeck> | null = null;
  beforeEach(() => {
    history.replaceState(null, "", "/talk/1");
    document.body.innerHTML = "";
    vi.spyOn(globalThis, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
  });
  afterEach(() => {
    handle?.destroy();
    handle = null;
    vi.restoreAllMocks();
  });

  it("routes a slide change through the transition and still updates DOM state", () => {
    const root = buildDeck();
    handle = initDeck(root);
    handle.controller.next();
    // The mutation ran (transition applies synchronously without VTA/morphs).
    expect(root.dataset.current).toBe("2");
    const present = root.querySelector<HTMLElement>('[data-slide-no="2"]');
    expect(present?.classList.contains("present")).toBe(true);
  });
});
