/**
 * reveal.js-style slide state machine. Every slide section carries exactly one of
 * `past` / `present` / `future`, driven purely by its position relative to the
 * active slide. Transitions (Phase 07) hang off these class names.
 */

export type SlideState = "past" | "present" | "future";

const STATES: readonly SlideState[] = ["past", "present", "future"];

/** The state a slide numbered `slideNo` should have when `current` is active. */
export function slideState(slideNo: number, current: number): SlideState {
  if (slideNo < current) return "past";
  if (slideNo > current) return "future";
  return "present";
}

/** Toggle past/present/future on each section based on its `data-slide-no`. */
export function applySlideStates(sections: Iterable<HTMLElement>, current: number): void {
  for (const el of sections) {
    const no = Number(el.dataset.slideNo);
    const state = slideState(no, current);
    for (const candidate of STATES) {
      el.classList.toggle(candidate, candidate === state);
    }
  }
}
