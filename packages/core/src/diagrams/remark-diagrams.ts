import { visit } from "unist-util-visit";
import { DEFAULT_PLANTUML_SERVER, plantumlUrl } from "./plantuml.js";

/**
 * remark-diagrams — converts diagram code fences to components *before* remark-code,
 * so they aren't syntax-highlighted (ADR-0011):
 *
 *  - ` ```mermaid `           → `<Mermaid code=… options=…>` (client renders SVG in a
 *                               Shadow DOM; the fence info string is passed as options)
 *  - ` ```plantuml ` / `puml` → `<PlantUml src=…>` (build-time-encoded server image)
 */

interface Node {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  attributes?: Array<{ type: string; name: string; value: string }>;
  children?: Node[];
}

export interface DiagramsOptions {
  /** PlantUML server base URL (default the public plantuml.com). */
  plantumlServer?: string;
}

function strAttr(name: string, value: string) {
  return { type: "mdxJsxAttribute", name, value };
}

function replaceNode(node: Node, replacement: Record<string, unknown>): void {
  const target = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, replacement);
}

export function remarkDiagrams(options: DiagramsOptions = {}) {
  const server = options.plantumlServer ?? DEFAULT_PLANTUML_SERVER;
  return (tree: Node): void => {
    visit(tree as never, "code", (node: Node) => {
      const lang = (node.lang ?? "").trim().toLowerCase();
      const source = node.value ?? "";

      if (lang === "mermaid") {
        const attributes = [strAttr("code", source)];
        const opts = (node.meta ?? "").trim();
        if (opts) attributes.push(strAttr("options", opts));
        replaceNode(node, {
          type: "mdxJsxFlowElement",
          name: "Mermaid",
          attributes,
          children: [],
        });
        return;
      }

      if (lang === "plantuml" || lang === "puml") {
        replaceNode(node, {
          type: "mdxJsxFlowElement",
          name: "PlantUml",
          attributes: [
            strAttr("src", plantumlUrl(source, server)),
            strAttr("alt", "PlantUML diagram"),
          ],
          children: [],
        });
      }
    });
  };
}

export default remarkDiagrams;
