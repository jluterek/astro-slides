// @astro-slides/parser — MDX/Markdown → slide AST.
//
// Phase 02 produces a structural AST from raw deck source: slide splitting, frontmatter
// (headmatter + per-slide), speaker notes, slot sugar, snippet imports, recursive `src:`
// slide imports, Marp directives, and feature/image detection. MDX→tree compilation and
// the file watcher are Phase 03 (the Astro/Vite glue).

// Re-export the shared AST + frontmatter types so consumers can import from one place.
export type {
  ClickStep,
  Deck,
  DeckSummary,
  DetectedFeatures,
  Frontmatter,
  Headmatter,
  RawFrontmatter,
  Slide,
  SlideSlots,
  SlideSummary,
} from "@astro-slides/types";
export { detectFeatures, extractImages, mergeFeatures } from "./features.js";
export {
  mergeRawFrontmatter,
  parseHeadmatter,
  parseSlideFrontmatter,
  parseYaml,
} from "./frontmatter.js";
export { revisionHash } from "./hash.js";
export { expandImports, expandImportsAsync, type ResolvedRawSlide } from "./imports.js";
export { extractMarpDirectives, extractMarpImages, type MarpImageResult } from "./marp.js";
export { extractNotes } from "./notes.js";
export type {
  AsyncFileSystem,
  AsyncParseOptions,
  ParseOptions,
  SyncFileSystem,
  SyncParseOptions,
} from "./parse.js";
export { parse, parseAsync } from "./parse.js";
export { dirname, langFromPath, normalizePath, resolveImport } from "./paths.js";
export { hasSlots, parseSlots } from "./slots.js";
export { extractRegion, inlineSnippets, inlineSnippetsAsync } from "./snippets.js";
// Lower-level building blocks, exposed for tooling, tests, and Phase 03 reuse.
export { advanceComment, type FrontmatterStyle, type RawSlide, splitSlides } from "./splitter.js";
export { slideTitle, summarizeDeck, summarizeSlide } from "./summary.js";
