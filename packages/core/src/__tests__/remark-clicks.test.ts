import { describe, expect, it } from "vitest";
import { remarkClicks } from "../remark-clicks.js";

// Minimal mdast/mdx-jsx node builders for the plugin under test.
interface Attr {
  type: string;
  name: string;
  value: string;
}
interface TestNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Attr[];
  children?: TestNode[];
  data?: { estree?: unknown };
}

const jsx = (name: string, at?: string, extra: Record<string, string> = {}): TestNode => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: [
    ...(at != null ? [{ type: "mdxJsxAttribute", name: "at", value: at }] : []),
    ...Object.entries(extra).map(([k, v]) => ({ type: "mdxJsxAttribute", name: k, value: v })),
  ],
  children: [],
});

const root = (children: TestNode[]): TestNode => ({ type: "root", children });

function run(tree: TestNode): TestNode {
  // The plugin's parameter is its internal Node type; the shapes are structurally compatible.
  remarkClicks()(tree as never);
  return tree;
}

const at = (node: TestNode | undefined): string | undefined =>
  node?.attributes?.find((a) => a.name === "at")?.value;
const attr = (node: TestNode | undefined, name: string): string | undefined =>
  node?.attributes?.find((a) => a.name === name)?.value;

describe("remarkClicks", () => {
  it("assigns sequential auto steps in document order", () => {
    const tree = run(root([jsx("Click"), jsx("Click"), jsx("Click")]));
    // children[0] is the injected totalClicks export; clicks follow.
    expect(at(tree.children?.[1])).toBe("1");
    expect(at(tree.children?.[2])).toBe("2");
    expect(at(tree.children?.[3])).toBe("3");
  });

  it("injects a totalClicks export equal to the highest step", () => {
    const tree = run(root([jsx("Click"), jsx("Click")]));
    const esm = tree.children?.[0];
    expect(esm?.type).toBe("mdxjsEsm");
    expect(esm?.value).toBe("export const totalClicks = 2;");
    expect(esm?.data?.estree).toBeTruthy();
  });

  it("honors absolute `at` and keeps the auto counter ahead of it", () => {
    const tree = run(root([jsx("Click", "5"), jsx("Click")]));
    expect(at(tree.children?.[1])).toBe("5");
    expect(at(tree.children?.[2])).toBe("6");
  });

  it("resolves relative `+K` offsets against the previous click", () => {
    const tree = run(root([jsx("Click"), jsx("Click", "+2")]));
    expect(at(tree.children?.[1])).toBe("1");
    expect(at(tree.children?.[2])).toBe("3");
  });

  it("resolves ranges into at + to", () => {
    const tree = run(root([jsx("Click", "[2,5]")]));
    expect(at(tree.children?.[1])).toBe("2");
    expect(attr(tree.children?.[1], "to")).toBe("5");
    expect(tree.children?.[0]?.value).toBe("export const totalClicks = 5;");
  });

  it("makes <After> share the previous click's step", () => {
    const tree = run(root([jsx("Click"), jsx("After")]));
    expect(at(tree.children?.[1])).toBe("1");
    expect(at(tree.children?.[2])).toBe("1");
  });

  it("wraps <Clicks> children in resolved <Click> steps", () => {
    const clicks: TestNode = {
      type: "mdxJsxFlowElement",
      name: "Clicks",
      attributes: [],
      children: [
        { type: "mdxJsxFlowElement", name: "div", children: [] },
        { type: "text", value: "\n" },
        { type: "mdxJsxFlowElement", name: "div", children: [] },
      ],
    };
    const tree = run(root([jsx("Click"), clicks]));
    const wrapped = clicks.children?.filter((c) => c.name === "Click") ?? [];
    expect(wrapped).toHaveLength(2);
    expect(at(wrapped[0])).toBe("2");
    expect(at(wrapped[1])).toBe("3");
    expect(tree.children?.[0]?.value).toBe("export const totalClicks = 3;");
  });

  it("groups <Clicks every=2> children into shared steps", () => {
    const clicks: TestNode = {
      type: "mdxJsxFlowElement",
      name: "Clicks",
      attributes: [{ type: "mdxJsxAttribute", name: "every", value: "2" }],
      children: [
        { type: "mdxJsxFlowElement", name: "li", children: [] },
        { type: "mdxJsxFlowElement", name: "li", children: [] },
        { type: "mdxJsxFlowElement", name: "li", children: [] },
      ],
    };
    run(root([clicks]));
    const steps = (clicks.children ?? []).filter((c) => c.name === "Click").map((c) => at(c));
    expect(steps).toEqual(["1", "1", "2"]);
  });
});
