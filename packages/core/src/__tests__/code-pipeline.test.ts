import { beforeAll, describe, expect, it } from "vitest";
import { resolveShikiConfig } from "../code/config.js";
import { getHighlighter } from "../code/highlighter.js";
import { buildMagicMove, parseMagicMoveSteps } from "../code/magic-move.js";
import { remarkCode } from "../code/remark-code.js";
import { clickLinesTransformer } from "../code/transformers.js";

interface Node {
  type: string;
  name?: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  attributes?: Array<{ name: string; value: string }>;
  children?: Node[];
  data?: Record<string, unknown>;
}

const config = resolveShikiConfig({ langs: ["typescript"] });
// Small highlighter shared across cases; created once.
let highlighter: Awaited<ReturnType<typeof getHighlighter>>;
beforeAll(async () => {
  highlighter = await getHighlighter(config);
});

function codeNode(value: string, lang = "typescript", meta: string | null = null): Node {
  return { type: "code", lang, meta, value };
}
function tree(...children: Node[]): Node {
  return { type: "root", children };
}
function attr(node: unknown, name: string): string | undefined {
  return (node as Node).attributes?.find((a) => a.name === name)?.value;
}
// remark-code is typed against core's own structural Node; our test Node is a
// compatible subset, so bridge through `never` at the call boundary.
const run = (t: Node) => remarkCode({ root: "/x", config, highlighter })(t as never);

describe("clickLinesTransformer", () => {
  it("reports the max absolute step (base + step count)", () => {
    const { maxStep } = clickLinesTransformer([[1], [2, 3], "all"], 4);
    expect(maxStep).toBe(7);
  });
});

describe("remarkCode highlighting", () => {
  it("replaces a fence with a <CodeBlock> carrying Shiki HTML + dual-theme vars", async () => {
    const node = codeNode("const x: number = 1");
    const t = tree(node);
    await run(t);
    expect(node.type).toBe("mdxJsxFlowElement");
    expect(node.name).toBe("CodeBlock");
    const html = attr(node, "html") ?? "";
    expect(html).toContain('class="shiki');
    expect(html).toContain("--shiki-dark"); // dual theme emitted
  });

  it("marks statically-highlighted lines with `.highlighted`", async () => {
    const node = codeNode("a\nb\nc", "typescript", "{2}");
    await run(tree(node));
    const html = attr(node, "html") ?? "";
    expect(html).toContain("highlighted");
  });

  it("stamps `data-click` on click-stepped lines and extends the slide's total", async () => {
    const total: Node = {
      type: "mdxjsEsm",
      value: "export const totalClicks = 0;",
      data: {
        estree: {
          body: [{ declaration: { declarations: [{ init: { value: 0, raw: "0" } }] } }],
        },
      },
    };
    const node = codeNode("l1\nl2\nl3", "typescript", "{1|2|3}");
    const t = tree(total, node);
    await run(t);
    const html = attr(node, "html") ?? "";
    expect(html).toContain('data-click="1"');
    expect(html).toContain('data-click="3"');
    // 3 code steps bumped the injected total from 0 -> 3.
    expect(total.value).toBe("export const totalClicks = 3;");
  });
});

describe("magic move", () => {
  it("parses inner fences into ordered steps", () => {
    const steps = parseMagicMoveSteps("```ts\na\n```\n```ts\nb\n```");
    expect(steps).toHaveLength(2);
    expect(steps[0]?.code).toBe("a");
    expect(steps[1]?.code).toBe("b");
  });

  it("builds a <ShikiMagicMove> node whose token payload is deterministic", async () => {
    const src = "```ts\nconst a = 1\n```\n```ts\nconst a = 2\n```";
    const one = await buildMagicMove(src, { config, highlighter, base: 0 });
    const two = await buildMagicMove(src, { config, highlighter, base: 0 });
    expect(one.node.name).toBe("ShikiMagicMove");
    expect(attr(one.node, "count")).toBe("2");
    // 2 steps -> 1 transition -> click 1.
    expect(one.maxStep).toBe(1);
    // Stable tokenization: identical source + theme -> identical compressed payload.
    expect(attr(one.node, "steps")).toBe(attr(two.node, "steps"));
  });
});
