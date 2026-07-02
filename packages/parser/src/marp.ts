import type { RawFrontmatter } from "@astro-slides/types";

/**
 * Marp-style HTML-comment directives → frontmatter. A comment is treated as directives
 * only when *every* non-empty inner line is a `key: value` pair — that's what separates
 * a directive comment from a prose speaker-note comment, so notes are never eaten.
 *
 * Leading `_` (spot directives, e.g. `_class`) means "this slide only"; we strip the
 * underscore and apply to the current slide's frontmatter. A few keys are mapped onto
 * our schema (`backgroundColor` → `background`); the rest pass through (loose schema).
 */
const COMMENT = /<!--([\s\S]*?)-->/g;
// Keys must start lowercase: Marp directives are lowerCamelCase (`theme`, `paginate`,
// `backgroundColor`…), and requiring it keeps prose notes like "Remember: pause here"
// from being eaten as directives.
const DIRECTIVE_LINE = /^[ \t]*(_?)([a-z][\w-]*)[ \t]*:[ \t]*(.*)$/;

const KEY_MAP: Record<string, string> = {
  backgroundColor: "background",
  backgroundImage: "background",
};

function parseDirectiveComment(inner: string): RawFrontmatter | null {
  const lines = inner.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const out: RawFrontmatter = {};
  for (const line of lines) {
    const m = DIRECTIVE_LINE.exec(line);
    if (!m) return null; // any non-directive line disqualifies the whole comment
    const rawKey = m[2] as string;
    const value = (m[3] as string).trim();
    const key = KEY_MAP[rawKey] ?? rawKey;
    out[key] = coerce(value);
  }
  return out;
}

function coerce(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

/**
 * Marp image shorthand (Phase 15). Two forms are translated:
 *
 *  - **Background images** — `![bg](url)`, `![bg cover](url)`, `![bg contain](url)`,
 *    `![bg fit](url)` set the slide background and are removed from the body. Marp's split
 *    backgrounds (`bg left`/`bg right`) and filters (`blur`, `brightness:…`) collapse to a
 *    plain background (documented gap). The first `bg` image wins.
 *  - **Sized images** — `![w:200 h:120](url)` / `![w:200](url)` become an inline
 *    `<img src width height>` so the dimensions survive (Markdown alt can't carry them).
 */
// `bg` must be the whole first word (`![bg]`, `![bg cover]`) — an alt that merely
// *starts* with "bg" (`![bg-hero]`) is a normal image. Global: split backgrounds
// produce several `bg` images; all are stripped, the first sets `background`.
const BG_IMAGE = /!\[bg(\s[^\]]*)?\]\(\s*([^)\s]+)[^)]*\)/g;
const SIZED_IMAGE = /!\[([^\]]*?)\]\(\s*([^)\s]+)[^)]*\)/g;
const SIZE_TOKEN = /\b([wh]):(\d+(?:px)?)\b/g;

export interface MarpImageResult {
  body: string;
  frontmatter: RawFrontmatter;
}

export function extractMarpImages(body: string): MarpImageResult {
  const frontmatter: RawFrontmatter = {};
  let out = body;

  // Background images → `background` frontmatter (first one wins); ALL `bg` images are
  // stripped from the body — a second (split-background) one must not render as text.
  BG_IMAGE.lastIndex = 0;
  const bg = BG_IMAGE.exec(out);
  if (bg) {
    frontmatter.background = (bg[2] as string).trim();
    BG_IMAGE.lastIndex = 0;
    out = out.replace(BG_IMAGE, "").replace(/^[ \t]*\n/gm, (m, off) => (off === 0 ? "" : m));
  }

  // Sized images → `<img>` with width/height attributes.
  out = out.replace(SIZED_IMAGE, (whole, alt: string, url: string) => {
    SIZE_TOKEN.lastIndex = 0;
    const dims: Record<string, string> = {};
    let cleanAlt = alt;
    let sm: RegExpExecArray | null = SIZE_TOKEN.exec(alt);
    while (sm !== null) {
      const dim = sm[1] === "w" ? "width" : "height";
      dims[dim] = (sm[2] as string).replace("px", "");
      cleanAlt = cleanAlt.replace(sm[0], "");
      sm = SIZE_TOKEN.exec(alt);
    }
    if (!dims.width && !dims.height) return whole; // no size tokens — leave untouched
    const attrs = [`src="${url.trim()}"`, `alt="${cleanAlt.trim()}"`];
    if (dims.width) attrs.push(`width="${dims.width}"`);
    if (dims.height) attrs.push(`height="${dims.height}"`);
    return `<img ${attrs.join(" ")} />`;
  });

  return { body: out, frontmatter };
}

export function extractMarpDirectives(body: string): {
  body: string;
  directives: RawFrontmatter;
} {
  const directives: RawFrontmatter = {};
  const removed: Array<[number, number]> = [];

  COMMENT.lastIndex = 0;
  let m: RegExpExecArray | null = COMMENT.exec(body);
  while (m !== null) {
    const parsed = parseDirectiveComment(m[1] as string);
    if (parsed) {
      Object.assign(directives, parsed);
      removed.push([m.index, m.index + m[0].length]);
    }
    m = COMMENT.exec(body);
  }

  if (removed.length === 0) return { body, directives };

  // Splice out directive comments back-to-front to keep indices valid.
  let out = body;
  for (let i = removed.length - 1; i >= 0; i--) {
    const [start, end] = removed[i] as [number, number];
    out = out.slice(0, start) + out.slice(end);
  }
  return { body: out.replace(/\n{3,}/g, "\n\n").trim(), directives };
}
