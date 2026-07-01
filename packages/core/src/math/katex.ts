import katex from "katex";

/**
 * Build-time KaTeX rendering (ADR-0011). Math is tokenized to HTML at build so the
 * runtime ships no math engine — only KaTeX's stylesheet (conditionally linked when a
 * deck uses math). `throwOnError: false` renders a red error node instead of failing
 * the whole build on one bad expression.
 */
export function renderMath(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    output: "htmlAndMathml",
    strict: false,
  });
}
