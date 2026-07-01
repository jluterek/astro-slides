// @astro-slides/types — shared public types.
// Frontmatter types are inferred from Zod schemas (z.infer); AST types are plain
// structural types (they describe parser output, not validated user input).

export const TYPES_PACKAGE_VERSION = "0.0.0";

export * from "./ast.js";
export * from "./frontmatter.js";
export * from "./theme.js";
