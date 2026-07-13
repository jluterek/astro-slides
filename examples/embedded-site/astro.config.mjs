import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

// Embedding shape (issues #39/#40/#41): the host site owns "/" and its own pages;
// decks live under /slides/<deck>; React is scoped to astro-slides' own islands.
export default defineConfig({
  integrations: [astroSlides({ prefix: "/slides", scopedReact: true })],
});
