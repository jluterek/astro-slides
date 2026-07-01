/**
 * Shared access to the `export const totalClicks = N` node that remark-clicks injects
 * (ADR-0008). Plugins that add their own click steps after the prose clicks — code line
 * reveals (Phase 08), stepped block math (Phase 09) — read the current total, number
 * their steps after it, and bump it, so the slide's step count stays authoritative.
 */

interface EsmNode {
  type: string;
  value?: string;
  data?: Record<string, unknown>;
  children?: EsmNode[];
}

export interface TotalClicksEntry {
  node: EsmNode;
  value: number;
}

/** Find the injected `totalClicks` esm node and its current value, if present. */
export function findTotalClicks(tree: { children?: EsmNode[] }): TotalClicksEntry | null {
  for (const child of tree.children ?? []) {
    if (child.type === "mdxjsEsm" && /export const totalClicks/.test(child.value ?? "")) {
      const m = (child.value ?? "").match(/totalClicks\s*=\s*(\d+)/);
      return { node: child, value: m ? Number(m[1]) : 0 };
    }
  }
  return null;
}

/** Rewrite the entry's value + backing estree literal to `total`. */
export function setTotalClicks(entry: TotalClicksEntry, total: number): void {
  entry.node.value = `export const totalClicks = ${total};`;
  const estree = entry.node.data?.estree as
    | {
        body?: Array<{
          declaration?: { declarations?: Array<{ init?: { value: number; raw: string } }> };
        }>;
      }
    | undefined;
  const init = estree?.body?.[0]?.declaration?.declarations?.[0]?.init;
  if (init) {
    init.value = total;
    init.raw = String(total);
  }
}
