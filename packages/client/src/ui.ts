import { SHORTCUTS } from "./keyboard.js";

/**
 * Non-slide chrome the runtime injects: the keyboard-help overlay and the
 * overview click-to-jump wiring. Kept out of the Astro template so the runtime
 * owns its own DOM and the page stays declarative.
 */

/** Build (once) the help overlay listing keyboard shortcuts. */
export function ensureHelpOverlay(root: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>(".as-help");
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.className = "as-help";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");
  overlay.hidden = true;

  const panel = document.createElement("div");
  panel.className = "as-help-panel";
  const heading = document.createElement("h2");
  heading.textContent = "Keyboard shortcuts";
  panel.append(heading);

  const list = document.createElement("dl");
  for (const { keys, label } of SHORTCUTS) {
    const dt = document.createElement("dt");
    dt.textContent = keys;
    const dd = document.createElement("dd");
    dd.textContent = label;
    list.append(dt, dd);
  }
  panel.append(list);
  overlay.append(panel);
  root.append(overlay);
  return overlay;
}

/**
 * Clicking a slide in overview mode jumps to it and leaves overview. Uses event
 * delegation so it survives HMR re-renders of the sections.
 */
export function bindOverviewClicks(
  root: HTMLElement,
  onSelect: (slideNo: number) => void,
): () => void {
  const handler = (event: Event): void => {
    if (!root.classList.contains("as-overview")) return;
    const section = (event.target as HTMLElement | null)?.closest<HTMLElement>(".as-slide");
    if (!section) return;
    const no = Number(section.dataset.slideNo);
    if (Number.isFinite(no)) onSelect(no);
  };
  root.addEventListener("click", handler);
  return () => root.removeEventListener("click", handler);
}
