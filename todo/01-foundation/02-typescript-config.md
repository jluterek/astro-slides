---
title: Configure TypeScript strict mode with project references
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
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

- **TS version:** `typescript` pinned in the `dev` catalog (`^5.8.0`), installed as a
  root devDependency via `catalog:dev`. Resolved to 5.9.3.
- **`tsc -b --noEmit`:** confirmed accepted by TS 5.9.3 (the build-mode + `--noEmit`
  combination is supported in modern TS). Typecheck emits no `dist/` — verified.
  Also negative-tested: injected a type error, `tsc -b --noEmit` exited 1 and
  reported it, so the harness genuinely checks rather than no-opping.
- **Config split:** language/strictness options live in `tsconfig.base.json`;
  `composite: true` + `rootDir`/`outDir` live in each package's `tsconfig.json`
  (composite belongs on the leaf projects, not the solution file).
- **Root `tsconfig.json`** is solution-style (`files: []` + `references`), listing
  all six packages. It does **not** extend base.
- **No inter-package `references` yet** — no package imports another at skeleton
  stage. They get added when the first real cross-package import lands.
- **No path aliases.** Workspace symlinks + nodenext resolution will handle
  `@astro-slides/*` imports once packages have build outputs / `exports` maps.
- **`@types/node`** intentionally not wired into `lib`/`types` yet — placeholders
  need no Node types; added per-package when first needed.

## Outcome

Strict TypeScript baseline in place and passing.

- Created: `tsconfig.base.json`, root solution `tsconfig.json`, and a
  `tsconfig.json` in each of the six packages.
- Added root `typecheck` script (`tsc -b --noEmit`) and `typescript` devDependency
  (`catalog:dev`).
- Updated `packages/types/src/index.ts` to export a real placeholder
  (`TYPES_PACKAGE_VERSION`, `Placeholder`) so other packages have something to import.
- `pnpm typecheck` passes from clean (exit 0); verified it catches injected errors.
- Next: tasks 03 (Biome), 04 (Vitest), 05 (hooks) — now unblocked and mutually
  parallel.
