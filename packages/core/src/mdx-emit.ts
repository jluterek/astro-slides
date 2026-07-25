import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { slideTitle } from "@astro-slides/parser";
import type { LoadedDeck } from "./deck-loader.js";

/**
 * Per-slide MDX emission. Each slide's slot sources are written to temp `.mdx`
 * files under `<root>/.astro-slides/slides/` so Astro's MDX pipeline compiles them (with
 * components + the remark-clicks plugin in scope). The generated `@astro-slides/slides`
 * module imports these files; the route renders the resulting components inside layouts.
 *
 * The emit dir MUST stay namespaced under `.astro-slides/` — `.astro-slides/drawings/`
 * (persisted annotations) and `engagement/` share the scratch root and must survive.
 *
 * Emission is BYTE-STABLE (issue #61): a file is written only when its content differs
 * from what's on disk, and strays are removed individually — never an rm-rf of the
 * tree. A steady-state re-parse therefore produces zero filesystem events, which is
 * load-bearing: the emitted `.mdx` files live inside the watched project root, and a
 * blanket rewrite made the dev watcher treat our own output as deck edits — an
 * infinite full-reload feedback loop (plus ENOTEMPTY races from concurrent rm-rf).
 */

const OUT_DIR = ".astro-slides";
const SLIDES_SUBDIR = "slides";

export interface SlideModuleMeta {
  deck: string;
  no: number;
  index: number;
  layout: string;
  title: string | null;
  notes: string | null;
  class: string | null;
  background: string | null;
  frontmatter: Record<string, unknown>;
  /** slot name -> absolute path of its emitted `.mdx` file. */
  slotFiles: Record<string, string>;
}

export function slideModulesDir(root: string): string {
  return join(root, OUT_DIR, SLIDES_SUBDIR);
}

/** Write a file only when its content differs — steady state touches nothing. */
function writeStable(file: string, content: string): void {
  if (existsSync(file)) {
    try {
      if (readFileSync(file, "utf8") === content) return;
    } catch {
      // Unreadable → fall through to the write.
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Remove files under `dir` that are not in `keep`, then any emptied deck folders. */
function removeStrays(dir: string, keep: Set<string>): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const child = join(dir, entry);
    if (statSync(child).isDirectory()) {
      removeStrays(child, keep);
      if (readdirSync(child).length === 0) rmdirSync(child);
    } else if (!keep.has(child)) {
      rmSync(child, { force: true });
    }
  }
}

/** Write every slide's slot sources to temp `.mdx` files; return the manifest. */
export function emitSlideModules(root: string, decks: LoadedDeck[]): SlideModuleMeta[] {
  const dir = slideModulesDir(root);
  const emitted = new Set<string>();

  const metas: SlideModuleMeta[] = [];
  for (const { name, deck } of decks) {
    for (const slide of deck.slides) {
      if (slide.frontmatter.hide) continue;
      const fm = slide.frontmatter as Record<string, unknown>;

      const slotFiles: Record<string, string> = {};
      for (const [slot, source] of Object.entries(slide.slots)) {
        // Always emit `default` (it anchors content layouts); skip empty named slots.
        if (slot !== "default" && source.trim() === "") continue;
        const file = join(dir, name, `${slide.no}.${slot}.mdx`);
        writeStable(file, source.endsWith("\n") ? source : `${source}\n`);
        emitted.add(file);
        slotFiles[slot] = file;
      }

      metas.push({
        deck: name,
        no: slide.no,
        index: slide.index,
        layout: slide.layout,
        title: slideTitle(slide),
        notes: slide.notes,
        class: typeof fm.class === "string" && fm.class ? fm.class : null,
        background: typeof fm.background === "string" ? fm.background : null,
        frontmatter: fm,
        slotFiles,
      });
    }
  }
  removeStrays(dir, emitted);
  return metas;
}
