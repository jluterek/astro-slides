import { parse, splitSlides } from "@astro-slides/parser";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * Text-level deck writer. The parser has no AST→source serializer (and building one that
 * round-trips MDX faithfully is out of scope), so writes operate on raw slide *blocks*.
 *
 * `splitSlides` gives each slide's `startLine`; slicing the source between consecutive
 * start lines yields verbatim blocks whose `join("\n")` reconstructs the file exactly — so
 * untouched slides keep their formatting byte-for-byte. Only the block being added/updated
 * is (re)serialized. Every mutation is reparse-verified against an expected slide count so a
 * malformed edit throws instead of corrupting the deck.
 *
 * Blocks are parsed WITHOUT a filesystem, so `src:` imports are not expanded — edits target
 * the literal slides in this file, and block index ↔ slide number stay 1:1.
 */

/** Slice a deck source into verbatim per-slide blocks (block[k] = lines[startₖ, startₖ₊₁)). */
export function toBlocks(source: string): string[] {
  const raw = splitSlides(source);
  if (raw.length === 0) return source.trim() === "" ? [] : [source];
  // Split on "\n" ONLY, leaving any "\r" attached to its line: rejoining with "\n" then
  // reconstructs a CRLF file byte-for-byte, so untouched slides stay byte-identical.
  // (splitSlides' startLine indexes are the same either way — every "\r\n" has one "\n".)
  const lines = source.split("\n");
  const blocks: string[] = [];
  for (let k = 0; k < raw.length; k++) {
    const start = raw[k]?.startLine ?? 0;
    const end = k + 1 < raw.length ? (raw[k + 1]?.startLine ?? lines.length) : lines.length;
    blocks.push(lines.slice(start, end).join("\n"));
  }
  return blocks;
}

export function fromBlocks(blocks: string[]): string {
  return blocks.join("\n");
}

/** Re-emit a freshly-serialized block with the source file's line endings — an LF-only
 * block spliced into a CRLF deck leaves the file with mixed endings and noisy diffs. */
function crlfMatch(source: string, block: string): string {
  return source.includes("\r\n") ? block.replace(/(?<!\r)\n/g, "\r\n") : block;
}

/** Count the literal (unexpanded) slides in a source. */
export function slideCount(source: string): number {
  return toBlocks(source).length;
}

/** Serialize a fresh slide block from content + optional frontmatter (yaml style). */
export function makeBlock(content: string, frontmatter?: Record<string, unknown>): string {
  const body = content.trim();
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    const yaml = stringifyYaml(frontmatter).trimEnd();
    return `---\n${yaml}\n---\n\n${body}\n`;
  }
  return `${body}\n`;
}

/** Parse a single block's leading frontmatter into `{ frontmatter, body }`. Delegates to
 * the parser's `splitSlides`, which is fence- and comment-aware and vets the candidate
 * region as a YAML *mapping* — a naive `---…---` regex would slice code-fence content
 * containing `---` lines out of the body. */
export function splitBlock(block: string): { frontmatter: Record<string, unknown>; body: string } {
  const [raw] = splitSlides(block);
  if (!raw) return { frontmatter: {}, body: "" };
  let fm: Record<string, unknown> = {};
  if (raw.frontmatterRaw != null) {
    try {
      const parsed = parseYaml(raw.frontmatterRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        fm = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed frontmatter — keep it out rather than corrupting the block.
    }
  }
  return { frontmatter: fm, body: raw.body.trim() };
}

/** Reparse the result and assert the literal slide count matches, or throw. */
function verify(source: string, expected: number): string {
  // A full parse validates structure; the block count guards against separator corruption.
  parse(source);
  const got = slideCount(source);
  if (got !== expected) {
    throw new Error(`Edit would corrupt deck structure (expected ${expected} slides, got ${got}).`);
  }
  return source;
}

function assertSlideExists(count: number, no: number): void {
  if (no < 1 || no > count) {
    throw new Error(`Slide ${no} is out of range (deck has ${count} slides).`);
  }
}

export interface AddSlideInput {
  content: string;
  frontmatter?: Record<string, unknown>;
  /** 1-based position to insert BEFORE; omitted/beyond end appends. */
  at?: number;
}

/** Insert a new slide, returning the new source and the new slide's 1-based number. */
export function addSlide(source: string, input: AddSlideInput): { source: string; no: number } {
  const blocks = toBlocks(source);
  const count = blocks.length;
  const idx = input.at == null ? count : Math.max(0, Math.min(input.at - 1, count));
  let block = makeBlock(input.content, input.frontmatter);
  // Every block after the first must open with a `---` boundary; makeBlock only emits one
  // when it has frontmatter, so prepend a separator for a plain body inserted after slide 1.
  if (idx > 0 && !block.startsWith("---")) block = `---\n\n${block}`;
  blocks.splice(idx, 0, crlfMatch(source, block));
  const next = fromBlocks(blocks);
  return { source: verify(next, count + 1), no: idx + 1 };
}

export interface UpdateSlideInput {
  content?: string;
  /** Merged into the slide's existing frontmatter (shallow). */
  frontmatter?: Record<string, unknown>;
}

/** Replace a slide's body and/or merge frontmatter (1-based). A key merged with an
 * explicit `null` value is REMOVED — the only way to unset e.g. `layout` over MCP. */
export function updateSlide(source: string, no: number, input: UpdateSlideInput): string {
  const blocks = toBlocks(source);
  assertSlideExists(blocks.length, no);
  const current = splitBlock(blocks[no - 1] ?? "");
  const body = input.content ?? current.body;
  let frontmatter = current.frontmatter;
  if (input.frontmatter) {
    frontmatter = { ...current.frontmatter, ...input.frontmatter };
    for (const [k, v] of Object.entries(input.frontmatter)) if (v === null) delete frontmatter[k];
  }
  let block = makeBlock(body, frontmatter);
  if (no > 1 && !block.startsWith("---")) block = `---\n\n${block}`;
  blocks[no - 1] = crlfMatch(source, block);
  return verify(fromBlocks(blocks), blocks.length);
}

/** Delete a slide (1-based). */
export function deleteSlide(source: string, no: number): string {
  const blocks = toBlocks(source);
  assertSlideExists(blocks.length, no);
  blocks.splice(no - 1, 1);
  if (blocks.length === 0) return verify("", 0);
  // If we removed the first slide, the new head block may open with a stray boundary.
  if (no === 1) {
    const head = splitBlock(blocks[0] ?? "");
    blocks[0] = makeBlock(head.body, head.frontmatter);
  }
  return verify(fromBlocks(blocks), blocks.length);
}

/** Merge frontmatter into a slide (1-based) or, when `no` is omitted, the deck headmatter. */
export function setFrontmatter(
  source: string,
  frontmatter: Record<string, unknown>,
  no?: number,
): string {
  // Headmatter is slide 1's frontmatter block (the parser reads it as both).
  return updateSlide(source, no ?? 1, { frontmatter });
}
