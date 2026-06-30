---
title: GitHub Actions CI pipeline
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Wire up a CI workflow that runs on every PR and on pushes to `main`. The pipeline catches anything pre-commit hooks miss (cross-platform issues, full-workspace typecheck, full test suite). Cache pnpm so installs are fast.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` defined with jobs:
  - **lint** — `pnpm lint` + `pnpm format:check`
  - **typecheck** — `pnpm typecheck`
  - **test** — `pnpm test` with coverage uploaded as an artifact
- [ ] Each job uses `actions/setup-node` with the version from `.nvmrc` and pnpm via `pnpm/action-setup` (**not** Corepack — removed in Node 25+, banned project-wide).
- [ ] pnpm store cached via `actions/cache`.
- [ ] Workflow triggers on `pull_request` and `push` to `main`.
- [ ] Branch protection rules documented (in the task's outcome) so `main` requires green CI before merge.
- [ ] CI green on a no-op PR.

## Notes / decisions

- **`.github/workflows/ci.yml`** with three independent jobs — `lint` (`pnpm lint`
  + `pnpm format:check`), `typecheck` (`pnpm typecheck`), `test` (`pnpm test:coverage`
  + coverage uploaded via `actions/upload-artifact@v4`).
- **pnpm via `pnpm/action-setup@v4`, NOT Corepack** (banned project-wide). Version is
  read from the root `packageManager` field, so no duplication. `pnpm/action-setup`
  runs *before* `actions/setup-node@v4` so the latter's `cache: pnpm` can find pnpm.
- **Node from `.nvmrc`** via `node-version-file: .nvmrc` — single source of truth.
- **pnpm store caching** handled by `setup-node`'s built-in `cache: pnpm` (which uses
  `actions/cache` internally) — the modern idiom; no hand-rolled cache step needed.
- **`--frozen-lockfile`** on install for reproducibility; verified locally it passes
  (lockfile is in sync with the manifests).
- **No matrix** (single Node, single OS) — deliberate. An OS matrix is only worth it
  for the export-pipeline phases (Playwright/PDF/PPTX), so defer it to those.
- **`concurrency`** cancels superseded runs on the same ref; `permissions: contents:
  read` keeps the token least-privilege.

## Outcome

CI workflow authored and validated as far as is possible without a remote.

- Created `.github/workflows/ci.yml` (3 jobs: lint, typecheck, test+coverage).
- YAML validated (parses cleanly); `pnpm install --frozen-lockfile` succeeds locally,
  so CI's install step will match.
- **Not yet verified on GitHub:** "CI green on a no-op PR" — there is **no git remote
  configured** on this repo, so the workflow has never executed on Actions. First push
  to a GitHub remote will exercise it; expect green given all four scripts pass locally.
- **Branch protection (to apply once the repo is on GitHub):** protect `main` →
  require PRs, require status checks `Lint & format`, `Typecheck`, `Test` to pass
  before merge, require branches up to date. Set in GitHub repo Settings → Branches
  (or via `gh api`). Documented here because it lives in repo settings, not the tree.
