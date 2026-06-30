import { z } from "zod";

/**
 * Frontmatter schemas — the single source of truth.
 *
 * TS types are inferred from these via `z.infer`, and the editor JSON Schema is
 * generated from them via `z.toJSONSchema()` (see `scripts/gen-schemas.ts`). Do not
 * hand-author parallel interfaces.
 *
 * Objects are `looseObject` so that (a) layout-specific fields (e.g. `leftClass` on
 * `two-cols`) and (b) Marp/Slidev fields we don't model explicitly pass through
 * instead of being stripped — matching ADR-0002's "render existing decks unchanged".
 */

/** A slide/deck transition: either a named preset or a configured object. */
export const TransitionSchema = z.union([
  z.string(),
  z.looseObject({
    name: z.string(),
    duration: z.number().optional(),
    easing: z.string().optional(),
  }),
]);

export const FontOptionsSchema = z.looseObject({
  sans: z.union([z.string(), z.array(z.string())]).optional(),
  serif: z.union([z.string(), z.array(z.string())]).optional(),
  mono: z.union([z.string(), z.array(z.string())]).optional(),
  weights: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
  italic: z.boolean().optional(),
  provider: z.string().optional(),
  local: z.union([z.string(), z.array(z.string())]).optional(),
});

export const SeoMetaSchema = z.looseObject({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterCard: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
});

export const DrawingsOptionsSchema = z.looseObject({
  persist: z.boolean().default(false),
  presenterOnly: z.boolean().optional(),
  syncAll: z.boolean().optional(),
});

const DevProdFalse = z.union([z.enum(["dev", "prod"]), z.literal(false)]);

/**
 * Headmatter — the first frontmatter block. Holds deck-wide config. (The same block
 * also doubles as the first slide's frontmatter; the parser runs it through both
 * schemas.)
 */
export const HeadmatterSchema = z.looseObject({
  title: z.string().default(""),
  theme: z.string().default("starter"),
  class: z.string().default(""),
  aspectRatio: z.string().default("16:9"),
  canvasWidth: z.number().default(1920),
  colorSchema: z.enum(["auto", "light", "dark", "all"]).default("auto"),
  transition: TransitionSchema.default("fade"),
  fonts: FontOptionsSchema.optional(),
  seoMeta: SeoMetaSchema.optional(),
  drawings: DrawingsOptionsSchema.default({ persist: false }),
  record: DevProdFalse.default(false),
  presenter: z.boolean().default(true),
  routerMode: z.enum(["history", "hash"]).default("history"),
  duration: z.string().optional(),
  addons: z.array(z.string()).default([]),
  mdc: z.boolean().default(false),
  monaco: DevProdFalse.default(false),
  /** Marp compatibility: selects the Marp-flavor parsing path (Phase 15). */
  marp: z.boolean().optional(),
});

/** Per-slide frontmatter. Overrides inherited deck config for one slide. */
export const FrontmatterSchema = z.looseObject({
  layout: z.string().optional(),
  class: z.string().optional(),
  transition: TransitionSchema.optional(),
  /** Author override of the parse-time-computed total click count. */
  clicks: z.number().int().nonnegative().optional(),
  clicksStart: z.number().int().nonnegative().default(0),
  level: z.number().int().optional(),
  hide: z.boolean().default(false),
  hideInToc: z.boolean().default(false),
  /** Import another markdown/MDX file as this slide's source. */
  src: z.string().optional(),
  routeAlias: z.string().optional(),
  zoom: z.number().positive().default(1),
  preload: z.boolean().default(false),
  exportAs: z.enum(["editable", "image"]).default("editable"),
  background: z.string().optional(),
  /** Persisted positions for `<VDrag>` elements, keyed by element id. */
  dragPos: z.record(z.string(), z.string()).optional(),
  clickAnimation: z.string().optional(),
});

export type Transition = z.infer<typeof TransitionSchema>;
export type FontOptions = z.infer<typeof FontOptionsSchema>;
export type SeoMeta = z.infer<typeof SeoMetaSchema>;
export type DrawingsOptions = z.infer<typeof DrawingsOptionsSchema>;
export type Headmatter = z.infer<typeof HeadmatterSchema>;
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/** Raw (pre-validation) frontmatter — an arbitrary YAML mapping. */
export type RawFrontmatter = Record<string, unknown>;
