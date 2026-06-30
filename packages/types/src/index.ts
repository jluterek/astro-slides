// @astro-slides/types — shared public types.
// Types are inferred from Zod schemas (z.infer); do not hand-author parallel interfaces.
// Placeholder export until Phase 02 lands the first schemas — lets other packages
// import from this entry point today.
export const TYPES_PACKAGE_VERSION = "0.0.0";

/** Placeholder type, replaced by inferred schema types in Phase 02. */
export type Placeholder = Record<string, never>;
