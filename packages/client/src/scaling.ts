/**
 * Viewport-fit scaling. Slides are authored in a fixed design coordinate space
 * (default 1280x720, 16:9) and scaled uniformly to fit the available box, so
 * layouts never reflow — they just shrink or grow.
 */

export interface Size {
  width: number;
  height: number;
}

/** The largest uniform scale that fits `design` inside `available`. */
export function computeScale(available: Size, design: Size): number {
  if (design.width <= 0 || design.height <= 0) return 1;
  const scale = Math.min(available.width / design.width, available.height / design.height);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** Write the scale + design size to CSS custom properties on the deck root. */
export function applyScale(root: HTMLElement, design: Size, available: Size): number {
  const scale = computeScale(available, design);
  root.style.setProperty("--as-design-w", `${design.width}px`);
  root.style.setProperty("--as-design-h", `${design.height}px`);
  root.style.setProperty("--as-scale", String(scale));
  return scale;
}
