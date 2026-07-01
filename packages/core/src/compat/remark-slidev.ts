import { visit } from "unist-util-visit";

/**
 * remark-slidev-compat (Phase 15) — accept Slidev's `v-click` family as aliases of our
 * `<Click>` / `<After>` / `<Clicks>` components. Runs BEFORE remark-clicks, so the aliases
 * are rewritten to native components and then get their step indices assigned by the normal
 * click resolver.
 *
 * Two authored forms are handled:
 *  - **Element form** — `<v-click>…</v-click>`, `<v-after>…</v-after>`, `<v-clicks>…</v-clicks>`
 *    are renamed to `Click` / `After` / `Clicks` (a `v-click="N"` value moves to `at`).
 *  - **Attribute form** — a `v-click` / `v-after` / `v-clicks` attribute on any element wraps
 *    that element in the matching component (`v-click="+1"` → `<Click at="+1">`), and the
 *    attribute is dropped from the inner element.
 *
 * `.hide`/`.show` modifiers on the directive (e.g. `v-click.hide`) are tolerated — the base
 * name still maps — but the hide/show distinction isn't modeled (documented compat gap).
 */

interface JsxAttr {
  type: string;
  name?: string;
  value?: unknown;
}
interface Node {
  type: string;
  name?: string | null;
  attributes?: JsxAttr[];
  children?: Node[];
}

// Directive base name → our component name.
const ELEMENT_ALIAS: Record<string, string> = {
  "v-click": "Click",
  "v-after": "After",
  "v-clicks": "Clicks",
};

/** Strip a Vue modifier suffix (`v-click.hide` → `v-click`). */
function baseName(name: string): string {
  const dot = name.indexOf(".");
  return dot === -1 ? name : name.slice(0, dot);
}

/** Read a JSX attribute's value as a plain string, or "" for a valueless attribute. */
function attrValueString(attr: JsxAttr): string {
  const v = attr.value;
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "value" in v) return String((v as { value: unknown }).value);
  return "";
}

/** Find a `v-click`-family attribute on a node (by base name), if any. */
function findDirectiveAttr(node: Node): { attr: JsxAttr; base: string } | undefined {
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute" || typeof attr.name !== "string") continue;
    const base = baseName(attr.name);
    if (base in ELEMENT_ALIAS) return { attr, base };
  }
  return undefined;
}

export function remarkSlidev() {
  return (tree: Node): void => {
    // Pass 1 — element form: rename <v-click>/<v-after>/<v-clicks> in place.
    visit(tree as never, (node: Node) => {
      if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
      if (typeof node.name !== "string") return;
      const base = baseName(node.name);
      const alias = ELEMENT_ALIAS[base];
      if (!alias) return;
      // Move a positional value (`<v-click="3">`) onto `at`; harmless if absent.
      const valued = node.attributes?.find(
        (a) =>
          a.type === "mdxJsxAttribute" && typeof a.name === "string" && baseName(a.name) === base,
      );
      if (valued) {
        const at = attrValueString(valued);
        node.attributes = (node.attributes ?? []).filter((a) => a !== valued);
        if (at) node.attributes.push({ type: "mdxJsxAttribute", name: "at", value: at });
      }
      node.name = alias;
    });

    // Pass 2 — attribute form: wrap the host element in the matching component.
    visit(
      tree as never,
      (node: Node, index: number | undefined, parent: Node | undefined): number | undefined => {
        if (!parent || index == null) return undefined;
        if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement")
          return undefined;
        // Don't re-wrap the components we just produced.
        if (node.name === "Click" || node.name === "After" || node.name === "Clicks") {
          return undefined;
        }
        const found = findDirectiveAttr(node);
        if (!found) return undefined;

        const alias = ELEMENT_ALIAS[found.base] as string;
        const at = attrValueString(found.attr);
        node.attributes = (node.attributes ?? []).filter((a) => a !== found.attr);

        const wrapperAttrs: JsxAttr[] = [];
        if (alias === "Click" && at)
          wrapperAttrs.push({ type: "mdxJsxAttribute", name: "at", value: at });
        const wrapper: Node = {
          type: "mdxJsxFlowElement",
          name: alias,
          attributes: wrapperAttrs,
          children: [node],
        };
        (parent.children as Node[])[index] = wrapper;
        // Re-visit the wrapper's subtree so nested directives still resolve, but skip the
        // wrapper node itself (its name is already a native component).
        return index;
      },
    );
  };
}

export default remarkSlidev;
