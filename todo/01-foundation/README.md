---
title: Phase 01 — Foundation
status: active
started: 2026-06-30
ended:
---

## Goal

Stand up the monorepo, tooling, and CI so subsequent phases have a typed, tested, formatted, automatically-verified baseline to build on. Nothing user-facing ships in this phase; the deliverable is a clean development environment.

## Exit criteria

- [ ] `pnpm install` from a fresh clone produces a working workspace.
- [ ] All packages typecheck (`pnpm -r typecheck` or `pnpm typecheck`).
- [ ] All packages lint/format clean (`pnpm lint`, `pnpm format:check`).
- [ ] A sample unit test runs (`pnpm test`).
- [ ] Pre-commit hooks block unformatted / unlinted commits.
- [ ] GitHub Actions runs lint + typecheck + test on PR and main.
- [ ] `docs/built/01-foundation.md` summarizes the conventions chosen.

## Tasks

- [ ] [`01-monorepo-setup.md`](./01-monorepo-setup.md) — pnpm workspaces, root config, package skeletons
- [ ] [`02-typescript-config.md`](./02-typescript-config.md) — strict tsconfig base + project references
- [ ] [`03-linting-and-formatting.md`](./03-linting-and-formatting.md) — Biome (or ESLint + Prettier)
- [ ] [`04-unit-test-setup.md`](./04-unit-test-setup.md) — Vitest config, sample test
- [ ] [`05-editor-config-and-git-hooks.md`](./05-editor-config-and-git-hooks.md) — EditorConfig, Husky, lint-staged
- [ ] [`06-ci-pipeline.md`](./06-ci-pipeline.md) — GitHub Actions workflow

## Dependencies

None. This is the foundation.

## Notes

Operationalizes ADR-0003 (TS strict) and ADR-0004 (pnpm workspaces). The package boundaries sketched in ADR-0004 are materialized here as empty packages with correct manifests.

Decision points expected during execution (capture as ADRs if they have lasting consequences):
- **Biome vs ESLint + Prettier.** Biome is one tool, fast, modern; ESLint has deeper TS rules and more plugins. Default to Biome unless we hit a specific gap.
- **Project references vs flat tsconfig.** Project references enable incremental builds but add ceremony. Worth it for a multi-package monorepo.
- **Husky vs simple-git-hooks vs lefthook.** Husky is the default; simple-git-hooks is lighter. Use Husky unless install footprint becomes an issue.

E2E test setup (Playwright) is deferred to Phase 04 when there's a runtime to drive.

## Outcome

_Fill in when the phase closes._
