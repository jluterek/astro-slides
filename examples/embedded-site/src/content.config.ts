import { defineCollection } from "astro:content";
import { deckCollectionSchema } from "@astro-slides/core";
import { glob } from "astro/loaders";

// Typed manifest of deck files. Rendering flows through the integration's virtual
// modules; this gives `getCollection("decks")` typed access to deck headmatter.
export const collections = {
  decks: defineCollection({
    loader: glob({ pattern: "slides.{md,mdx}", base: "." }),
    schema: deckCollectionSchema,
  }),
};
