import type { NavActions } from "./keyboard.js";

export interface TouchOptions {
  /** Minimum horizontal travel (px) to count as a swipe. */
  threshold?: number;
}

/**
 * Swipe navigation via Pointer Events: swipe left advances, swipe right goes
 * back. Mouse pointers are ignored so click-and-drag on desktop doesn't navigate.
 *
 * Pointer events cover touch and pen with a single, well-tested API; the richer
 * `@use-gesture` engine is reserved for Phase 11 (drawing / pinch-zoom) where
 * multi-touch gestures actually earn the dependency.
 */
export function bindTouch(
  el: HTMLElement,
  actions: Pick<NavActions, "next" | "prev">,
  options: TouchOptions = {},
): () => void {
  const threshold = options.threshold ?? 50;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === "mouse") return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  };
  const onUp = (e: PointerEvent): void => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) actions.next();
    else actions.prev();
  };
  const onCancel = (): void => {
    tracking = false;
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onCancel);
  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onCancel);
  };
}
