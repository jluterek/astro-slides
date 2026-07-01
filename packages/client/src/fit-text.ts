import fitty from "fitty";

/**
 * Initialize auto-fit-text on every `<FitText>` on the page. Idempotent per
 * element (fitty is re-applied harmlessly). Called from the `<FitText>` island
 * script, which Astro dedupes to a single execution.
 */
export function initFitText(selector = ".p-fittext"): void {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.dataset.fitReady === "true") continue;
    el.dataset.fitReady = "true";
    const min = Number(el.dataset.min) || 16;
    const max = Number(el.dataset.max) || 300;
    fitty(el, { minSize: min, maxSize: max });
  }
}
