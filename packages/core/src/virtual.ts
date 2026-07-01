import type { LoadedDeck } from "./deck-loader.js";
import type { SlideModuleMeta } from "./mdx-emit.js";

/**
 * Virtual-module source generators. The slides module imports the per-slide emitted
 * `.mdx` files (see `mdx-emit.ts`) into a manifest whose `slots` are Astro/MDX
 * components and whose `totalClicks` is summed from each slot's compile-time export.
 */

/** Public virtual-module specifiers. */
export const VIRTUAL_IDS = {
  slides: "@astro-slides/slides",
  configs: "@astro-slides/configs",
  layouts: "@astro-slides/layouts",
  titles: "@astro-slides/titles",
} as const;

const json = (value: unknown): string => JSON.stringify(value);

/**
 * Generate the `@astro-slides/slides` module: static imports of each slide's slot
 * `.mdx` files + a manifest array. `slots` map slot name -> component; `totalClicks`
 * sums the `totalClicks` export the remark-clicks plugin injects into each slot
 * (namespace import so a missing export is simply 0, never an import error).
 */
export function slidesModuleSource(metas: SlideModuleMeta[]): string {
  const imports: string[] = [];
  const entries: string[] = [];

  metas.forEach((m, i) => {
    const slotPairs: string[] = [];
    const clickTerms: string[] = [];
    Object.entries(m.slotFiles).forEach(([slot, file], j) => {
      const comp = `S_${i}_${j}`;
      const ns = `N_${i}_${j}`;
      imports.push(`import ${comp}, * as ${ns} from ${json(file)};`);
      slotPairs.push(`${json(slot)}: ${comp}`);
      clickTerms.push(`(${ns}.totalClicks || 0)`);
    });
    const meta = {
      deck: m.deck,
      no: m.no,
      index: m.index,
      layout: m.layout,
      title: m.title,
      notes: m.notes,
      class: m.class,
      background: m.background,
      frontmatter: m.frontmatter,
    };
    // Frontmatter `clicks: N` is an authoritative override of the computed total
    // (the compile-time AST plan is preserved regardless — ADR-0008).
    const override = m.frontmatter.clicks;
    const total =
      typeof override === "number"
        ? String(override)
        : clickTerms.length > 0
          ? clickTerms.join(" + ")
          : "0";
    entries.push(
      `  { ...${json(meta)}, totalClicks: ${total}, slots: { ${slotPairs.join(", ")} } }`,
    );
  });

  return `${imports.join("\n")}\nexport const slides = [\n${entries.join(",\n")}\n];\nexport default slides;\n`;
}

export function configsModuleSource(decks: LoadedDeck[]): string {
  const configs = Object.fromEntries(decks.map((d) => [d.name, d.deck.headmatter]));
  const first = decks[0]?.deck.headmatter ?? {};
  return `export const configs = ${json(configs)};\nexport const deckConfig = ${json(first)};\nexport default configs;\n`;
}

export function titlesModuleSource(metas: SlideModuleMeta[]): string {
  const titles = metas.map((m) => ({ deck: m.deck, no: m.no, title: m.title }));
  return `export const titles = ${json(titles)};\nexport default titles;\n`;
}

/**
 * Emit the resolved layouts as a name -> component map. Each resolved `.astro`
 * file is statically imported (absolute path) so Astro compiles it; the route
 * indexes this map by a slide's `layout`. Var names are index-based because layout
 * names (`404`, `two-cols`) aren't valid identifiers.
 */
export function layoutsModuleSource(resolved: Record<string, string>): string {
  const entries = Object.entries(resolved);
  const imports = entries.map(([, path], i) => `import layout_${i} from ${json(path)};`).join("\n");
  const map = entries.map(([name], i) => `  ${json(name)}: layout_${i}`).join(",\n");
  return `${imports}\nexport const layouts = {\n${map}\n};\nexport default layouts;\n`;
}
