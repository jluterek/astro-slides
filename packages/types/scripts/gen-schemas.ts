/**
 * Generates the editor JSON Schema for deck frontmatter from the Zod schemas — the
 * single source of truth. Run via `pnpm gen:schemas`. Node strips the TS types natively
 * (Node 24+), so there's no build step.
 *
 * Output: packages/types/schemas/frontmatter.json (committed; referenced by the
 * package `exports` as `@astro-slides/types/schemas/frontmatter.json`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { FrontmatterSchema, HeadmatterSchema } from "../src/frontmatter.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "schemas");
const outFile = join(outDir, "frontmatter.json");

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "astro-slides frontmatter",
  description: "Generated from Zod schemas in @astro-slides/types. Do not edit by hand.",
  $defs: {
    headmatter: z.toJSONSchema(HeadmatterSchema),
    frontmatter: z.toJSONSchema(FrontmatterSchema),
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
