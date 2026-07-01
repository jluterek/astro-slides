import type { ShikiTransformer } from "shiki";
import type { LineStep } from "./meta.js";

/**
 * Shiki transformers that annotate line nodes. Shiki emits one `<span class="line">`
 * per source line; these hooks add classes / attributes the runtime + CSS consume.
 */

/** Add `.highlighted` to statically-highlighted lines (`{1,3-5}`). */
export function highlightLinesTransformer(lines: number[]): ShikiTransformer {
  const set = new Set(lines);
  return {
    name: "astro-slides:highlight-lines",
    line(node, line) {
      if (set.has(line)) this.addClassToHast(node, "highlighted");
      return node;
    },
  };
}

/**
 * Map click-stepped line groups (`{1|2-3|all}`) onto the click model. Each line that
 * belongs to step *k* gets `data-click="base+k"`; the runtime toggles `as-click-shown`
 * on it as `?step` advances, and CSS lifts shown lines out of the dimmed default. Lines
 * in no step stay always-visible. Returns the highest absolute step used.
 */
export function clickLinesTransformer(
  steps: LineStep[],
  base: number,
): { transformer: ShikiTransformer; maxStep: number } {
  // Build line -> earliest step index (1-based within this block).
  const lineToStep = new Map<number, number>();
  let allFromStep: number | null = null;
  steps.forEach((step, i) => {
    const stepNo = i + 1;
    if (step === "all") {
      if (allFromStep == null) allFromStep = stepNo;
    } else {
      for (const ln of step) if (!lineToStep.has(ln)) lineToStep.set(ln, stepNo);
    }
  });

  const maxStep = base + steps.length;
  const transformer: ShikiTransformer = {
    name: "astro-slides:click-lines",
    code(node) {
      // Mark the block so CSS can dim un-shown stepped lines only inside stepped blocks.
      this.addClassToHast(node, "as-code-clicks");
      return node;
    },
    line(node, line) {
      const step = lineToStep.get(line) ?? (allFromStep as number | null);
      if (step == null) {
        // Not part of any step → always shown; opt it out of the dim default.
        this.addClassToHast(node, "as-code-static");
        return node;
      }
      this.addClassToHast(node, "as-code-line");
      node.properties ??= {};
      node.properties["data-click"] = String(base + step);
      return node;
    },
  };
  return { transformer, maxStep };
}
