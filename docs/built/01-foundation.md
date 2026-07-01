---
phase: 01-foundation
status: distilled
distilled: 2026-06-30
---

# Phase 01 — Foundation

The monorepo, tooling, and CI baseline. Nothing user-facing — the deliverable is a
typed, tested, linted, commit-gated development environment that every later phase
builds on. The archived task files at `todo/archive/01-foundation/` hold the details;
this is the working summary.

## What shipped

- **pnpm workspace** (`pnpm-workspace.yaml`) — globs `packages/*`, `themes/*`,
  `examples/*`; catalog versioning split into `dev` / `frontend` / `prod` (Slidev's
  shape). `.npmrc` pins strict workspace behavior; `.nvmrc` pins Node 24.
- **Six package skeletons** under `packages/` — `cli`, `core`, `client`, `parser`,
  `types`, `mcp-server`. Each: `@astro-slides/<name>`, `private:false`, `0.0.0`,
  `type:module`, a `src/index.ts` placeholder, a README. `types` exports a real
  placeholder (`TYPES_PACKAGE_VERSION`, `Placeholder`) so others can import it.
- **Strict TypeScript** — `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, nodenext, ES2022). Per-package
  `composite` configs; solution-style root `tsconfig.json` with `references`.
- **Biome 2.5** — `biome.json`, lint + format in one tool.
- **Vitest 3.2** — single root `vitest.config.ts`, v8 coverage, one passing sample test.
- **Commit gate** — `.editorconfig`, Husky v9 (`prepare: husky`), lint-staged.
- **CI** — `.github/workflows/ci.yml`: `lint` / `typecheck` / `test` jobs.

Root scripts: `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `check`,
`test`, `test:watch`, `test:coverage`, `prepare`.

## Why

Give phases 02–18 a baseline they don't have to re-litigate: one package manager, one
lint/format tool, one test runner, strict types end-to-end, and CI that catches
regressions. See the archived phase `README.md` § *Goal*.

## How to navigate the result

- `pnpm-workspace.yaml` — workspace globs + dependency catalogs (add new shared deps here).
- `tsconfig.base.json` — the strict baseline every package extends; root `tsconfig.json` is the build graph.
- `biome.json` — lint/format rules. `vitest.config.ts` — test discovery (`packages/*/src/**/*.test.ts`).
- `.husky/pre-commit` → `lint-staged` config in `package.json` — the commit gate.
- `.github/workflows/ci.yml` — the three CI jobs.
- Canonical references: `docs/architecture/dependencies.md` (library matrix),
  `docs/architecture/directory-conventions.md` (layout).

## Key decisions

Executed pre-existing ADRs (0003 TS-strict, 0004 pnpm); no new ADRs. Load-bearing
choices made during the phase, each recorded in its archived task file:

- **Catalogs seeded, not empty** — entries are inert until referenced, so seeding is safe.
- **`tsc -b` for typecheck** — originally `tsc -b --noEmit`; changed in Phase 02 when the
  first cross-package reference made `--noEmit` illegal (referenced composite projects
  must emit). Output lands in gitignored `dist/`. Negative-tested.
- **Pre-commit uses `biome check` (no `--write`)** — a strict *gate* that blocks rather
  than silently auto-fixing staged files. Switch to `--write` if auto-fix DX is preferred.
- **No Corepack anywhere** — banned (Node 25 removal); pnpm via standalone install and
  `pnpm/action-setup` in CI. Declined pnpm's in-tool Corepack upgrade prompt.
- **Single root Vitest config**, not workspace projects — one glob covers all packages.

## What surprised us

- **`git check-ignore` lies about non-existent paths.** Trailing-slash patterns
  (`dist/`, `node_modules/`) report "not ignored" until the directory actually exists.
  Verified empirically that nested `dist/`/`node_modules/` *are* ignored once created —
  no build output will leak.
- **Pushing workflow files needs the `workflow` OAuth scope.** The first `git push` was
  rejected for `.github/workflows/ci.yml`; `gh`'s token lacked `workflow`. SSH bypasses
  the scope but no key was loaded in-env, so the fix was `gh auth refresh -s workflow`.
- **GitHub Actions Node 20 deprecation warning.** The originally-pinned `@v4` actions
  shipped a Node 20 runtime and warned. **Resolved** post-close by bumping to the Node
  24 majors (checkout v7, setup-node v6, upload-artifact v7, pnpm/action-setup v6) —
  CI re-verified green (run 28482121318), warning gone.
- **esbuild's postinstall build script is blocked by pnpm's default** — Vitest runs fine
  anyway, so it was left unapproved.

## Loose ends

- **CONTRIBUTING.md** (standalone-pnpm-install guidance) — deferred to Phase 18 per the task.
- **`@astro-slides/cli` `bin`** — not declared until there's a built entry to point at.
- **No inter-package `references` / `exports` maps yet** — added when the first real
  cross-package import lands (Phase 02+ / first `tsup` build).
- **Branch protection** — documented in the archived task 06 outcome; apply in repo
  Settings (require the three checks before merge).
- **jsdom / `test.projects`** — deferred until the client package needs a DOM environment.

## Stats

44 files in the foundation commit (`3140f48`). 6 packages. CI green on `main`
(Lint & format / Typecheck / Test). Local suite green: install (frozen), typecheck,
lint, format:check, test/coverage. Pre-commit blocks a bad commit in ~1s.

---

**Workflow:** Created at phase close, immediately before `todo/01-foundation/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
