---
title: Configure TypeScript strict mode with project references
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
---

## Goal

Set up the shared TypeScript baseline mandated by ADR-0003. All packages extend a base config. Project references enable incremental compilation. Strict everywhere.

## Acceptance criteria

- [ ] `tsconfig.base.json` at repo root with:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `noImplicitOverride: true`
  - `exactOptionalPropertyTypes: true`
  - `target: ES2022`
  - `module: nodenext`
  - `moduleResolution: nodenext`
  - `verbatimModuleSyntax: true`
  - `isolatedModules: true`
  - `skipLibCheck: true`
  - `forceConsistentCasingInFileNames: true`
- [ ] Each package's `tsconfig.json` extends the base and adds its own `outDir`, `rootDir`, `composite: true`.
- [ ] Root `tsconfig.json` aggregates all packages via `references`.
- [ ] `pnpm typecheck` script defined at root that runs `tsc -b --noEmit` across the workspace.
- [ ] `pnpm typecheck` passes on a fresh clone.
- [ ] `packages/types/src/index.ts` exports a placeholder so other packages can import from it.

## Notes / decisions

(Fill in during work — TS version pinned in catalog, any per-package overrides, paths aliases if needed.)

## Outcome

_Fill in when status flips to `done`._
