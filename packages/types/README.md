# @astro-slides/types

Shared public TypeScript types for astro-slides.

Types are **inferred from Zod schemas** (`z.infer`) defined in the parser and MCP
server — this package re-exports them so consumers have a single import surface.
Do not hand-author parallel interfaces. JSON Schemas (frontmatter IntelliSense)
are generated from the same Zod source via `z.toJSONSchema()`.

Status: skeleton (Phase 01). Schemas land in Phase 02.
