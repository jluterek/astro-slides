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
  drawings: "@astro-slides/drawings",
  engagement: "@astro-slides/engagement",
  runtimeConfig: "@astro-slides/runtime-config",
} as const;

const json = (value: unknown): string => JSON.stringify(value);

/**
 * Emit runtime config the deck script reads at boot (Phase 11). `syncGateway` is the
 * WebSocket path when the dev server is running with `--remote`, else null — so a static
 * build never advertises a gateway and the runtime stays BroadcastChannel-only.
 */
export function runtimeConfigModuleSource(syncGateway: string | null, routePrefix = ""): string {
  return `export const syncGateway = ${json(syncGateway)};\nexport const routePrefix = ${json(routePrefix)};\nexport default { syncGateway, routePrefix };\n`;
}

/**
 * Emit the persisted-drawings manifest (Phase 11): `{ <deck>: { "<no>:<step>": svg } }`.
 * The deck route seeds these into the runtime's initial shared state so annotations
 * survive a reload. Read fresh (not cached) so a persisted stroke shows after reload.
 */
export function drawingsModuleSource(map: Record<string, Record<string, string>>): string {
  return `export const drawings = ${json(map)};\nexport default drawings;\n`;
}

/**
 * Emit the persisted-engagement manifest (Phase 19): `{ <deck>: { polls, questions } }`.
 * The deck route seeds these into the runtime's initial shared state so poll results
 * and questions survive a refresh (like drawings).
 */
export function engagementModuleSource(map: Record<string, unknown>): string {
  return `export const engagement = ${json(map)};\nexport default engagement;\n`;
}

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
    // Slots compile as separate MDX files, so each slot's clicks number independently
    // from 1 — the slide total is the MAX across slots (slots step in parallel), not the
    // sum, which would leave dead trailing steps.
    const override = m.frontmatter.clicks;
    const total =
      typeof override === "number"
        ? String(override)
        : clickTerms.length > 0
          ? `Math.max(${clickTerms.join(", ")})`
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
  // Per-deck detected-feature union (Phase 09) — the route uses this to conditionally
  // include KaTeX CSS / mark diagram usage, so unused feature assets stay out.
  const features = Object.fromEntries(decks.map((d) => [d.name, d.deck.features]));
  return (
    `export const configs = ${json(configs)};\n` +
    `export const deckConfig = ${json(first)};\n` +
    `export const features = ${json(features)};\n` +
    `export default configs;\n`
  );
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
