import { parse as parseYamlString } from "yaml";

/**
 * Slide splitter. Breaks raw deck source into per-slide chunks, separating each slide's
 * leading frontmatter from its body.
 *
 * The hard part is that `---` is overloaded: between slides it is a separator, and the
 * SAME `---` line also opens the next slide's frontmatter block (closed by a second
 * `---`). We disambiguate structurally + semantically: at a slide boundary, a `---`
 * opens frontmatter only if the lines up to the next `---` parse as a YAML *mapping*
 * (so a body that merely starts with `# Heading` is never mistaken for frontmatter).
 * Splitting is aware of fenced code blocks and HTML comments, so a `---` inside
 * ``` ``` ``` or `<!-- -->` never splits.
 */

export type FrontmatterStyle = "yaml" | "block";

export interface RawSlide {
  /** YAML text of the slide's frontmatter, or null if it has none. */
  frontmatterRaw: string | null;
  frontmatterStyle: FrontmatterStyle | null;
  /** Slide body (Markdown/MDX), frontmatter removed, trailing note still attached. */
  body: string;
  /** 0-based line in the source where this slide begins. */
  startLine: number;
}

const SEPARATOR = /^---[ \t]*$/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const FENCE_ONLY = /^\s*(`{3,}|~{3,})\s*$/;
const BLOCK_FM_OPEN = /^```(?:ya?ml)\s*$/;

function isSeparator(line: string): boolean {
  return SEPARATOR.test(line);
}

interface FenceInfo {
  ch: string;
  len: number;
}

function fenceInfo(line: string): FenceInfo | null {
  const m = FENCE.exec(line);
  if (!m) return null;
  const run = m[1] as string;
  return { ch: run[0] as string, len: run.length };
}

/** True if `block` parses as a non-null YAML mapping (i.e. is plausibly frontmatter). */
function isYamlMapping(block: string): boolean {
  if (block.trim() === "") return true; // empty frontmatter `---\n---`
  let parsed: unknown;
  try {
    parsed = parseYamlString(block);
  } catch {
    return false;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
}

/** Advance HTML-comment open/close state across one line; returns state at line end. */
export function advanceComment(line: string, inComment: boolean): boolean {
  let idx = 0;
  let state = inComment;
  while (idx < line.length) {
    if (state) {
      const close = line.indexOf("-->", idx);
      if (close === -1) return true;
      state = false;
      idx = close + 3;
    } else {
      const open = line.indexOf("<!--", idx);
      if (open === -1) break;
      state = true;
      idx = open + 4;
    }
  }
  return state;
}

/**
 * If a body begins (after blank lines) with a ` ```yaml ` fenced block, pull it out as
 * block-style frontmatter. Returns the YAML and the remaining body, or null.
 */
function extractBlockFrontmatter(body: string): { yaml: string; rest: string } | null {
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i] as string).trim() === "") i++;
  if (i >= lines.length || !BLOCK_FM_OPEN.test(lines[i] as string)) return null;
  i++;
  const yamlLines: string[] = [];
  while (i < lines.length && !FENCE_ONLY.test(lines[i] as string)) {
    yamlLines.push(lines[i] as string);
    i++;
  }
  if (i >= lines.length) return null; // unterminated fence — not frontmatter
  return { yaml: yamlLines.join("\n"), rest: lines.slice(i + 1).join("\n") };
}

export function splitSlides(source: string): RawSlide[] {
  const lines = source.split(/\r?\n/);
  const n = lines.length;
  const slides: RawSlide[] = [];
  let i = 0;

  while (i < n) {
    const startLine = i;
    let frontmatterRaw: string | null = null;
    let frontmatterStyle: FrontmatterStyle | null = null;

    // At a slide boundary a `---` opens frontmatter iff the block up to the next `---`
    // is a YAML mapping; otherwise the `---` is just a separator we step over.
    if (isSeparator(lines[i] as string)) {
      let j = i + 1;
      while (j < n && !isSeparator(lines[j] as string)) j++;
      const block = j < n ? lines.slice(i + 1, j).join("\n") : null;
      if (block !== null && isYamlMapping(block)) {
        frontmatterRaw = block;
        frontmatterStyle = "yaml";
        i = j + 1;
      } else {
        i += 1; // plain separator
      }
    }

    // Body: until the next separator (left unconsumed so it can open the next slide's
    // frontmatter), skipping fenced code and HTML comments.
    const contentLines: string[] = [];
    let fence: FenceInfo | null = null;
    let inComment = false;
    while (i < n) {
      const line = lines[i] as string;
      if (fence) {
        const f = fenceInfo(line);
        if (f && f.ch === fence.ch && f.len >= fence.len && FENCE_ONLY.test(line)) fence = null;
        contentLines.push(line);
        i++;
        continue;
      }
      const f = fenceInfo(line);
      if (f) {
        fence = f;
        contentLines.push(line);
        i++;
        continue;
      }
      if (!inComment && isSeparator(line)) break; // do NOT consume — next slide starts here
      inComment = advanceComment(line, inComment);
      contentLines.push(line);
      i++;
    }

    let body = contentLines.join("\n");

    if (frontmatterRaw === null) {
      const block = extractBlockFrontmatter(body);
      if (block) {
        frontmatterRaw = block.yaml;
        frontmatterStyle = "block";
        body = block.rest;
      }
    }

    // Drop slides that are pure separator artifacts (no frontmatter, blank body).
    if (frontmatterRaw === null && body.trim() === "") continue;

    slides.push({ frontmatterRaw, frontmatterStyle, body, startLine });
  }

  return slides;
}
