import { HeadmatterSchema } from "@astro-slides/types";

/**
 * Zod schema for a deck's headmatter, for users who want a typed Astro content
 * collection over their deck files:
 *
 * ```ts
 * // src/content.config.ts
 * import { defineCollection } from "astro:content";
 * import { glob } from "astro/loaders";
 * import { deckCollectionSchema } from "@astro-slides/core";
 *
 * export const collections = {
 *   decks: defineCollection({
 *     loader: glob({ pattern: "**\/slides.{md,mdx}", base: "./content/decks" }),
 *     schema: deckCollectionSchema,
 *   }),
 * };
 * ```
 *
 * The collection is a typed manifest of deck files; rendering still flows through the
 * integration's virtual modules. Authored in Zod v4 (our single source of truth).
 */
export const deckCollectionSchema = HeadmatterSchema;
