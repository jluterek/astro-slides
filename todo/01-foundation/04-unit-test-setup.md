---
title: Set up Vitest with a sample passing test
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
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

(Fill in during work — workspace mode vs single-config, jsdom vs node environment defaults, alias setup.)

## Outcome

_Fill in when status flips to `done`._
