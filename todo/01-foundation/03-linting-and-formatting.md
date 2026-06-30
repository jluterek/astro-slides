---
title: Set up linting and formatting (Biome or ESLint + Prettier)
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
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

- **Biome 2.5.1** (from `dev` catalog, `^2.0.0`). Single tool for lint + format, no
  ESLint/Prettier — decision was already locked in the phase README.
- **Config:** `biome.json` at root. `vcs.useIgnoreFile: true` so Biome respects
  `.gitignore` (node_modules, dist, reference-applications all excluded). Formatter:
  2-space, lineWidth 100, double quotes, semicolons always, trailing commas all.
  Assist `organizeImports: on`.
- **Rules:** `preset: "recommended"` plus explicit `noExplicitAny: error`,
  `useImportType: error` (pairs with `verbatimModuleSyntax`), `useConst: error`.
- **Used `biome migrate`** to move `rules.recommended: true` → `rules.preset:
  "recommended"` (the old field is deprecated in 2.5, removed next major).
- **Known Biome gaps (accepted, per ADR-0003 supplement clause):**
  - `no-floating-promises` — needs type info; Biome is type-unaware, so it can't.
    Revisit with a narrow ESLint supplement (typed-lint) if floating promises bite.
  - `consistent-type-imports` → covered by `useImportType`.
  - `no-explicit-any` → covered by `noExplicitAny: error`.
- **`noDefaultExport` deliberately NOT enabled** — Astro/Vue components and config
  files legitimately need default exports. Enforce "named exports for non-component
  modules" via path-scoped `overrides` once component dirs exist, not globally now.

## Outcome

Biome configured as the sole lint+format tool, clean across the workspace.

- Created `biome.json`; added `@biomejs/biome` (`catalog:dev`).
- Scripts: `lint`, `lint:fix`, `format`, `format:check`, `check`.
- `pnpm lint` and `pnpm format:check` both pass on clean (24 files, exit 0).
- No ADR needed — Biome was the locked choice; this just executes it.
