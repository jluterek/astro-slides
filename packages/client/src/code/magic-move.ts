import { MagicMoveRenderer } from "@shikijs/magic-move/renderer";
import lzString from "lz-string";
import type { DeckStore } from "../store.js";

const { decompressFromBase64 } = lzString;

/**
 * Magic Move runtime (Phase 08). Each `.as-magic-move` island carries the
 * lz-string-compressed keyed-token steps produced at build time. We decompress them,
 * mount a framework-agnostic `MagicMoveRenderer`, and advance the visible step off the
 * deck click model: step index = clamp(deckStep - base, 0, count-1) while the island's
 * slide is present (reset to 0 otherwise). The first render on the present slide is
 * instant; later same-slide changes animate.
 */

// KeyedTokensInfo is structural; we only shuttle it between decompress and the renderer.
type KeyedTokens = Parameters<MagicMoveRenderer["render"]>[0];

interface MagicMoveInstance {
  el: HTMLElement;
  renderer: MagicMoveRenderer;
  steps: KeyedTokens[];
  base: number;
  slideNo: number;
  shown: number;
}

function slideNoOf(el: HTMLElement): number {
  return Number(el.closest<HTMLElement>(".as-slide")?.dataset.slideNo) || 0;
}

function mount(el: HTMLElement): MagicMoveInstance | null {
  const raw = el.dataset.mmSteps;
  if (!raw) return null;
  let steps: KeyedTokens[];
  try {
    steps = JSON.parse(decompressFromBase64(raw)) as KeyedTokens[];
  } catch {
    return null;
  }
  if (!steps.length) return null;
  // The framework wrappers (react/vue) stamp this class in their templates; the raw
  // renderer does not. It carries `white-space: pre` (whitespace tokens collapse to
  // zero width without it) and the `position: relative` context the anchor needs.
  el.classList.add("shiki-magic-move-container");
  const renderer = new MagicMoveRenderer(el);
  renderer.setCssVariables();
  const first = steps[0];
  if (first) renderer.replace(first);
  return {
    el,
    renderer,
    steps,
    base: Number(el.dataset.mmBase) || 0,
    slideNo: slideNoOf(el),
    shown: 0,
  };
}

/**
 * Statically render every Magic Move island under `root` at its final step. For the
 * print/export route, which reveals all click state and runs no deck runtime — the
 * printed page shows each block as it looks after its last click.
 */
export function renderMagicMoveFinal(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(".as-magic-move"))) {
    const inst = mount(el);
    const last = inst?.steps[inst.steps.length - 1];
    if (inst && last) inst.renderer.replace(last);
  }
}

/**
 * Boot every Magic Move island under `root`, syncing them to the deck store. Returns
 * a cleanup that unsubscribes.
 */
export function initMagicMove(root: HTMLElement, store: DeckStore): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".as-magic-move"));
  const instances = els.map(mount).filter((x): x is MagicMoveInstance => x !== null);
  if (instances.length === 0) return () => {};

  const sync = (slide: number, step: number): void => {
    for (const mm of instances) {
      const present = mm.slideNo === slide;
      const target = present ? Math.max(0, Math.min(step - mm.base, mm.steps.length - 1)) : 0;
      if (target === mm.shown) continue;
      const tokens = mm.steps[target];
      if (!tokens) continue;
      // Animate only while the slide is present; snap when off-screen.
      if (present) void mm.renderer.render(tokens);
      else mm.renderer.replace(tokens);
      mm.shown = target;
    }
  };

  sync(store.slide.get(), store.step.get());
  // `.listen` (not `.subscribe`) so we don't re-run the initial sync twice.
  const unsubStep = store.step.listen((step) => sync(store.slide.get(), step));
  const unsubSlide = store.slide.listen((slide) => sync(slide, store.step.get()));
  return () => {
    unsubStep();
    unsubSlide();
  };
}
