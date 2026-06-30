---
title: EditorConfig, Husky, and lint-staged
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
---

## Goal

Lock in consistent editor behavior (`.editorconfig`) and gate commits so they can't include unformatted or unlinted code. Pre-commit runs format + lint on staged files only — fast enough that contributors don't bypass it.

## Acceptance criteria

- [ ] `.editorconfig` at repo root: 2-space indent for `*.{ts,tsx,js,jsx,json,yaml,yml,md,astro,vue}`, LF line endings, trim trailing whitespace, insert final newline. Exceptions: 4-space for `*.py` if any, tab for `Makefile`.
- [ ] Husky installed; `pre-commit` hook runs `lint-staged`.
- [ ] `lint-staged` configuration in root `package.json` (or `.lintstagedrc`) runs the lint/format tool against staged files.
- [ ] Pre-commit hook completes in under 5 seconds for typical commits.
- [ ] `pnpm prepare` installs the Husky hooks (so a fresh clone is protected after `pnpm install`).
- [ ] A test commit with intentionally bad formatting is blocked.

## Notes / decisions

(Fill in during work — Husky vs simple-git-hooks vs lefthook; whether to also run typecheck on commit, push, or only in CI.)

## Outcome

_Fill in when status flips to `done`._
