import { describe, expect, it } from "vitest";
import { renderMath } from "../math/katex.js";
import { remarkKatex } from "../math/remark-katex.js";

interface Node {
  type: string;
  value?: string;
  meta?: string | null;
  name?: string;
  attributes?: Array<{ name: string; value: string }>;
  children?: Node[];
  data?: Record<string, unknown>;
}

function attr(node: Node, name: string): string | undefined {
  return node.attributes?.find((a) => a.name === name)?.value;
}
function totalNode(n: number): Node {
  return {
    type: "mdxjsEsm",
    value: `export const totalClicks = ${n};`,
    data: {
      estree: {
        body: [{ declaration: { declarations: [{ init: { value: n, raw: String(n) } }] } }],
      },
    },
  };
}
const run = (tree: Node) => remarkKatex()(tree as never);

describe("renderMath", () => {
  it("renders inline math to KaTeX HTML", () => {
    const html = renderMath("x^2", false);
    expect(html).toContain("katex");
    expect(html).not.toContain('class="katex-display"');
  });
  it("renders block math in display mode", () => {
    expect(renderMath("x^2", true)).toContain("katex-display");
  });
  it("does not throw on invalid math (renders an error node)", () => {
    expect(() => renderMath("\\frac{", true)).not.toThrow();
  });
});

describe("remarkKatex", () => {
  it("replaces an inlineMath node with an inline <KaTeX>", () => {
    const node: Node = { type: "inlineMath", value: "a+b" };
    run({ type: "root", children: [node] });
    expect(node.type).toBe("mdxJsxTextElement");
    expect(node.name).toBe("KaTeX");
    expect(attr(node, "inline")).toBe("true");
    expect(attr(node, "html")).toContain("katex");
  });

  it("replaces a math node with a block <KaTeX>", () => {
    const node: Node = { type: "math", value: "a=b" };
    run({ type: "root", children: [node] });
    expect(node.type).toBe("mdxJsxFlowElement");
    expect(attr(node, "html")).toContain("katex-display");
  });

  it("renders stepped block math with per-row data-click and bumps totalClicks", () => {
    const total = totalNode(0);
    const math: Node = { type: "math", meta: "{1|2|3}", value: "a \\\\ b \\\\ c" };
    run({ type: "root", children: [total, math] });
    const html = attr(math, "html") ?? "";
    expect(html).toContain("as-math-steps");
    expect(html).toContain('data-click="1"');
    expect(html).toContain('data-click="3"');
    // 3 rows numbered after existing prose clicks (0) -> total becomes 3.
    expect(total.value).toBe("export const totalClicks = 3;");
  });

  it("numbers stepped math after existing prose clicks", () => {
    const total = totalNode(2);
    const math: Node = { type: "math", meta: "{1|2}", value: "a \\\\ b" };
    run({ type: "root", children: [total, math] });
    const html = attr(math, "html") ?? "";
    expect(html).toContain('data-click="3"');
    expect(html).toContain('data-click="4"');
    expect(total.value).toBe("export const totalClicks = 4;");
  });
});
