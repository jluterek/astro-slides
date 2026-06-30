---
title: Set up Vitest with a sample passing test
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Install and configure Vitest for unit tests at the workspace level. A single passing test in one package proves the configuration. The aim is fast, watch-friendly testing with workspace-aware discovery.

## Acceptance criteria

- [ ] Vitest installed at the catalog version.
- [ ] `vitest.config.ts` (or workspace config) at repo root that picks up `**/*.test.ts` from every package.
- [ ] `pnpm test` (one shot) and `pnpm test:watch` scripts defined.
- [ ] A trivial sample test exists in `packages/types/src/__tests__/placeholder.test.ts` (or similar) and passes.
- [ ] Coverage opt-in via `pnpm test:coverage` using `@vitest/coverage-v8`.
- [ ] Vitest config integrates with TypeScript paths if any are used.
- [ ] No package adds its own duplicate Vitest config unless it has unique needs.

## Notes / decisions

- **Vitest 3.2.6** + **`@vitest/coverage-v8`** (both `catalog:dev`, `^3.0.0`).
- **Single root config** (`vitest.config.ts`), not `test.projects`/workspace mode.
  One glob — `packages/*/src/**/*.test.ts` — discovers every package's tests. No
  per-package config (the criterion explicitly wants no duplicates). When the
  client package needs jsdom, it gets added as a `test.projects` entry then, not now.
- **Environment:** `node` default. jsdom deferred until there's DOM code to test.
- **Test import path:** sample test imports `../index.js` (not `../index`) — nodenext
  + `verbatimModuleSyntax` require the `.js` extension on relative ESM imports, and
  it resolves to the `.ts` source under both tsc and Vite.
- **Test files are typechecked:** they live under `src/`, so `tsc -b` includes them.
  Confirmed `pnpm typecheck` stays green with the test present.
- **Coverage:** v8 provider, reporters text/html/lcov, excludes test files and dist.
  `coverage/` is already gitignored. esbuild's postinstall build script was ignored
  by pnpm (security default) — Vitest still runs fine, so left it unapproved.
- **Scripts:** `test` = `vitest run` (one-shot, CI-safe), `test:watch` = `vitest`,
  `test:coverage` = `vitest run --coverage`.

## Outcome

Vitest configured workspace-wide with a passing sample test.

- Created `vitest.config.ts` and `packages/types/src/__tests__/placeholder.test.ts`.
- Added `vitest` + `@vitest/coverage-v8` (`catalog:dev`); scripts `test`,
  `test:watch`, `test:coverage`.
- `pnpm test` → 1 passed. `pnpm test:coverage` → green (types/index.ts 100%).
- typecheck / lint / format:check all still pass with the test file in place.
