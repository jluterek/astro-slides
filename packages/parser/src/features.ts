import { type DetectedFeatures, EMPTY_FEATURES } from "@astro-slides/types";

/**
 * Parse-time feature detection for build-time tree-shaking, plus image-usage
 * extraction for preloading. Heuristic but conservative — a false positive only costs
 * a loaded-but-unused feature module; a false negative would break a slide, so we err
 * toward detecting.
 */

const FENCE_INFO = /^(?:\s{0,3})(?:`{3,}|~{3,})\s*([^\n]*)$/gm;
const INLINE_MATH = /(?<![\\$])\$(?!\s)[^$\n]+?(?<!\s)\$(?!\$)/;
const BLOCK_MATH = /\$\$[\s\S]+?\$\$/;
const MD_IMAGE = /!\[[^\]]*\]\(\s*([^)\s]+)/g;
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;

export function detectFeatures(body: string): DetectedFeatures {
  const features: DetectedFeatures = { ...EMPTY_FEATURES };

  if (BLOCK_MATH.test(body) || INLINE_MATH.test(body)) features.katex = true;

  FENCE_INFO.lastIndex = 0;
  let m: RegExpExecArray | null = FENCE_INFO.exec(body);
  while (m !== null) {
    const info = (m[1] as string).toLowerCase();
    if (info.startsWith("mermaid")) features.mermaid = true;
    if (info.startsWith("plantuml") || info.startsWith("puml")) features.plantuml = true;
    if (/\bmonaco(-run|-write)?\b/.test(info) || info.includes("{monaco")) features.monaco = true;
    if (info.includes("twoslash")) features.twoslash = true;
    if (info.includes("magic-move")) features.magicMove = true;
    m = FENCE_INFO.exec(body);
  }

  return features;
}

/** Collect image sources referenced via Markdown `![](src)` and HTML `<img src>`. */
export function extractImages(body: string): string[] {
  const found = new Set<string>();
  for (const re of [MD_IMAGE, HTML_IMAGE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null = re.exec(body);
    while (m !== null) {
      found.add(m[1] as string);
      m = re.exec(body);
    }
  }
  return [...found];
}

/** Element-wise OR of two feature sets (for deck-wide aggregation). */
export function mergeFeatures(a: DetectedFeatures, b: DetectedFeatures): DetectedFeatures {
  return {
    katex: a.katex || b.katex,
    mermaid: a.mermaid || b.mermaid,
    plantuml: a.plantuml || b.plantuml,
    monaco: a.monaco || b.monaco,
    twoslash: a.twoslash || b.twoslash,
    magicMove: a.magicMove || b.magicMove,
  };
}
