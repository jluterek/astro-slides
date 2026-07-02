import { SKIP, visit } from "unist-util-visit";

/**
 * remark-clicks — resolves click steps at MDX compile time (ADR-0008).
 *
 * Walks the MDX AST in document order, finds `<Click>` / `<After>` / `<Clicks>`
 * JSX elements, assigns each a deterministic absolute step index, rewrites its `at`
 * (and `to` for ranges) attribute to the resolved value, and injects
 * `export const totalClicks = N` so the manifest can sum per-slide totals without
 * rendering. The runtime is a pure consumer of this plan.
 *
 * Semantics:
 *  - `<Click>`            → next auto step
 *  - `<Click at="3">`     → absolute step 3
 *  - `<Click at="+2">`    → 2 after the previous click
 *  - `<Click at="[2,5]">` → visible during steps 2..5 (emits `to`)
 *  - `<After>`            → same step as the previous click (`at="+0"`)
 *  - `<Clicks every="2">` → each child (grouped by `every`) is a step
 */

// Minimal structural types for the mdast/mdx-jsx nodes we touch.
interface JsxAttr {
  type: string;
  name?: string;
  value?: unknown;
}
interface Node {
  type: string;
  name?: string | null;
  value?: string;
  attributes?: JsxAttr[];
  children?: Node[];
  data?: Record<string, unknown>;
}

const CLICK_NAMES = new Set(["Click", "After", "Clicks"]);

/** Read an attribute's value as a plain string (handles `at="2"` and `at={2}`). */
function attrString(node: Node, name: string): string | undefined {
  const attr = node.attributes?.find((a) => a.type === "mdxJsxAttribute" && a.name === name);
  if (!attr) return undefined;
  const v = attr.value;
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  // mdxJsxAttributeValueExpression: `{ type, value: "<source>" }`
  if (typeof v === "object" && "value" in v) return String((v as { value: unknown }).value);
  return undefined;
}

/** Set (or add) a plain string attribute, discarding any prior expression form. */
function setStringAttr(node: Node, name: string, value: string): void {
  node.attributes ??= [];
  const existing = node.attributes.find((a) => a.type === "mdxJsxAttribute" && a.name === name);
  if (existing) {
    existing.value = value;
  } else {
    node.attributes.push({ type: "mdxJsxAttribute", name, value });
  }
}

/** A child that renders nothing (whitespace-only text) and shouldn't become a step. */
function isBlank(node: Node): boolean {
  return node.type === "text" && (node.value ?? "").trim() === "";
}

/** Wrap a node in a resolved `<Click at="…">` element (block-safe reveal wrapper). */
function wrapInClick(child: Node, step: number, anim: string | undefined): Node {
  const attributes: JsxAttr[] = [{ type: "mdxJsxAttribute", name: "at", value: String(step) }];
  if (anim) attributes.push({ type: "mdxJsxAttribute", name: "anim", value: anim });
  return { type: "mdxJsxFlowElement", name: "Click", attributes, children: [child] };
}

interface Resolver {
  next: number;
  last: number;
}

function resolveClick(at: string | undefined, r: Resolver): { at: number; to?: number } {
  if (at == null || at.trim() === "") {
    const step = r.next;
    r.next = step + 1;
    r.last = step;
    return { at: step };
  }
  const s = at.trim();
  const range = s.match(/^\[\s*(\d+)\s*,\s*(\d+)\s*\]$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    r.next = Math.max(r.next, end + 1);
    r.last = start;
    return { at: start, to: end };
  }
  if (s.startsWith("+")) {
    const step = r.last + (Number(s.slice(1)) || 0);
    r.next = Math.max(r.next, step + 1);
    r.last = step;
    return { at: step };
  }
  const n = Number(s);
  if (Number.isFinite(n)) {
    r.next = Math.max(r.next, n + 1);
    r.last = n;
    return { at: n };
  }
  const step = r.next;
  r.next = step + 1;
  r.last = step;
  return { at: step };
}

/** Hand-built estree for `export const totalClicks = <n>` (avoids a JS parser dep). */
function totalClicksEstree(total: number): unknown {
  return {
    type: "Program",
    sourceType: "module",
    body: [
      {
        type: "ExportNamedDeclaration",
        specifiers: [],
        source: null,
        declaration: {
          type: "VariableDeclaration",
          kind: "const",
          declarations: [
            {
              type: "VariableDeclarator",
              id: { type: "Identifier", name: "totalClicks" },
              init: { type: "Literal", value: total, raw: String(total) },
            },
          ],
        },
      },
    ],
  };
}

export function remarkClicks() {
  return (tree: Node): void => {
    const r: Resolver = { next: 1, last: 0 };

    visit(tree as never, (node: Node) => {
      if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
      if (!node.name || !CLICK_NAMES.has(node.name)) return;

      if (node.name === "After") {
        const step = r.last > 0 ? r.last : resolveClick(undefined, r).at;
        setStringAttr(node, "at", String(step));
        return;
      }
      if (node.name === "Clicks") {
        // Resolve at parse time by wrapping each revealable child in a `<Click>`;
        // the component is a pass-through. Skip the rewritten subtree so the new
        // Click wrappers aren't re-numbered.
        const every = Math.max(1, Number(attrString(node, "every")) || 1);
        const anim = attrString(node, "anim");
        const base = r.next;
        let i = 0;
        node.children = (node.children ?? []).map((child) => {
          if (isBlank(child)) return child;
          const step = base + Math.floor(i / every);
          i += 1;
          return wrapInClick(child, step, anim);
        });
        // A <Clicks> with no revealable children contributes no steps (a dead
        // trailing keypress otherwise).
        const steps = Math.ceil(i / every);
        r.next = base + steps;
        if (steps > 0) r.last = base + steps - 1;
        return SKIP;
      }
      // <Click>
      const { at, to } = resolveClick(attrString(node, "at"), r);
      setStringAttr(node, "at", String(at));
      if (to != null) setStringAttr(node, "to", String(to));
      return undefined;
    });

    const total = Math.max(0, r.next - 1);
    tree.children ??= [];
    tree.children.unshift({
      type: "mdxjsEsm",
      value: `export const totalClicks = ${total};`,
      data: { estree: totalClicksEstree(total) },
    });
  };
}

export default remarkClicks;
