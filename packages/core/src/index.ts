// @astro-slides/core — Astro integration + Vite plugins + slide pipeline.

export { deckCollectionSchema } from "./content.js";
export {
  deckNameFromFile,
  discoverDeckFiles,
  type LoadedDeck,
  loadAllDecks,
  loadDeck,
} from "./deck-loader.js";
export { type AstroSlidesOptions, astroSlides, astroSlides as default } from "./integration.js";
export { renderMarkdown } from "./render.js";
export {
  buildSlideRecords,
  configsModuleSource,
  layoutsModuleSource,
  type SlideRecord,
  slidesModuleSource,
  titlesModuleSource,
  VIRTUAL_IDS,
} from "./virtual.js";
export { astroSlidesVitePlugin, type VitePluginOptions } from "./vite-plugin.js";
