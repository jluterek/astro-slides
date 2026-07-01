import { createAnnouncer } from "./a11y.js";
import { bindKeyboard, type NavActions } from "./keyboard.js";
import { DeckController, type SlideMeta } from "./navigation.js";
import { applyScale, type Size } from "./scaling.js";
import { createDeckStore, type DeckStore } from "./store.js";
import { bindTouch } from "./touch.js";
import { bindOverviewClicks, ensureHelpOverlay } from "./ui.js";
import { parseLocation } from "./url.js";

const DEFAULT_DESIGN: Size = { width: 1280, height: 720 };

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

function readSlides(sections: HTMLElement[]): SlideMeta[] {
  return sections.map((el) => ({
    no: Number(el.dataset.slideNo),
    steps: Number(el.dataset.steps) || 0,
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
  const controller = new DeckController({ root, sections, slides, store, announcer });

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

  controller.start();

  return {
    controller,
    store,
    destroy() {
      unbindKeyboard();
      unbindTouch();
      unbindOverview();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPopState);
    },
  };
}

/** Boot every `.as-deck` on the page. */
export function initAllDecks(doc: Document = document): DeckHandle[] {
  return Array.from(doc.querySelectorAll<HTMLElement>(".as-deck")).map(initDeck);
}
