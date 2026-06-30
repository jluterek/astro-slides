import { langFromPath, resolveImport } from "./paths.js";

/**
 * External snippet imports: `<<< @/file.ts#region {meta}` on its own line is replaced
 * by a fenced code block containing the (optionally region-sliced) file contents. The
 * language is inferred from the extension; trailing `{meta}` is forwarded to the fence
 * for downstream transformers (twoslash, line highlights, …).
 */
const SNIPPET = /^<<<\s+(\S+)(?:\s+(.*\S))?\s*$/;
const FENCE = /^(\s{0,3})(`{3,}|~{3,})/;
const FENCE_ONLY = /^\s*(`{3,}|~{3,})\s*$/;

export interface SnippetTarget {
  /** Resolved absolute-ish path to read. */
  path: string;
  region: string | null;
  meta: string | null;
  lang: string;
}

function parseSnippetLine(line: string, fromFile: string, root: string): SnippetTarget | null {
  const m = SNIPPET.exec(line);
  if (!m) return null;
  let token = m[1] as string;
  const meta = (m[2] as string | undefined) ?? null;
  let region: string | null = null;
  const hash = token.indexOf("#");
  if (hash >= 0) {
    region = token.slice(hash + 1);
    token = token.slice(0, hash);
  }
  return {
    path: resolveImport(token, fromFile, root),
    region,
    meta,
    lang: langFromPath(token),
  };
}

/** Slice a named `#region name … #endregion name` out of a source file. */
export function extractRegion(content: string, region: string): string {
  const lines = content.split("\n");
  const startRe = new RegExp(`#region\\s+${escapeRe(region)}(?:\\s|$)`);
  const endRe = new RegExp(`#endregion\\s+${escapeRe(region)}(?:\\s|$)`);
  const plainEnd = /#endregion(?:\s|$)/;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i] as string)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) {
    throw new Error(`Region "${region}" not found in snippet.`);
  }
  const collected: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] as string;
    if (endRe.test(line) || plainEnd.test(line)) break;
    collected.push(line);
  }
  return dedent(collected).join("\n");
}

function dedent(lines: string[]): string[] {
  let min = Infinity;
  for (const l of lines) {
    if (l.trim() === "") continue;
    const indent = l.length - l.trimStart().length;
    if (indent < min) min = indent;
  }
  if (!Number.isFinite(min) || min === 0) return lines;
  return lines.map((l) => (l.trim() === "" ? l : l.slice(min)));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFence(target: SnippetTarget, content: string): string {
  const code = target.region ? extractRegion(content, target.region) : content.replace(/\s+$/, "");
  const info = target.meta ? `${target.lang} ${target.meta}` : target.lang;
  return `\`\`\`${info}\n${code}\n\`\`\``;
}

function eachLineWithFenceState(
  body: string,
  onSnippet: (target: SnippetTarget) => string,
  fromFile: string,
  root: string,
): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    if (fence) {
      if (FENCE_ONLY.test(line) && line.trimStart().startsWith(fence)) fence = null;
      out.push(line);
      continue;
    }
    const f = FENCE.exec(line);
    if (f) {
      fence = (f[2] as string)[0] as string;
      out.push(line);
      continue;
    }
    const target = parseSnippetLine(line, fromFile, root);
    if (target) {
      out.push(onSnippet(target));
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

export function inlineSnippets(
  body: string,
  fromFile: string,
  root: string,
  read: (path: string) => string,
): string {
  return eachLineWithFenceState(
    body,
    (target) => buildFence(target, read(target.path)),
    fromFile,
    root,
  );
}

export async function inlineSnippetsAsync(
  body: string,
  fromFile: string,
  root: string,
  read: (path: string) => Promise<string>,
): Promise<string> {
  // Collect targets first (fence-aware), read concurrently, then stitch back.
  const lines = body.split("\n");
  const reads: Array<Promise<string> | null> = [];
  const targets: Array<SnippetTarget | null> = [];
  let fence: string | null = null;
  for (const line of lines) {
    if (fence) {
      if (FENCE_ONLY.test(line) && line.trimStart().startsWith(fence)) fence = null;
      targets.push(null);
      reads.push(null);
      continue;
    }
    const f = FENCE.exec(line);
    if (f) {
      fence = (f[2] as string)[0] as string;
      targets.push(null);
      reads.push(null);
      continue;
    }
    const target = parseSnippetLine(line, fromFile, root);
    targets.push(target);
    reads.push(target ? read(target.path) : null);
  }
  const contents = await Promise.all(reads.map((r) => r ?? Promise.resolve(null)));
  return lines
    .map((line, i) => {
      const target = targets[i];
      const content = contents[i];
      return target && content != null ? buildFence(target, content) : line;
    })
    .join("\n");
}
