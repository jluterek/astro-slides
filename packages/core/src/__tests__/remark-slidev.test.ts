import { describe, expect, it } from "vitest";
import { remarkSlidev } from "../compat/remark-slidev.js";

interface Attr {
  type: string;
  name: string;
  value?: string;
}
interface TestNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Attr[];
  children?: TestNode[];
}

const el = (name: string, attrs: Attr[] = [], children: TestNode[] = []): TestNode => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: attrs,
  children,
});
const a = (name: string, value?: string): Attr =>
  value === undefined
    ? { type: "mdxJsxAttribute", name }
    : { type: "mdxJsxAttribute", name, value };
const root = (children: TestNode[]): TestNode => ({ type: "root", children });

function run(tree: TestNode): TestNode {
  remarkSlidev()(tree as never);
  return tree;
}

const attrVal = (node: TestNode | undefined, name: string): string | undefined =>
  node?.attributes?.find((x) => x.name === name)?.value;

describe("remarkSlidev — element form", () => {
  it("renames <v-click>/<v-after>/<v-clicks> to native components", () => {
    const tree = run(root([el("v-click"), el("v-after"), el("v-clicks")]));
    expect(tree.children?.map((c) => c.name)).toEqual(["Click", "After", "Clicks"]);
  });

  it('moves a valued <v-click="3"> onto `at`', () => {
    const tree = run(root([el("v-click", [a("v-click", "3")])]));
    const node = tree.children?.[0];
    expect(node?.name).toBe("Click");
    expect(attrVal(node, "at")).toBe("3");
    expect(node?.attributes?.some((x) => x.name === "v-click")).toBe(false);
  });

  it("tolerates a modifier suffix like v-click.hide", () => {
    const tree = run(root([el("v-click.hide")]));
    expect(tree.children?.[0]?.name).toBe("Click");
  });
});

describe("remarkSlidev — attribute form", () => {
  it("wraps an element carrying `v-click` in <Click>", () => {
    const tree = run(root([el("div", [a("v-click")], [{ type: "text", value: "hi" }])]));
    const wrapper = tree.children?.[0];
    expect(wrapper?.name).toBe("Click");
    const inner = wrapper?.children?.[0];
    expect(inner?.name).toBe("div");
    // The directive attribute is stripped from the inner element.
    expect(inner?.attributes?.some((x) => x.name === "v-click")).toBe(false);
  });

  it('carries a `v-click="+1"` value onto the wrapper\'s `at`', () => {
    const tree = run(root([el("p", [a("v-click", "+1")])]));
    const wrapper = tree.children?.[0];
    expect(wrapper?.name).toBe("Click");
    expect(attrVal(wrapper, "at")).toBe("+1");
  });

  it("wraps a `v-after` element in <After>", () => {
    const tree = run(root([el("div", [a("v-after")])]));
    expect(tree.children?.[0]?.name).toBe("After");
  });

  it("leaves elements without directives untouched", () => {
    const tree = run(root([el("div", [a("class", "x")])]));
    expect(tree.children?.[0]?.name).toBe("div");
  });
});

describe("remarkSlidev — integration with the click resolver shape", () => {
  it("produces components remark-clicks can then number", async () => {
    const { remarkClicks } = await import("../remark-clicks.js");
    const tree = run(root([el("div", [a("v-click")]), el("v-click")]));
    remarkClicks()(tree as never);
    // children[0] is the injected totalClicks export; two clicks follow.
    expect(tree.children?.[0]?.value).toBe("export const totalClicks = 2;");
  });
});
