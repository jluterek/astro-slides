---
title: GitHub Actions CI pipeline
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
---

## Goal

Wire up a CI workflow that runs on every PR and on pushes to `main`. The pipeline catches anything pre-commit hooks miss (cross-platform issues, full-workspace typecheck, full test suite). Cache pnpm so installs are fast.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` defined with jobs:
  - **lint** — `pnpm lint` + `pnpm format:check`
  - **typecheck** — `pnpm typecheck`
  - **test** — `pnpm test` with coverage uploaded as an artifact
- [ ] Each job uses `actions/setup-node` with the version from `.nvmrc` and pnpm via Corepack or `pnpm/action-setup`.
- [ ] pnpm store cached via `actions/cache`.
- [ ] Workflow triggers on `pull_request` and `push` to `main`.
- [ ] Branch protection rules documented (in the task's outcome) so `main` requires green CI before merge.
- [ ] CI green on a no-op PR.

## Notes / decisions

(Fill in during work — matrix testing across Node versions if relevant, when to add OS matrix (probably only for export-pipeline phases later).)

## Outcome

_Fill in when status flips to `done`._
