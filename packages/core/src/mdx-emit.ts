import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { slideTitle } from "@astro-slides/parser";
import type { LoadedDeck } from "./deck-loader.js";

/**
 * Per-slide MDX emission. Each slide's slot sources are written to temp `.mdx`
 * files under `<root>/.astro-slides/` so Astro's MDX pipeline compiles them (with
 * components + the remark-clicks plugin in scope). The generated `@astro-slides/slides`
 * module imports these files; the route renders the resulting components inside layouts.
 */

const OUT_DIR = ".astro-slides";

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
  return join(root, OUT_DIR);
}

/** Write every slide's slot sources to temp `.mdx` files; return the manifest. */
export function emitSlideModules(root: string, decks: LoadedDeck[]): SlideModuleMeta[] {
  const dir = slideModulesDir(root);
  rmSync(dir, { recursive: true, force: true });

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
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, source.endsWith("\n") ? source : `${source}\n`);
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
  return metas;
}
