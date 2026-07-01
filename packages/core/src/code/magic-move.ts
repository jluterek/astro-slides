import { codeToKeyedTokens, createMagicMoveMachine } from "@shikijs/magic-move/core";
import lzString from "lz-string";
import type { Highlighter } from "shiki";

const { compressToBase64 } = lzString;

import type { ResolvedShikiConfig } from "./config.js";
import { ensureLang } from "./highlighter.js";

/**
 * Magic Move (ADR-0011). A ` ```md magic-move ` fence wraps N inner code fences —
 * each an animation *step*. We tokenize every step at build time (keyed tokens, so
 * the renderer can FLIP matching tokens between steps), lz-string-compress the
 * payload, and emit a `<ShikiMagicMove>` island the client hydrates and drives off
 * the click model. Tokenization is theme-coupled: a theme change reruns this.
 */

export interface MagicMoveStepSource {
  lang: string;
  code: string;
}

/** Parse the inner fences of a magic-move block into ordered `{lang, code}` steps. */
export function parseMagicMoveSteps(value: string): MagicMoveStepSource[] {
  const lines = value.split("\n");
  const steps: MagicMoveStepSource[] = [];
  let fence: { lang: string; body: string[] } | null = null;
  let marker = "";
  for (const line of lines) {
    const open = line.match(/^(\s*)(`{3,}|~{3,})\s*([^\s`~]*)/);
    if (fence) {
      // Inside a fence: close on a matching-or-longer marker of the same char.
      if (
        open &&
        line.trim().startsWith(marker[0] ?? "`") &&
        line.trim().replace(/[^`~]/g, "").length >= marker.length &&
        line.trim().replace(/[`~]/g, "") === ""
      ) {
        steps.push({ lang: fence.lang || "text", code: fence.body.join("\n") });
        fence = null;
        marker = "";
      } else {
        fence.body.push(line);
      }
    } else if (open) {
      marker = open[2] ?? "```";
      fence = { lang: (open[3] ?? "").trim(), body: [] };
    }
  }
  if (fence) steps.push({ lang: fence.lang || "text", code: fence.body.join("\n") });
  return steps;
}

interface BuildContext {
  config: ResolvedShikiConfig;
  highlighter: Highlighter;
  /** Absolute click step this block's first *transition* lands on. */
  base?: number;
}

interface MagicMoveResult {
  /** Highest absolute click step the block consumes (base + steps - 1). */
  maxStep: number;
  /** The mdast/mdx replacement node (a `<ShikiMagicMove>` element). */
  node: Record<string, unknown>;
}

/** Tokenize the steps and build the `<ShikiMagicMove>` replacement node. */
export async function buildMagicMove(value: string, ctx: BuildContext): Promise<MagicMoveResult> {
  const steps = parseMagicMoveSteps(value);
  const base = ctx.base ?? 0;
  const sourceLang = steps[0]?.lang ?? "text";
  const loaded = await ensureLang(ctx.highlighter, sourceLang);
  const effectiveLang = loaded ? sourceLang : "text";

  // Shiki's bundled-lang union is narrower than our runtime string. Narrow to a
  // SpecialLanguage literal to satisfy the non-optional `lang` slot.
  const lang = effectiveLang as "text";
  const machine = createMagicMoveMachine((code) =>
    codeToKeyedTokens(ctx.highlighter, code, {
      lang,
      themes: ctx.config.themes,
      defaultColor: false,
    }),
  );
  const keyed = steps.map((s) => machine.commit(s.code).current);
  const compressed = compressToBase64(JSON.stringify(keyed));

  // N steps → N-1 transitions → clicks base+1 .. base+(N-1). Container carries the
  // last click so the runtime's DOM step-total picks it up.
  const transitions = Math.max(0, keyed.length - 1);
  const maxStep = base + transitions;

  const attributes: Array<{ type: string; name: string; value: string }> = [
    { type: "mdxJsxAttribute", name: "steps", value: compressed },
    { type: "mdxJsxAttribute", name: "count", value: String(keyed.length) },
    { type: "mdxJsxAttribute", name: "base", value: String(base) },
    { type: "mdxJsxAttribute", name: "lang", value: effectiveLang },
  ];

  return {
    maxStep,
    node: { type: "mdxJsxFlowElement", name: "ShikiMagicMove", attributes, children: [] },
  };
}
