---
title: Phase 01 — Foundation
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Stand up the monorepo, tooling, and CI so subsequent phases have a typed, tested, formatted, automatically-verified baseline to build on. Nothing user-facing ships in this phase; the deliverable is a clean development environment.

## Exit criteria

- [x] `pnpm install` from a fresh clone produces a working workspace.
- [x] All packages typecheck (`pnpm typecheck` runs `tsc -b --noEmit`).
- [x] All packages lint/format clean (`pnpm lint`, `pnpm format:check`).
- [x] A sample unit test runs (`pnpm test`).
- [x] Pre-commit hooks block unformatted / unlinted commits.
- [x] GitHub Actions runs lint + typecheck + test on PR and main. — verified green on `main` (run 28474099564); PR trigger configured identically.
- [x] `docs/built/01-foundation.md` summarizes the conventions chosen.

## Locked decisions

- **Package manager:** `pnpm` v10+ workspaces with catalog versioning. Pin via `packageManager` field in root `package.json`. **No Corepack** — Node 25 removes it; we use standalone install.
- **Lint + format:** `Biome` (single tool). If a specific TS rule we want is missing, add ESLint as a supplement, not a replacement.
- **Git hooks:** `Husky` v9 + `lint-staged` v15.
- **Build per package:** `tsup` (zero-config dual ESM/CJS + `.d.ts`).
- **Test runner:** `Vitest` (workspace mode for monorepo discovery).
- **TS config baseline:** strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, target ES2022, module `nodenext`. Composite projects via `references`.
- **Package skeletons:** `cli`, `core`, `client`, `parser`, `types`, `mcp-server` under `packages/`.
- **CI:** GitHub Actions, three jobs (lint, typecheck, test). pnpm store cached.

See `docs/architecture/dependencies.md` for the full library matrix.

## Tasks

- [x] [`01-monorepo-setup.md`](./01-monorepo-setup.md) — pnpm workspaces, root config, package skeletons
- [x] [`02-typescript-config.md`](./02-typescript-config.md) — strict tsconfig base + project references
- [x] [`03-linting-and-formatting.md`](./03-linting-and-formatting.md) — Biome
- [x] [`04-unit-test-setup.md`](./04-unit-test-setup.md) — Vitest, sample test
- [x] [`05-editor-config-and-git-hooks.md`](./05-editor-config-and-git-hooks.md) — EditorConfig, Husky, lint-staged
- [x] [`06-ci-pipeline.md`](./06-ci-pipeline.md) — GitHub Actions

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| 01 (monorepo) → 02 (TS config) | sequential — TS config depends on package skeletons |
| After 02 | **03 (Biome), 04 (Vitest), 05 (hooks)** all parallel — no inter-task dependency |
| After 03, 04, 05 | 06 (CI) — depends on all green to be testable |

Practical agent allocation: one agent does 01 → 02 sequentially. Then spawn three parallel agents for 03/04/05. Then one for 06.

## Dependencies

None. This is the foundation.

## Risks

- **pnpm installation guidance shift.** Corepack was removed in Node 25+. Document the `pnpm install -g pnpm` or `curl -fsSL https://get.pnpm.io/install.sh | sh` path in CONTRIBUTING.md (Phase 18).
- **Biome gaps.** If we discover Biome doesn't cover a TypeScript rule we want (e.g., `no-floating-promises`), don't replace it — supplement with ESLint for that rule only.
- **tsup d.ts emit edge cases.** esbuild's d.ts generator can fail on exotic generics. Fall back to `rollup-plugin-dts` per affected package.

## Notes

E2E test setup (Playwright) is deferred to Phase 04 when there's a runtime to drive. The Playwright Claude Code plugin is already installed at the project scope via `.claude/settings.json` — Phase 04 just adds the Playwright config and a sample test.

## Outcome

All six tasks `done` (2026-06-30). The workspace is typed, linted, tested, and
commit-gated end to end.

**Built:** pnpm workspace (6 package skeletons + `dev`/`frontend`/`prod` catalogs) ·
strict `tsconfig.base.json` + project references (`pnpm typecheck` = `tsc -b
--noEmit`) · Biome 2.5 lint+format · Vitest 3.2 with v8 coverage and a passing
sample test · `.editorconfig` + Husky v9 + lint-staged pre-commit gate · GitHub
Actions `ci.yml` (lint / typecheck / test jobs).

**Verified locally:** `pnpm install` (frozen-lockfile too), `typecheck`, `lint`,
`format:check`, `test`/`test:coverage` all green; pre-commit blocks a bad commit in
~1s; typecheck proven to catch real errors.

**Closed.** Foundation committed (`3140f48`) and pushed to
`github.com/jluterek/astro-slides`; CI verified green on `main` (run 28474099564).
Distilled to [`docs/built/01-foundation.md`](../../docs/built/01-foundation.md); folder
archived; `ROADMAP.md` flipped to done. Next: Phase 02 (parser).
