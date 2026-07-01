import type { SyncStore } from "../sync/store.js";
import type { LaserPoint } from "../sync/types.js";

/**
 * Laser pointer (Phase 11). A resolution-independent dot synced through the shared
 * store: any window renders `state.laser`; the presenter (or a phone remote) emits
 * normalized (0..1) positions while laser mode is held. Normalizing against the
 * viewport box keeps the dot aligned across differently-sized screens.
 */

export interface LaserHandle {
  active(): boolean;
  toggle(on?: boolean): void;
  destroy(): void;
}

/** Map a pointer event to a normalized position within `box`, or null if outside. */
export function normalizePointer(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
): LaserPoint | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const x = (clientX - box.left) / box.width;
  const y = (clientY - box.top) / box.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

export function initLaser(root: HTMLElement, sync: SyncStore): LaserHandle {
  const viewport = root.querySelector<HTMLElement>(".as-viewport") ?? root;

  const dot = document.createElement("div");
  dot.className = "as-laser";
  dot.hidden = true;
  viewport.append(dot);

  // Render the remote (or local) laser position.
  const unsub = sync.state.subscribe((state) => {
    const p = state.laser;
    if (!p) {
      dot.hidden = true;
      return;
    }
    dot.hidden = false;
    dot.style.left = `${p.x * 100}%`;
    dot.style.top = `${p.y * 100}%`;
  });

  let activeState = false;
  let lastSent = 0;

  const onMove = (e: PointerEvent): void => {
    const now = Date.now();
    if (now - lastSent < 40) return; // throttle to ~25fps
    lastSent = now;
    const rect = viewport.getBoundingClientRect();
    const p = normalizePointer(e.clientX, e.clientY, rect);
    if (p) sync.dispatch({ type: "laser", point: p });
  };

  function setActive(on: boolean): void {
    activeState = on;
    root.classList.toggle("as-laser-on", on);
    if (on) {
      window.addEventListener("pointermove", onMove);
    } else {
      window.removeEventListener("pointermove", onMove);
      sync.dispatch({ type: "laser", point: null });
    }
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "l" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e)) {
      e.preventDefault();
      setActive(!activeState);
    }
  };
  window.addEventListener("keydown", onKey);

  return {
    active: () => activeState,
    toggle: (on) => setActive(on ?? !activeState),
    destroy: () => {
      unsub();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      dot.remove();
    },
  };
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable === true;
}
