import { getStartViewTransition, prefersReducedMotion } from "./detect.js";
import { flipMorph, type MorphPair, matchMorphs } from "./flip.js";

/**
 * Slide-transition dispatcher (ADR-0006). On each slide change the runtime calls the
 * returned function with the DOM mutation and the outgoing/incoming sections. Policy:
 *
 *  - reduced motion            → apply instantly
 *  - morph pairs + VTA support → same-document `startViewTransition` (browser morphs
 *                                elements sharing a `view-transition-name`)
 *  - `transition: view-transition` + VTA → VTA root cross-fade
 *  - morph pairs, no VTA       → FLIP fallback
 *  - otherwise                 → apply; the CSS state-class transition handles it
 */

export interface TransitionContext {
  from: HTMLElement | null;
  to: HTMLElement | null;
}
export type SlideTransition = (apply: () => void, ctx: TransitionContext) => void;

export interface TransitionOptions {
  duration?: number;
  easing?: string;
}

function setNames(pairs: MorphPair[]): void {
  pairs.forEach((pair, i) => {
    const name = `as-morph-${i}`;
    pair.from.style.viewTransitionName = name;
    pair.to.style.viewTransitionName = name;
  });
}
function clearNames(pairs: MorphPair[]): void {
  for (const pair of pairs) {
    pair.from.style.viewTransitionName = "";
    pair.to.style.viewTransitionName = "";
  }
}

export function createSlideTransition(
  root: HTMLElement,
  options: TransitionOptions = {},
): SlideTransition {
  return (apply, ctx) => {
    const { from, to } = ctx;
    if (prefersReducedMotion()) {
      apply();
      return;
    }

    const pairs = from && to ? matchMorphs(from, to) : [];
    const wantsRootVT = to?.dataset.transition === "view-transition";
    const startViewTransition = getStartViewTransition();

    if (startViewTransition && (pairs.length > 0 || wantsRootVT)) {
      setNames(pairs);
      root.dataset.morphing = pairs.length > 0 ? "vt" : "root";
      const transition = startViewTransition(apply);
      transition.finished.finally(() => {
        clearNames(pairs);
        delete root.dataset.morphing;
      });
      return;
    }

    if (pairs.length > 0) {
      root.dataset.morphing = "flip";
      const animations = flipMorph(pairs, apply, options);
      const done = (): void => {
        delete root.dataset.morphing;
      };
      if (animations.length > 0) Promise.all(animations.map((a) => a.finished)).finally(done);
      else done();
      return;
    }

    apply();
  };
}

export { getStartViewTransition, prefersReducedMotion, supportsViewTransitions } from "./detect.js";
export { flipMorph, type MorphPair, matchMorphs } from "./flip.js";
