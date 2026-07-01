/**
 * Runtime capability detection for the transition system. View Transitions API
 * support is probed once and cached for the session (ADR-0006); reduced-motion is
 * read live so an OS change mid-session is honored.
 */

type StartViewTransition = (callback: () => void) => { finished: Promise<void> };

let vtaSupport: boolean | null = null;

/** The same-document `document.startViewTransition`, or null if unsupported. */
export function getStartViewTransition(): StartViewTransition | null {
  if (typeof document === "undefined") return null;
  const fn = (document as unknown as { startViewTransition?: StartViewTransition })
    .startViewTransition;
  return typeof fn === "function" ? fn.bind(document) : null;
}

export function supportsViewTransitions(): boolean {
  if (vtaSupport === null) vtaSupport = getStartViewTransition() !== null;
  return vtaSupport;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
