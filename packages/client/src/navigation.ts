import type { Announcer } from "./a11y.js";
import { applySlideStates } from "./state-machine.js";
import type { DeckStore } from "./store.js";
import type { SlideTransition } from "./transitions/index.js";
import { basePath, buildLocation, type DeckLocation, parseLocation } from "./url.js";

/** Minimal per-slide metadata the navigation core needs. */
export interface SlideMeta {
  no: number;
  /** Number of click steps on this slide (reveal.js "fragments"). */
  steps: number;
  title: string | null;
}

export type NavState = DeckLocation;

// --- Pure transition functions (framework- and DOM-free, unit tested) ---------

function indexOfSlide(slides: SlideMeta[], no: number): number {
  return slides.findIndex((s) => s.no === no);
}

/** Advance one step, rolling onto the next slide when steps are exhausted. */
export function nextState(state: NavState, slides: SlideMeta[]): NavState {
  const idx = indexOfSlide(slides, state.slide);
  const current = slides[idx];
  if (current && state.step < current.steps) {
    return { slide: state.slide, step: state.step + 1 };
  }
  const next = slides[idx + 1];
  return next ? { slide: next.no, step: 0 } : state;
}

/** Retreat one step, rolling onto the previous slide's last step. */
export function prevState(state: NavState, slides: SlideMeta[]): NavState {
  if (state.step > 0) return { slide: state.slide, step: state.step - 1 };
  const idx = indexOfSlide(slides, state.slide);
  const prev = slides[idx - 1];
  return prev ? { slide: prev.no, step: prev.steps } : state;
}

/** Jump to a slide (defaulting to step 0), clamping to a real slide + step range. */
export function gotoState(slide: number, slides: SlideMeta[], step = 0): NavState {
  const target = slides.find((s) => s.no === slide) ?? slides[0];
  if (!target) return { slide: 1, step: 0 };
  return { slide: target.no, step: Math.max(0, Math.min(step, target.steps)) };
}

// --- DOM controller -----------------------------------------------------------

type UrlMode = "push" | "replace" | "none";

export interface DeckControllerOptions {
  root: HTMLElement;
  sections: HTMLElement[];
  slides: SlideMeta[];
  store: DeckStore;
  announcer: Announcer;
  /** Wraps the DOM mutation for slide changes so transitions (VTA/FLIP) can run. */
  transition?: SlideTransition;
}

/**
 * Owns the live navigation state for one deck: applies the class-name state
 * machine, mirrors state into the store + URL, and announces changes.
 */
export class DeckController {
  private state: NavState;
  private readonly base: string;

  constructor(private readonly opts: DeckControllerOptions) {
    this.state = { slide: opts.store.slide.get(), step: opts.store.step.get() };
    this.base = basePath(location.pathname);
  }

  get current(): NavState {
    return this.state;
  }

  /** Apply the initial URL-derived state without adding a history entry. */
  start(): void {
    const loc = parseLocation(location.pathname, location.search);
    // The initial paint must be instant — never a transition from nothing.
    this.apply(gotoState(loc.slide, this.opts.slides, loc.step), "replace", false);
  }

  next(): void {
    this.apply(nextState(this.state, this.opts.slides), "push");
  }

  prev(): void {
    this.apply(prevState(this.state, this.opts.slides), "push");
  }

  first(): void {
    const first = this.opts.slides[0];
    if (first) this.apply(gotoState(first.no, this.opts.slides), "push");
  }

  last(): void {
    const last = this.opts.slides.at(-1);
    if (last) this.apply(gotoState(last.no, this.opts.slides, last.steps), "push");
  }

  goto(slide: number, step = 0): void {
    this.apply(gotoState(slide, this.opts.slides, step), "push");
  }

  /**
   * Apply state pushed from another window (BroadcastChannel sync, Phase 10). Mirrors
   * the URL without adding a history entry so a follower doesn't accrue history noise —
   * but still runs the slide transition: the audience screen and presenter panes are
   * driven exclusively through this path, so skipping it would silently downgrade
   * every `<Morph>` / view-transition to a plain fade for the people watching.
   */
  applyRemote(slide: number, step = 0): void {
    this.apply(gotoState(slide, this.opts.slides, step), "replace", true);
  }

  /** Re-derive state from the current URL (browser back/forward). */
  syncFromUrl(): void {
    const loc = parseLocation(location.pathname, location.search);
    this.apply(gotoState(loc.slide, this.opts.slides, loc.step), "none");
  }

  private sectionFor(slide: number): HTMLElement | null {
    return this.opts.sections.find((s) => Number(s.dataset.slideNo) === slide) ?? null;
  }

  private apply(next: NavState, url: UrlMode, animate = true): void {
    const slideChanged = next.slide !== this.state.slide;
    const changed = slideChanged || next.step !== this.state.step;
    const fromSlide = this.state.slide;
    this.state = next;

    const mutate = (): void => {
      applySlideStates(this.opts.sections, next.slide);
      this.opts.root.dataset.current = String(next.slide);
      this.opts.root.dataset.step = String(next.step);
      this.applyStepReveal(next);
    };

    // Slide changes run through the transition (VTA/FLIP); step-only changes apply
    // instantly, as does the initial paint (`animate: false` — URL mode and animation
    // are separate concerns: remote applies use `replace` yet must still animate).
    if (slideChanged && this.opts.transition && animate) {
      this.opts.transition(mutate, {
        from: this.sectionFor(fromSlide),
        to: this.sectionFor(next.slide),
      });
    } else {
      mutate();
    }

    this.opts.store.slide.set(next.slide);
    this.opts.store.step.set(next.step);

    // Only touch the URL when the state actually moved: a same-URL pushState still
    // adds a history entry, so Space-mashing at the last slide would break Back.
    if (url !== "none" && (changed || url === "replace")) this.syncUrl(url);
    if (changed || url === "replace") this.announce();
  }

  /**
   * Reveal click-step elements on the present slide. The full `<Click>` component
   * model lands in Phase 06; here we honor the generic `[data-click]` contract so
   * step state is already wired through the runtime and URL.
   */
  private applyStepReveal(state: NavState): void {
    for (const section of this.opts.sections) {
      const isPresent = Number(section.dataset.slideNo) === state.slide;
      for (const el of section.querySelectorAll<HTMLElement>("[data-click]")) {
        const at = Number(el.dataset.click);
        // Ranges (`at="[start,end]"`) hide again after `to`; point clicks stay shown.
        const toRaw = el.dataset.clickTo;
        const to = toRaw != null && toRaw !== "" ? Number(toRaw) : Number.POSITIVE_INFINITY;
        el.classList.toggle("as-click-shown", isPresent && state.step >= at && state.step <= to);
      }
    }
  }

  private syncUrl(mode: Exclude<UrlMode, "none">): void {
    const url = buildLocation(this.base, this.state);
    if (mode === "replace") history.replaceState(this.state, "", url);
    else history.pushState(this.state, "", url);
  }

  private announce(): void {
    const position = indexOfSlide(this.opts.slides, this.state.slide) + 1;
    const total = this.opts.slides.length;
    const meta = this.opts.slides.find((s) => s.no === this.state.slide);
    const title = meta?.title ? `: ${meta.title}` : "";
    this.opts.announcer.announce(`Slide ${position} of ${total}${title}`);
  }
}
