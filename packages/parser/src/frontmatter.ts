import {
  type Frontmatter,
  FrontmatterSchema,
  type Headmatter,
  HeadmatterSchema,
  type RawFrontmatter,
} from "@astro-slides/types";
import { parse as parseYamlString } from "yaml";

/** Parse a raw YAML frontmatter string into a plain mapping. Empty → `{}`. */
export function parseYaml(raw: string | null): RawFrontmatter {
  if (raw === null || raw.trim() === "") return {};
  const parsed: unknown = parseYamlString(raw);
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Frontmatter must be a YAML mapping (key: value), not a scalar or list.");
  }
  return parsed as RawFrontmatter;
}

/** Validate + apply defaults for deck-level headmatter. */
export function parseHeadmatter(raw: RawFrontmatter): Headmatter {
  return HeadmatterSchema.parse(raw);
}

/** Validate + apply defaults for per-slide frontmatter. */
export function parseSlideFrontmatter(raw: RawFrontmatter): Frontmatter {
  return FrontmatterSchema.parse(raw);
}

/**
 * Merge raw frontmatter for `src:` imports: the importing slide's fields override the
 * imported slide's. Shallow by design — nested objects replace rather than deep-merge,
 * matching Slidev's override semantics.
 */
export function mergeRawFrontmatter(
  base: RawFrontmatter,
  override: RawFrontmatter,
): RawFrontmatter {
  return { ...base, ...override };
}
