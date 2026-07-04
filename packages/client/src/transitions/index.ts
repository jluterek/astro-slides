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

// Same-document morph naming (ADR-0006). Both slides live in one DOM, so a shared
// `view-transition-name` may sit on only ONE element per capture: naming the outgoing
// AND incoming element at once makes the old-state capture see two elements with the
// same name, which trips Chromium's "duplicate view-transition-name" guard and aborts
// the whole transition. So we name the outgoing element for the old-state capture, then
// hand each name off to the incoming element inside the update callback — before the
// new-state capture — so the browser morphs old→new instead of erroring out.
function nameFrom(pairs: MorphPair[]): void {
  pairs.forEach((pair, i) => {
    pair.from.style.viewTransitionName = `as-morph-${i}`;
  });
}
function handOffToTarget(pairs: MorphPair[]): void {
  pairs.forEach((pair, i) => {
    pair.from.style.viewTransitionName = "";
    pair.to.style.viewTransitionName = `as-morph-${i}`;
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
      nameFrom(pairs);
      root.dataset.morphing = pairs.length > 0 ? "vt" : "root";
      const transition = startViewTransition(() => {
        apply();
        handOffToTarget(pairs);
      });
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
