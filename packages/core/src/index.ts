// @astro-slides/core — Astro integration + Vite plugins + slide pipeline.

export * from "./code/index.js";
export { deckCollectionSchema } from "./content.js";
export {
  deckNameFromFile,
  discoverDeckFiles,
  type LoadedDeck,
  loadAllDecks,
  loadDeck,
} from "./deck-loader.js";
export { type AstroSlidesOptions, astroSlides, astroSlides as default } from "./integration.js";
export { emitSlideModules, type SlideModuleMeta, slideModulesDir } from "./mdx-emit.js";
export { remarkClicks } from "./remark-clicks.js";
export { renderMarkdown } from "./render.js";
export {
  configsModuleSource,
  layoutsModuleSource,
  slidesModuleSource,
  titlesModuleSource,
  VIRTUAL_IDS,
} from "./virtual.js";
export { astroSlidesVitePlugin, type VitePluginOptions } from "./vite-plugin.js";
