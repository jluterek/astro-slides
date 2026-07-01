import { describe, expect, it } from "vitest";
import { DEFAULT_PLANTUML_SERVER, plantumlUrl } from "../diagrams/plantuml.js";
import { remarkDiagrams } from "../diagrams/remark-diagrams.js";

interface Node {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  name?: string;
  attributes?: Array<{ name: string; value: string }>;
  children?: Node[];
}
function attr(node: Node, name: string): string | undefined {
  return node.attributes?.find((a) => a.name === name)?.value;
}
function code(lang: string, value: string, meta: string | null = null): Node {
  return { type: "code", lang, value, meta };
}

describe("plantumlUrl", () => {
  it("encodes to a default-server SVG URL", () => {
    const url = plantumlUrl("A -> B");
    expect(url.startsWith(`${DEFAULT_PLANTUML_SERVER}/svg/`)).toBe(true);
    expect(url.length).toBeGreaterThan(DEFAULT_PLANTUML_SERVER.length + 10);
  });
  it("honors a custom server (trailing slash trimmed) and format", () => {
    expect(plantumlUrl("A -> B", "https://uml.local/", "png")).toMatch(
      /^https:\/\/uml\.local\/png\/\w+/,
    );
  });
  it("is deterministic for identical source", () => {
    expect(plantumlUrl("A -> B")).toBe(plantumlUrl("A -> B"));
  });
});

describe("remarkDiagrams", () => {
  it("converts a mermaid fence to <Mermaid> carrying the source + options", () => {
    const node = code("mermaid", "graph LR\n A-->B", "theme: neutral");
    remarkDiagrams()({ type: "root", children: [node] } as never);
    expect(node.type).toBe("mdxJsxFlowElement");
    expect(node.name).toBe("Mermaid");
    expect(attr(node, "code")).toContain("graph LR");
    expect(attr(node, "options")).toBe("theme: neutral");
  });

  it("converts a plantuml fence to a <PlantUml> image against the configured server", () => {
    const node = code("plantuml", "A -> B");
    remarkDiagrams({ plantumlServer: "https://uml.local" })({
      type: "root",
      children: [node],
    } as never);
    expect(node.name).toBe("PlantUml");
    expect(attr(node, "src")).toMatch(/^https:\/\/uml\.local\/svg\//);
  });

  it("also recognizes the `puml` alias", () => {
    const node = code("puml", "A -> B");
    remarkDiagrams()({ type: "root", children: [node] } as never);
    expect(node.name).toBe("PlantUml");
  });

  it("leaves ordinary code fences untouched (for remark-code to highlight)", () => {
    const node = code("ts", "const x = 1");
    remarkDiagrams()({ type: "root", children: [node] } as never);
    expect(node.type).toBe("code");
  });
});
