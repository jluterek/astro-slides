import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";
import { visit } from "unist-util-visit";

/**
 * Snippet imports (ADR-0011). A paragraph that is just
 *
 *   <<< @/snippets/foo.ts#region {ts} {1,3}
 *
 * is replaced with a fenced `code` node loaded from disk, so remark-code then
 * highlights it like any inline fence. `@/` resolves from the project root; a
 * `#region` selects a named region (comment-delimited, several syntaxes). Referenced
 * files are reported via `onFile` so the integration can watch them for HMR.
 */

interface Node {
  type: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  children?: Node[];
}

/**
 * Reconstruct a paragraph's source line. MDX splits `<<< …#region {ts} {1,3}` into
 * text + `mdxTextExpression` nodes (the `{…}` are parsed as JS), so we can't rely on
 * a single text child — rebuild the literal, re-wrapping expressions in braces.
 */
function reconstructLine(node: Node): string | null {
  if (!node.children?.length) return null;
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.value ?? "";
    else if (child.type === "mdxTextExpression") out += `{${child.value ?? ""}}`;
    else if (child.type === "inlineCode") out += child.value ?? "";
    else return null; // links, emphasis, etc. → not a bare snippet line
  }
  return out;
}

export interface SnippetOptions {
  root: string;
  onFile?: (absPath: string) => void;
}

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".css": "css",
  ".html": "html",
  ".astro": "astro",
  ".vue": "vue",
  ".svelte": "svelte",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".sh": "bash",
  ".sql": "sql",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".md": "markdown",
  ".toml": "toml",
};

function langForFile(file: string): string {
  return EXT_LANG[extname(file).toLowerCase()] ?? "text";
}

/** Resolve `@/x` (root-relative), absolute, or root-relative bare paths. */
export function resolveSnippetPath(root: string, spec: string): string {
  if (spec.startsWith("@/")) return join(root, spec.slice(2));
  if (isAbsolute(spec)) return spec;
  return join(root, spec);
}

/**
 * Extract a named region. Matches `#region <name>` … `#endregion` in any comment
 * style (`//`, `/* *​/`, `#`, `<!-- -->`). Falls back to the whole file if absent.
 */
export function extractRegion(source: string, region: string | null): string {
  if (!region) return source.replace(/\n+$/, "");
  const lines = source.split("\n");
  const start = lines.findIndex((l) => new RegExp(`#region\\s+${escapeRe(region)}\\b`).test(l));
  if (start === -1) return source.replace(/\n+$/, "");
  let depth = 0;
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/#region\b/.test(line)) {
      depth++;
      out.push(line);
      continue;
    }
    if (/#endregion\b/.test(line)) {
      if (depth === 0) break;
      depth--;
      out.push(line);
      continue;
    }
    out.push(line);
  }
  return dedent(out).replace(/\n+$/, "");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove the common leading indentation from a block of lines. */
function dedent(lines: string[]): string {
  const indents = lines.filter((l) => l.trim() !== "").map((l) => l.match(/^\s*/)?.[0].length ?? 0);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

const SNIPPET_RE = /^<<<\s+(\S+?)(?:#([\w-]+))?(?:\s+(.*))?$/;

export function remarkSnippets(options: SnippetOptions) {
  return (tree: Node): void => {
    visit(tree as never, "paragraph", (node: Node) => {
      const line = reconstructLine(node);
      if (line == null || !line.trimStart().startsWith("<<<")) return;
      const m = line.trim().match(SNIPPET_RE);
      if (!m) return;

      const [, spec, region, rawMeta] = m;
      const abs = resolveSnippetPath(options.root, spec ?? "");
      let body = "";
      let lang = langForFile(abs);
      if (existsSync(abs)) {
        options.onFile?.(abs);
        body = extractRegion(readFileSync(abs, "utf8"), region ?? null);
      } else {
        body = `// snippet not found: ${spec}`;
        lang = "text";
      }

      // Meta may lead with a `{lang}` override, e.g. `<<< @/f.txt {ts} {1,3}`.
      let meta = (rawMeta ?? "").trim();
      const langOverride = meta.match(/^\{([\w-]+)\}\s*/);
      if (langOverride?.[1]) {
        lang = langOverride[1];
        meta = meta.slice(langOverride[0].length);
      }

      Object.assign(node, {
        type: "code",
        lang,
        meta: meta || null,
        value: body,
        children: undefined,
      });
    });
  };
}

export default remarkSnippets;
