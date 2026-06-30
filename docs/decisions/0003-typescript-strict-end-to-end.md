# 0003. TypeScript strict, end to end

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Languages and type stories in the reference field:

- **Vanilla JS** (reveal.js, impress.js, WebSlides, MDX Deck) — painful for refactors, lossy IntelliSense, hand-maintained `.d.ts` shims drift from implementation.
- **JS with JSDoc types** — middle-ground, but tooling support is uneven.
- **TypeScript loose** — types exist but `noImplicitAny: false`, `strict: false`. Common but most of the safety is left on the table.
- **TypeScript strict** (Slidev, Spectacle, PptxGenJS, Marp engine) — high upfront cost, large long-term gain. Types as source of truth.

Two further ideas are worth committing to up front:

1. The same TS types should drive **JSON Schemas for frontmatter** (so editors like VS Code give IntelliSense to authors).
2. The same TS types should drive **MCP tool definitions** (so the contract between the framework and AI clients stays in sync).

## Decision

TypeScript with:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- target: current LTS Node (Node 22 at time of writing)
- module: `nodenext` / `bundler` depending on package

Every package emits `.d.ts`. Public types live in a single shared package (`@astro-slides/types` or similar). Frontmatter JSON Schemas are generated from those types via `ts-json-schema-generator`. MCP tool definitions are generated from the same types.

## Consequences

- Refactors stay safe across the monorepo because types are load-bearing.
- Authors get rich IntelliSense in editors for frontmatter, layout props, and component APIs.
- The MCP tool contract never drifts from the runtime contract because they come from the same source.
- Trade-off: contributor onboarding requires TypeScript familiarity. We accept this — the audience for a developer-targeted slide framework already lives in TS.
- Trade-off: build time is non-trivial. Mitigated by `tsc --incremental`, project references, and turbo-cached builds.
