import { visit } from "unist-util-visit";
import { findTotalClicks, setTotalClicks } from "../click-total.js";
import { type LineStep, parseCodeMeta } from "../code/meta.js";
import { renderMath } from "./katex.js";

/**
 * remark-katex — build-time math rendering (ADR-0011). Runs after `remark-math`, which
 * tokenizes `$…$` / `$$…$$` at the micromark level into `inlineMath` / `math` nodes.
 * (That tokenization is essential under MDX: it protects LaTeX braces like `e^{i\pi}`
 * from being parsed as JSX expressions.) This plugin renders those nodes with KaTeX and
 * replaces them with a `<KaTeX html=…>` component.
 *
 *  - `inlineMath`            → `<KaTeX inline html=…>`
 *  - `math`                  → `<KaTeX html=…>` (display)
 *  - `math` starting `{1|3}` → each `\\`-separated row is a click step, revealed via the
 *                              Phase-06 click model (numbered after prose + code clicks).
 *
 * Runs after remark-clicks (reads/bumps `totalClicks`) and before remark-code.
 */

interface Node {
  type: string;
  value?: string;
  /** remark-math puts the text after the opening `$$` here (our step spec). */
  meta?: string | null;
  name?: string;
  attributes?: Array<{ type: string; name: string; value: string }>;
  children?: Node[];
}

function katexEl(html: string, inline: boolean): Record<string, unknown> {
  const attributes: Array<{ type: string; name: string; value: string }> = [
    { type: "mdxJsxAttribute", name: "html", value: html },
  ];
  if (inline) attributes.push({ type: "mdxJsxAttribute", name: "inline", value: "true" });
  return {
    type: inline ? "mdxJsxTextElement" : "mdxJsxFlowElement",
    name: "KaTeX",
    attributes,
    children: [],
  };
}

function replaceNode(node: Node, replacement: Record<string, unknown>): void {
  const target = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, replacement);
}

/** Map equation rows (1-based) to their click step, à la clickLinesTransformer. */
function rowSteps(steps: LineStep[]): { lineToStep: Map<number, number>; allFrom: number | null } {
  const lineToStep = new Map<number, number>();
  let allFrom: number | null = null;
  steps.forEach((step, i) => {
    const stepNo = i + 1;
    if (step === "all") {
      if (allFrom == null) allFrom = stepNo;
    } else {
      for (const ln of step) if (!lineToStep.has(ln)) lineToStep.set(ln, stepNo);
    }
  });
  return { lineToStep, allFrom };
}

const LEADING_STEPS = /^\s*(\{[^}]*\})\s*/;

/** A leading `{…}` is a *step spec* only if every `|`/`,`-separated part is a number,
 * range, `*`, `all`, or empty — otherwise it's TeX (set-builder `{x | x > 0}` etc.). */
function isStepSpec(braced: string): boolean {
  const inner = braced.slice(1, -1).trim();
  if (inner === "") return false;
  return inner.split(/[|,]/).every((part) => /^\s*(?:\d+(?:\s*-\s*\d+)?|\*|all)?\s*$/.test(part));
}

export function remarkKatex() {
  return (tree: Node): void => {
    const totalEntry = findTotalClicks(tree);
    let clickBase = totalEntry?.value ?? 0;

    visit(tree as never, (node: Node) => {
      if (node.type === "inlineMath") {
        replaceNode(node, katexEl(renderMath(node.value ?? "", false), true));
        return;
      }
      if (node.type !== "math") return;

      let tex = node.value ?? "";
      // Step spec comes from the fence meta (`$$ {1|3}`); fall back to a leading
      // `{…}` in the body for parsers that don't split meta.
      let spec = (node.meta ?? "").trim();
      let stepMatch = spec === "" ? tex.match(LEADING_STEPS) : null;
      if (stepMatch && !isStepSpec(stepMatch[1] ?? "")) stepMatch = null;
      if (stepMatch) spec = stepMatch[1] ?? "";
      const clickSteps = spec ? parseCodeMeta(spec).clickSteps : null;

      if (clickSteps && clickSteps.length > 0) {
        if (stepMatch) tex = tex.slice(stepMatch[0].length);
        const { lineToStep, allFrom } = rowSteps(clickSteps);
        const rows = tex
          .split(/\\\\/)
          .map((r) => r.trim())
          .filter((r) => r !== "");
        const html = rows
          .map((row, i) => {
            const step = lineToStep.get(i + 1) ?? allFrom;
            const rendered = renderMath(row, true);
            if (step == null) return `<div class="as-math-row as-math-static">${rendered}</div>`;
            return `<div class="as-math-row" data-click="${clickBase + step}">${rendered}</div>`;
          })
          .join("");
        clickBase += clickSteps.length;
        replaceNode(node, katexEl(`<div class="as-math-steps">${html}</div>`, false));
      } else {
        replaceNode(node, katexEl(renderMath(tex, true), false));
      }
    });

    if (totalEntry && clickBase > totalEntry.value) setTotalClicks(totalEntry, clickBase);
  };
}

export default remarkKatex;
