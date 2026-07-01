/**
 * Fence-meta parsing. A code fence's info string is `<lang> <meta…>`; the meta may
 * carry a line-highlight spec, per-click line steps, and boolean flags:
 *
 *   ```ts {1,3-5}            → static highlight of lines 1,3,4,5
 *   ```ts {1|2-3|all}        → click steps: step1=line1, step2=lines2-3, step3=all
 *   ```ts twoslash           → Twoslash type hovers
 *   ```ts {2} twoslash title="demo.ts"
 */

/** One click step's highlighted lines (`"all"` highlights the whole block). */
export type LineStep = number[] | "all";

export interface CodeMeta {
  /** Union of statically-highlighted lines (empty when click-stepped). */
  highlightLines: number[];
  /** Per-click line steps, or null when the spec has no `|`. */
  clickSteps: LineStep[] | null;
  twoslash: boolean;
  lineNumbers: boolean;
  title: string | undefined;
  /** CSS max-height (e.g. `"12em"`) from `maxHeight=…`. */
  maxHeight: string | undefined;
}

/** Expand `"1,3-5"` to `[1,3,4,5]` (ignoring blanks and malformed parts). */
export function parseLineRanges(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const range = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
    } else if (/^\d+$/.test(p)) {
      out.add(Number(p));
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Extract the first `{…}` group and return it plus the meta with that group removed. */
function extractBraceGroup(meta: string): { group: string | null; rest: string } {
  const m = meta.match(/\{([^}]*)\}/);
  if (!m) return { group: null, rest: meta };
  return {
    group: m[1] ?? "",
    rest: meta.slice(0, m.index) + meta.slice((m.index ?? 0) + m[0].length),
  };
}

function parseFlag(meta: string, name: string): boolean {
  return new RegExp(`(^|\\s)${name}(\\s|$)`).test(meta);
}

function parseKeyValue(meta: string, key: string): string | undefined {
  const m = meta.match(new RegExp(`${key}=(?:"([^"]*)"|'([^']*)'|(\\S+))`));
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3];
}

export function parseCodeMeta(meta: string | null | undefined): CodeMeta {
  const raw = (meta ?? "").trim();
  const { group } = extractBraceGroup(raw);

  let highlightLines: number[] = [];
  let clickSteps: LineStep[] | null = null;
  if (group != null && group.trim() !== "") {
    if (group.includes("|")) {
      clickSteps = group.split("|").map((seg) => {
        const s = seg.trim();
        return s === "all" ? "all" : parseLineRanges(s);
      });
    } else {
      highlightLines = parseLineRanges(group);
    }
  }

  return {
    highlightLines,
    clickSteps,
    twoslash: parseFlag(raw, "twoslash"),
    lineNumbers: parseFlag(raw, "lineNumbers") || parseFlag(raw, "line-numbers"),
    title: parseKeyValue(raw, "title"),
    maxHeight: parseKeyValue(raw, "maxHeight") ?? parseKeyValue(raw, "max-height"),
  };
}

/** Is this fence a Magic Move block? (` ```md magic-move `). */
export function isMagicMoveMeta(meta: string | null | undefined): boolean {
  const m = (meta ?? "").trim();
  return parseFlag(m, "magic-move") || parseFlag(m, "magic");
}
