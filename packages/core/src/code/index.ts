// Code-rendering pipeline (Phase 08, ADR-0011): Shiki highlighting, line/click
// highlighting, snippet imports, Twoslash, and Magic Move — all at build time.

export {
  DEFAULT_LANGS,
  DEFAULT_THEMES,
  loadShikiSetup,
  type ResolvedShikiConfig,
  resolveShikiConfig,
  type ShikiSetup,
} from "./config.js";
export { ensureLang, getHighlighter, resetHighlighter } from "./highlighter.js";
export { buildMagicMove, type MagicMoveStepSource, parseMagicMoveSteps } from "./magic-move.js";
export {
  type CodeMeta,
  isMagicMoveMeta,
  type LineStep,
  parseCodeMeta,
  parseLineRanges,
} from "./meta.js";
export { type RemarkCodeOptions, remarkCode } from "./remark-code.js";
export {
  extractRegion,
  remarkSnippets,
  resolveSnippetPath,
  type SnippetOptions,
} from "./snippets.js";
export { clickLinesTransformer, highlightLinesTransformer } from "./transformers.js";
