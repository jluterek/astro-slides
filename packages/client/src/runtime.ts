import { createAnnouncer } from "./a11y.js";
import { bindCopyButtons } from "./code/copy.js";
import { initMagicMove } from "./code/magic-move.js";
import { initMermaid } from "./diagrams/mermaid.js";
import { bindKeyboard, type NavActions } from "./keyboard.js";
import { DeckController, type SlideMeta } from "./navigation.js";
import { applyScale, type Size } from "./scaling.js";
import { createDeckStore, type DeckStore } from "./store.js";
import { createSyncStore } from "./sync/store.js";
import { initialState } from "./sync/types.js";
import { bindTouch } from "./touch.js";
import { createSlideTransition } from "./transitions/index.js";
import { bindOverviewClicks, ensureHelpOverlay } from "./ui.js";
import { parseLocation } from "./url.js";

const DEFAULT_DESIGN: Size = { width: 1280, height: 720 };

/** Parse a CSS time token (`400ms` / `0.4s`) to milliseconds. */
function parseDuration(value: string, fallback = 400): number {
  const v = value.trim();
  if (v.endsWith("ms")) return Number.parseFloat(v) || fallback;
  if (v.endsWith("s")) return (Number.parseFloat(v) || fallback / 1000) * 1000;
  return fallback;
}

export interface DeckHandle {
  controller: DeckController;
  store: DeckStore;
  destroy(): void;
}

function readDesign(root: HTMLElement): Size {
  const width = Number(root.dataset.designWidth) || DEFAULT_DESIGN.width;
  const height = Number(root.dataset.designHeight) || DEFAULT_DESIGN.height;
  return { width, height };
}

/** The full-screen blackout overlay (Phase 10), created once per deck. */
function ensureBlackout(root: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>(".as-blackout");
  if (existing) return existing;
  const el = document.createElement("div");
  el.className = "as-blackout";
  el.hidden = true;
  root.append(el);
  return el;
}

/** Highest click step referenced by a slide's DOM (point index or range end). */
function maxClickStep(section: HTMLElement): number {
  let max = 0;
  for (const el of section.querySelectorAll<HTMLElement>("[data-click]")) {
    max = Math.max(max, Number(el.dataset.click) || 0, Number(el.dataset.clickTo) || 0);
  }
  return max;
}

function readSlides(sections: HTMLElement[]): SlideMeta[] {
  return sections.map((el) => ({
    no: Number(el.dataset.slideNo),
    // The compile-time total (data-steps) is authoritative, but fall back to the DOM
    // so clicks still step even if the metadata export is absent.
    steps: Math.max(Number(el.dataset.steps) || 0, maxClickStep(el)),
    title: el.dataset.title || null,
  }));
}

/**
 * Boot the in-browser runtime for one deck root (`.as-deck`). Wires the class-name
 * state machine, keyboard + touch input, viewport scaling, the aria-live announcer,
 * overview mode, and URL <-> state syncing. Multiple decks per page each get their
 * own handle and store.
 */
export function initDeck(root: HTMLElement): DeckHandle {
  const sections = Array.from(root.querySelectorAll<HTMLElement>(".as-slide"));
  const slides = readSlides(sections);
  const design = readDesign(root);
  const start = parseLocation(location.pathname, location.search);

  const store = createDeckStore({
    deck: root.dataset.deck ?? "",
    total: slides.length,
    slide: start.slide,
    step: start.step,
  });

  const statusRegion = root.querySelector<HTMLElement>(".as-status");
  const announcer = createAnnouncer(statusRegion ?? root);

  // Read the theme's transition timing so FLIP fallbacks match the CSS defaults.
  const styles = getComputedStyle(root);
  const duration = parseDuration(styles.getPropertyValue("--slide-transition-duration"), 400);
  const easing = styles.getPropertyValue("--slide-transition-easing").trim();
  const transition = createSlideTransition(root, easing ? { duration, easing } : { duration });

  const controller = new DeckController({ root, sections, slides, store, announcer, transition });

  // --- Overview + help chrome ------------------------------------------------
  const help = ensureHelpOverlay(root);
  const setOverview = (on: boolean): void => {
    root.classList.toggle("as-overview", on);
    store.overview.set(on);
  };
  const setHelp = (on: boolean): void => {
    help.hidden = !on;
  };
  const actions: NavActions = {
    next: () => controller.next(),
    prev: () => controller.prev(),
    first: () => controller.first(),
    last: () => controller.last(),
    toggleOverview: () => setOverview(!store.overview.get()),
    toggleHelp: () => setHelp(help.hidden),
    escape: () => {
      if (!help.hidden) setHelp(false);
      else if (store.overview.get()) setOverview(false);
    },
  };

  // --- Scaling ---------------------------------------------------------------
  const rescale = (): void => {
    applyScale(root, design, { width: root.clientWidth, height: root.clientHeight });
  };
  rescale();

  // --- Wiring ----------------------------------------------------------------
  const unbindKeyboard = bindKeyboard(window, actions);
  const unbindTouch = bindTouch(root, actions);
  const unbindOverview = bindOverviewClicks(root, (no) => {
    setOverview(false);
    controller.goto(no);
  });
  const onResize = (): void => rescale();
  const onPopState = (): void => controller.syncFromUrl();
  window.addEventListener("resize", onResize);
  window.addEventListener("popstate", onPopState);

  // --- Code islands (Phase 08) ----------------------------------------------
  const unbindCopy = bindCopyButtons(root);
  const stopMagicMove = initMagicMove(root, store);

  // --- Diagram islands (Phase 09) -------------------------------------------
  const stopMermaid = initMermaid(root);

  // --- Cross-window sync + blackout (Phase 10) ------------------------------
  // `?as-preview` marks the presenter's next-slide iframe: it follows a separate
  // channel and never publishes (it mirrors the *next* click, not this window).
  const preview = new URLSearchParams(location.search).has("as-preview");
  const deckId = root.dataset.deck ?? "";
  const sync = createSyncStore(deckId, initialState(start.slide, start.step), {
    suffix: preview ? "preview" : "",
    publish: !preview,
  });
  const blackout = ensureBlackout(root);
  let applyingRemote = false;

  const unsyncState = sync.state.subscribe((s) => {
    const cur = controller.current;
    if (s.no !== cur.slide || s.step !== cur.step) {
      applyingRemote = true;
      controller.applyRemote(s.no, s.step);
      applyingRemote = false;
    }
    root.classList.toggle("as-blackout-on", s.blackout);
    blackout.hidden = !s.blackout;
  });

  // Publish local navigation to peers (audience + presenter follow). The preview
  // window is follow-only. `applyingRemote` guards against echoing a remote change.
  const publishNav = (): void => {
    if (applyingRemote || preview) return;
    const cur = controller.current;
    sync.dispatch({ type: "goto", no: cur.slide, step: cur.step });
  };
  const unsyncSlide = store.slide.listen(publishNav);
  const unsyncStep = store.step.listen(publishNav);

  controller.start();

  return {
    controller,
    store,
    destroy() {
      unbindKeyboard();
      unbindTouch();
      unbindOverview();
      unbindCopy();
      stopMagicMove();
      stopMermaid();
      unsyncState();
      unsyncSlide();
      unsyncStep();
      sync.close();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPopState);
    },
  };
}

/** Boot every `.as-deck` on the page. */
export function initAllDecks(doc: Document = document): DeckHandle[] {
  return Array.from(doc.querySelectorAll<HTMLElement>(".as-deck")).map(initDeck);
}
