---
title: EditorConfig, Husky, and lint-staged
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
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

- **Husky v9** (not simple-git-hooks/lefthook) — the locked pick in
  `dependencies.md`. v9 hook files are plain commands (no v8 sourcing boilerplate).
  `prepare: husky` rebuilds `.husky/_/` on every `pnpm install`, so a fresh clone is
  protected automatically. `.husky/_/.gitignore` is `*`, so only `.husky/pre-commit`
  is committed; the generated wrappers are not.
- **lint-staged v15**, config inline in `package.json`. Glob
  `*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc}` → `biome check --no-errors-on-unmatched`.
- **Chose `biome check` WITHOUT `--write`** — a strict gate that *blocks* on any
  formatting/lint deviation rather than silently auto-fixing and re-staging the
  developer's content. This satisfies the "bad formatting is blocked" criterion
  literally and avoids surprise mutations to staged files. Devs fix with
  `pnpm check --write` / `pnpm format` then re-stage. (If the team later prefers
  auto-fix DX, switch the hook to `biome check --write`.)
- **typecheck/test deliberately NOT in pre-commit** — they're whole-graph and would
  blow the <5s budget. They run in CI (task 06). Pre-commit stays staged-files-only.
- **`.editorconfig`:** global 2-space/LF/trim/final-newline default (covers
  ts/tsx/js/jsx/json/yaml/yml/md/astro/vue), with `*.py` → 4-space and `Makefile` →
  tab exceptions. Matches `biome.json` (no conflict).

## Outcome

Commits are gated; editor behavior is pinned.

- Created `.editorconfig`, `.husky/pre-commit`; added `husky` + `lint-staged`
  (`catalog:dev`), `prepare: husky` script, and the `lint-staged` config block.
- Verified: staged a deliberately mis-formatted `.ts`, `git commit` was **blocked**
  (husky pre-commit exit 1) in ~1s — under the 5s budget. lint-staged reverted
  cleanly, leaving the tree untouched.
- Probe file removed; typecheck / lint / format:check / test all still green.
