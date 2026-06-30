---
title: Set up linting and formatting (Biome or ESLint + Prettier)
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
---

## Goal

Configure Biome as the lint and format tool. **Decision locked** in Phase 01 README — Biome covers both, fast, modern, sufficient for our coding style. If a specific TS rule we want is missing, add ESLint as a supplement (not a replacement).

## Acceptance criteria

- [ ] Tool installed via the dev catalog.
- [ ] Configuration file at repo root (`biome.json` or `.eslintrc` + `.prettierrc`).
- [ ] Rules tuned for the strictness aligned with ADR-0003 (no `any`, prefer named exports for non-component modules, consistent imports).
- [ ] `pnpm lint` and `pnpm format` (and `format:check`) scripts defined.
- [ ] `pnpm lint` and `pnpm format:check` pass on a fresh clone.
- [ ] A short note in the task's *Outcome* explains the choice and any non-default rules.
- [ ] If we pick ESLint + Prettier and the decision is non-obvious, an ADR captures it.

## Notes / decisions

(Fill in during work. Biome may not yet cover every TypeScript rule we want — check `no-explicit-any`, `consistent-type-imports`, `no-floating-promises`.)

## Outcome

_Fill in when status flips to `done`._
