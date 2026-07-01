import type { Highlighter, ShikiTransformer } from "shiki";
import { visit } from "unist-util-visit";
import { loadShikiSetup, type ResolvedShikiConfig, resolveShikiConfig } from "./config.js";
import { ensureLang, getHighlighter } from "./highlighter.js";
import { buildMagicMove } from "./magic-move.js";
import { isMagicMoveMeta, parseCodeMeta } from "./meta.js";
import { clickLinesTransformer, highlightLinesTransformer } from "./transformers.js";

/**
 * remark-code — build-time syntax highlighting (ADR-0011). Walks `code` nodes,
 * tokenizes each with Shiki (dual Dark+/Light+ themes), applies line-highlight and
 * per-click line transformers, and replaces the node with a `<CodeBlock html=…>`
 * element that renders the pre-tokenized HTML (`set:html`). Magic Move fences
 * (` ```md magic-move `) are delegated to `buildMagicMove`.
 *
 * Runs *after* remark-clicks so click-stepped code lines number after prose clicks:
 * it reads the injected `export const totalClicks` and bumps it by the code steps.
 */

interface Node {
  type: string;
  name?: string | null;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
  children?: Node[];
  data?: Record<string, unknown>;
}

export interface RemarkCodeOptions {
  /** Project root — used to lazily load `setup/shiki.ts` on first render. */
  root: string;
  /** Enable the Twoslash transformer for `twoslash` fences (needs a TS project). */
  twoslash?: boolean;
  /** Test seam: supply a pre-resolved config + highlighter, skipping the setup load. */
  config?: Promise<ResolvedShikiConfig> | ResolvedShikiConfig;
  highlighter?: Promise<Highlighter> | Highlighter;
}

/**
 * Lazily resolve (config, highlighter) once per root and cache. Deferred to first
 * render — not the integration's `config:setup` — because the setup loader's dynamic
 * imports need the build-phase module runner, which is torn down after config load.
 */
const pipelineCache = new Map<string, Promise<{ config: ResolvedShikiConfig; hl: Highlighter }>>();
function getPipeline(
  options: RemarkCodeOptions,
): Promise<{ config: ResolvedShikiConfig; hl: Highlighter }> {
  if (options.config && options.highlighter) {
    return Promise.all([options.config, options.highlighter]).then(([config, hl]) => ({
      config,
      hl,
    }));
  }
  const cached = pipelineCache.get(options.root);
  if (cached) return cached;
  const promise = loadShikiSetup(options.root)
    .then(resolveShikiConfig)
    .then(async (config) => ({ config, hl: await getHighlighter(config) }));
  pipelineCache.set(options.root, promise);
  return promise;
}

function strAttr(name: string, value: string) {
  return { type: "mdxJsxAttribute", name, value };
}

/** Replace a node in place: strip its own keys, then copy the replacement's. */
function replaceNode(node: Node, replacement: Record<string, unknown>): void {
  const target = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, replacement);
}

/** Find the `export const totalClicks = N` esm node remark-clicks injected. */
function findTotalClicks(tree: Node): { node: Node; value: number } | null {
  for (const child of tree.children ?? []) {
    if (child.type === "mdxjsEsm" && /export const totalClicks/.test(child.value ?? "")) {
      const m = (child.value ?? "").match(/totalClicks\s*=\s*(\d+)/);
      return { node: child, value: m ? Number(m[1]) : 0 };
    }
  }
  return null;
}

function setTotalClicks(entry: { node: Node; value: number }, total: number): void {
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

export function remarkCode(options: RemarkCodeOptions) {
  return async (tree: Node): Promise<void> => {
    const codeNodes: Node[] = [];
    visit(tree as never, "code", (node: Node) => {
      codeNodes.push(node);
    });
    if (codeNodes.length === 0) return;

    const { config, hl } = await getPipeline(options);

    const totalEntry = findTotalClicks(tree);
    let clickBase = totalEntry?.value ?? 0;

    let twoslashTransformer: ShikiTransformer | null = null;

    for (const node of codeNodes) {
      const lang = (node.lang ?? "text").trim() || "text";
      const meta = node.meta ?? "";

      if (isMagicMoveMeta(meta)) {
        const { node: replacement, maxStep } = await buildMagicMove(node.value ?? "", {
          config,
          highlighter: hl,
          base: clickBase,
        });
        clickBase = Math.max(clickBase, maxStep);
        replaceNode(node, replacement);
        continue;
      }

      const parsed = parseCodeMeta(meta);
      const loaded = await ensureLang(hl, lang);
      const effectiveLang = loaded ? lang : "text";

      const transformers: ShikiTransformer[] = [];
      if (parsed.clickSteps && parsed.clickSteps.length > 0) {
        const { transformer, maxStep } = clickLinesTransformer(parsed.clickSteps, clickBase);
        transformers.push(transformer);
        clickBase = Math.max(clickBase, maxStep);
      } else if (parsed.highlightLines.length > 0) {
        transformers.push(highlightLinesTransformer(parsed.highlightLines));
      }
      if (parsed.twoslash && options.twoslash) {
        twoslashTransformer ??= await createTwoslash();
        if (twoslashTransformer) transformers.push(twoslashTransformer);
      }
      transformers.push(...config.transformers);

      const html = hl.codeToHtml(node.value ?? "", {
        lang: effectiveLang,
        themes: config.themes,
        // `false` emits only `--shiki-light`/`--shiki-dark` CSS vars (no inline color),
        // so the deck's color scheme switches themes via CSS without `!important`.
        defaultColor: false,
        transformers,
      });

      const attributes = [strAttr("html", html), strAttr("lang", effectiveLang)];
      if (parsed.title) attributes.push(strAttr("title", parsed.title));
      if (parsed.lineNumbers) attributes.push(strAttr("lineNumbers", "true"));
      if (parsed.maxHeight) attributes.push(strAttr("maxHeight", parsed.maxHeight));

      replaceNode(node, {
        type: "mdxJsxFlowElement",
        name: "CodeBlock",
        attributes,
        children: [],
      });
    }

    if (totalEntry && clickBase > totalEntry.value) setTotalClicks(totalEntry, clickBase);
  };
}

/** Lazily create the Twoslash transformer; returns null if the toolchain is missing. */
async function createTwoslash(): Promise<ShikiTransformer | null> {
  try {
    const { transformerTwoslash } = await import("@shikijs/twoslash");
    return transformerTwoslash({ explicitTrigger: false });
  } catch {
    return null;
  }
}

export default remarkCode;
