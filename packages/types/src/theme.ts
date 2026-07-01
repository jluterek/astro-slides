import { z } from "zod";

/**
 * The 21 built-in layout names. Layout resolution (Phase 05) layers user/theme
 * `.astro` files over these; a slide's `layout` frontmatter selects one.
 */
export const BUILTIN_LAYOUTS = [
  "cover",
  "default",
  "center",
  "intro",
  "section",
  "quote",
  "fact",
  "statement",
  "two-cols",
  "two-cols-header",
  "image-left",
  "image-right",
  "image",
  "iframe",
  "iframe-left",
  "iframe-right",
  "end",
  "full",
  "none",
  "404",
  "error",
] as const;

export type BuiltinLayout = (typeof BUILTIN_LAYOUTS)[number];

/**
 * Theme manifest (`theme.config.json` in a theme folder). All fields optional —
 * a theme can be just a `theme.css`. Loose so themes can carry extra metadata.
 */
export const ThemeManifestSchema = z.looseObject({
  name: z.string().optional(),
  extends: z.string().optional(),
  /** CSS entrypoint relative to the theme folder. Defaults to `theme.css`. */
  style: z.string().default("theme.css"),
});

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;
