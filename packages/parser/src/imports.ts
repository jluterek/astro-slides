import type { RawFrontmatter } from "@astro-slides/types";
import { mergeRawFrontmatter, parseYaml } from "./frontmatter.js";
import { resolveImport } from "./paths.js";
import { type RawSlide, splitSlides } from "./splitter.js";

/** A raw slide after `src:` imports are resolved and flattened. */
export interface ResolvedRawSlide {
  rawFm: RawFrontmatter;
  body: string;
  /** File this slide's content ultimately came from. */
  source: string;
}

export interface ExpandContext {
  filepath: string;
  root: string;
  maxDepth: number;
  /** Files currently on the import stack — for cycle detection. */
  stack: Set<string>;
}

function importerWithoutSrc(rawFm: RawFrontmatter): RawFrontmatter {
  const copy = { ...rawFm };
  delete copy.src;
  return copy;
}

export function expandImports(
  rawSlides: RawSlide[],
  ctx: ExpandContext,
  read: (path: string) => string,
  depth = 0,
): ResolvedRawSlide[] {
  const out: ResolvedRawSlide[] = [];
  for (const slide of rawSlides) {
    const rawFm = parseYaml(slide.frontmatterRaw);
    const src = rawFm.src;
    if (typeof src !== "string") {
      out.push({ rawFm, body: slide.body, source: ctx.filepath });
      continue;
    }
    if (depth >= ctx.maxDepth) {
      throw new Error(`src: import depth exceeded ${ctx.maxDepth} (possible cycle) at "${src}"`);
    }
    const path = resolveImport(src, ctx.filepath, ctx.root);
    if (ctx.stack.has(path)) {
      throw new Error(`Circular src: import detected: "${path}"`);
    }
    const children = splitSlides(read(path));
    ctx.stack.add(path);
    const resolved = expandImports(children, { ...ctx, filepath: path }, read, depth + 1);
    ctx.stack.delete(path);
    mergeImporterFrontmatter(resolved, importerWithoutSrc(rawFm));
    out.push(...resolved);
  }
  return out;
}

export async function expandImportsAsync(
  rawSlides: RawSlide[],
  ctx: ExpandContext,
  read: (path: string) => Promise<string>,
  depth = 0,
): Promise<ResolvedRawSlide[]> {
  const out: ResolvedRawSlide[] = [];
  for (const slide of rawSlides) {
    const rawFm = parseYaml(slide.frontmatterRaw);
    const src = rawFm.src;
    if (typeof src !== "string") {
      out.push({ rawFm, body: slide.body, source: ctx.filepath });
      continue;
    }
    if (depth >= ctx.maxDepth) {
      throw new Error(`src: import depth exceeded ${ctx.maxDepth} (possible cycle) at "${src}"`);
    }
    const path = resolveImport(src, ctx.filepath, ctx.root);
    if (ctx.stack.has(path)) {
      throw new Error(`Circular src: import detected: "${path}"`);
    }
    const children = splitSlides(await read(path));
    ctx.stack.add(path);
    const resolved = await expandImportsAsync(
      children,
      { ...ctx, filepath: path },
      read,
      depth + 1,
    );
    ctx.stack.delete(path);
    mergeImporterFrontmatter(resolved, importerWithoutSrc(rawFm));
    out.push(...resolved);
  }
  return out;
}

/** The importing slide's frontmatter overrides the first imported slide's. */
function mergeImporterFrontmatter(resolved: ResolvedRawSlide[], importerFm: RawFrontmatter): void {
  const first = resolved[0];
  if (first) first.rawFm = mergeRawFrontmatter(first.rawFm, importerFm);
}
