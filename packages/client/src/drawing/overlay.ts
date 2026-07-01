import { createDrauu, type Drauu, type DrawingMode } from "drauu";
import type { SyncStore } from "../sync/store.js";
import { drawingKey, type SharedState } from "../sync/types.js";

/**
 * Freehand drawing overlay (Phase 11). drauu is vanilla TS, so it layers over the
 * existing deck runtime without a React island: we mount it on an `<svg>` whose viewBox
 * is the deck's design coordinate space, so annotations are resolution-independent and
 * round-trip through `dump()`/`load()` as a plain SVG string.
 *
 * Annotations sync through the shared store keyed `"<slide>:<step>"` (drawings can differ
 * per click step). Committing a stroke dispatches a `draw` action; switching slides loads
 * that slide-step's stored SVG. Persistence (POST to the dev-server gateway) is opt-in via
 * the deck's `drawings.persist`.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export interface DrawingOptions {
  sync: SyncStore;
  /** Current slide + step (read live from the deck controller). */
  current: () => { slide: number; step: number };
  /** Design coordinate space (matches the deck viewport). */
  design: { width: number; height: number };
  /** Persist committed drawings to the dev-server gateway. */
  persist?: boolean;
  /** Deck id, used for the persistence endpoint. */
  deckId: string;
  /** Persistence hook (defaults to a POST to the gateway); injectable for tests. */
  save?: (deckId: string, key: string, svg: string) => void;
}

export interface DrawingHandle {
  /** Whether the pen is currently active (capturing pointer events). */
  active(): boolean;
  toggle(on?: boolean): void;
  destroy(): void;
}

const DEFAULT_COLOR = "#ef4444";
const COLORS = [DEFAULT_COLOR, "#f59e0b", "#22c55e", "#3b82f6", "#111827", "#ffffff"];
const MODES: { mode: DrawingMode; label: string; arrow?: boolean }[] = [
  { mode: "stylus", label: "✎" },
  { mode: "draw", label: "〜" },
  { mode: "line", label: "／" },
  { mode: "draw", label: "➔", arrow: true },
  { mode: "rectangle", label: "▭" },
  { mode: "ellipse", label: "◯" },
  { mode: "eraseLine", label: "⌫" },
];

/** POST a committed drawing to the dev-server persistence endpoint (best-effort). */
function defaultSave(deckId: string, key: string, svg: string): void {
  if (typeof fetch === "undefined") return;
  void fetch("/__astro-slides/drawings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deck: deckId, key, svg }),
  }).catch(() => {});
}

export function initDrawing(root: HTMLElement, options: DrawingOptions): DrawingHandle {
  const viewport = root.querySelector<HTMLElement>(".as-viewport") ?? root;
  const save = options.save ?? defaultSave;

  // The drawing surface: an SVG in design coordinates, riding the viewport transform.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "as-drawing-layer");
  svg.setAttribute("viewBox", `0 0 ${options.design.width} ${options.design.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  viewport.append(svg);

  const drauu: Drauu = createDrauu({
    el: svg,
    brush: { color: DEFAULT_COLOR, size: 4, mode: "stylus" },
  });

  const toolbar = buildToolbar(root, drauu, {
    onClear: () => clearCurrent(),
    onUndo: () => drauu.undo(),
    onRedo: () => drauu.redo(),
  });

  let activeState = false;
  let loading = false; // guard: applying a remote SVG must not re-dispatch
  let appliedKey = "";

  function setActive(on: boolean): void {
    activeState = on;
    root.classList.toggle("as-drawing-on", on);
    toolbar.hidden = !on;
  }
  setActive(false);

  function keyNow(): string {
    const c = options.current();
    return drawingKey(c.slide, c.step);
  }

  function clearCurrent(): void {
    drauu.clear();
    options.sync.dispatch({ type: "draw/clear", key: keyNow() });
  }

  // Load the stored SVG for the current slide-step into drauu (without echoing).
  function applyFor(key: string, state: SharedState): void {
    appliedKey = key;
    loading = true;
    const svgData = state.drawings[key] ?? "";
    if (svgData) drauu.load(svgData);
    else drauu.clear();
    loading = false;
  }

  // A finished stroke → persist to the shared store (and disk, if enabled).
  const offCommitted = drauu.on("committed", () => {
    if (loading) return;
    const key = keyNow();
    const svgData = drauu.dump();
    options.sync.dispatch({ type: "draw", key, svg: svgData });
    if (options.persist) save(options.deckId, key, svgData);
  });

  // Remote changes (other windows / phones) + slide changes → reload the surface.
  const unsub = options.sync.state.subscribe((state) => {
    const key = keyNow();
    // Reload when the slide-step changed, or when this key's stored SVG changed
    // under us (a peer drew on the slide we're viewing).
    if (key !== appliedKey || state.drawings[key] !== drauu.dump()) {
      applyFor(key, state);
    }
  });

  function onKey(e: KeyboardEvent): void {
    if (e.key === "d" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e)) {
      e.preventDefault();
      setActive(!activeState);
    }
  }
  window.addEventListener("keydown", onKey);

  return {
    active: () => activeState,
    toggle: (on) => setActive(on ?? !activeState),
    destroy: () => {
      offCommitted();
      unsub();
      window.removeEventListener("keydown", onKey);
      drauu.unmount();
      toolbar.remove();
      svg.remove();
    },
  };
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable === true;
}

/** Build the floating drawing toolbar (fixed to the viewport, not slide-scaled). */
function buildToolbar(
  root: HTMLElement,
  drauu: Drauu,
  handlers: { onClear: () => void; onUndo: () => void; onRedo: () => void },
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "as-drawing-toolbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Drawing tools");

  for (const { mode, label, arrow } of MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = arrow ? "arrow" : mode;
    btn.addEventListener("click", () => {
      drauu.mode = mode;
      drauu.brush = { ...drauu.brush, arrowEnd: !!arrow };
      for (const b of bar.querySelectorAll(".as-tool-mode")) b.classList.remove("is-active");
      btn.classList.add("is-active");
    });
    btn.classList.add("as-tool-mode");
    bar.append(btn);
  }

  for (const color of COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "as-tool-color";
    swatch.style.background = color;
    swatch.title = color;
    swatch.setAttribute("aria-label", `color ${color}`);
    swatch.addEventListener("click", () => {
      drauu.brush = { ...drauu.brush, color };
      for (const s of bar.querySelectorAll(".as-tool-color")) s.classList.remove("is-active");
      swatch.classList.add("is-active");
    });
    bar.append(swatch);
  }

  const actions: [string, string, () => void][] = [
    ["↶", "undo", handlers.onUndo],
    ["↷", "redo", handlers.onRedo],
    ["✕", "clear", handlers.onClear],
  ];
  for (const [label, title, fn] of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener("click", fn);
    bar.append(btn);
  }

  root.append(bar);
  return bar;
}
