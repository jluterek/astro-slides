/**
 * FLIP-based object continuity — the fallback for browsers without the View
 * Transitions API (ADR-0006), adapted from reveal.js's auto-animate. Matched
 * elements are animated First→Last: measure before, apply the DOM change, then
 * invert (translate/scale from old to new box) and play back to identity.
 *
 * Matching mirrors reveal.js: explicit `data-morph` id pairing first, then a
 * heading-text-content heuristic for unlabeled headings.
 */

export interface MorphPair {
  from: HTMLElement;
  to: HTMLElement;
}

function headingKey(el: HTMLElement): string | null {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text ? `${el.tagName}:${text}` : null;
}

/** Pair elements between the outgoing and incoming slide sections. */
export function matchMorphs(from: HTMLElement, to: HTMLElement): MorphPair[] {
  const pairs: MorphPair[] = [];
  const used = new Set<HTMLElement>();

  // 1. Explicit `data-morph` ids.
  const toById = new Map<string, HTMLElement>();
  for (const el of to.querySelectorAll<HTMLElement>("[data-morph]")) {
    const id = el.dataset.morph;
    if (id && !toById.has(id)) toById.set(id, el);
  }
  for (const el of from.querySelectorAll<HTMLElement>("[data-morph]")) {
    const id = el.dataset.morph;
    const target = id ? toById.get(id) : undefined;
    if (target && !used.has(target)) {
      pairs.push({ from: el, to: target });
      used.add(target);
    }
  }

  // 2. Heading-text heuristic for the rest.
  const toByHeading = new Map<string, HTMLElement>();
  for (const el of to.querySelectorAll<HTMLElement>("h1, h2, h3, h4")) {
    if (used.has(el)) continue;
    const key = headingKey(el);
    if (key && !toByHeading.has(key)) toByHeading.set(key, el);
  }
  for (const el of from.querySelectorAll<HTMLElement>("h1, h2, h3, h4")) {
    const key = headingKey(el);
    const target = key ? toByHeading.get(key) : undefined;
    if (target && !used.has(target)) {
      pairs.push({ from: el, to: target });
      used.add(target);
    }
  }

  return pairs;
}

export interface FlipOptions {
  duration?: number;
  easing?: string;
}

/**
 * Run a FLIP morph: measure `from` boxes, apply the DOM change, then animate each
 * `to` element from its old box to its new one. Returns the Animations so callers
 * can await them.
 */
export function flipMorph(
  pairs: MorphPair[],
  apply: () => void,
  options: FlipOptions = {},
): Animation[] {
  const duration = options.duration ?? 400;
  const easing = options.easing ?? "cubic-bezier(0.26, 0.86, 0.44, 0.985)";

  const firsts = pairs.map((p) => p.from.getBoundingClientRect());
  apply();

  const animations: Animation[] = [];
  pairs.forEach((pair, i) => {
    const first = firsts[i];
    if (!first) return;
    const last = pair.to.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = last.width > 0 ? first.width / last.width : 1;
    const sy = last.height > 0 ? first.height / last.height : 1;
    if (dx === 0 && dy === 0 && sx === 1 && sy === 1) return;
    const anim = pair.to.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        { transformOrigin: "top left", transform: "none" },
      ],
      { duration, easing },
    );
    animations.push(anim);
  });
  return animations;
}
