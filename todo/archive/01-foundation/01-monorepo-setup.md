---
title: Set up pnpm workspaces and package skeletons
phase: 01-foundation
status: done
created: 2026-06-30
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Create the monorepo structure with pnpm workspaces and catalog versioning per ADR-0004. Empty packages with correct manifests are enough — actual code lands in later phases. The result is a workspace where `pnpm install` works and `pnpm -r exec pwd` lists every package.

## Acceptance criteria

- [ ] `pnpm-workspace.yaml` exists at repo root with `packages/*` glob and catalogs (`dev`, `frontend`, `prod`) declared. Mirror Slidev's catalog shape (see `docs/reference-applications/slidev.md`).
- [ ] Root `package.json` declares `private: true` and `packageManager: pnpm@<version>` (current stable pnpm 10+). No top-level runtime deps yet.
- [ ] **pnpm installation:** standalone install only — `curl -fsSL https://get.pnpm.io/install.sh | sh` or `npm i -g pnpm`. **Do not use Corepack** (removed in Node 25+). Document this in CONTRIBUTING.md (deferred to Phase 18).
- [ ] `.npmrc` enforces strict workspace behavior (`auto-install-peers=true`, `link-workspace-packages=true`, `prefer-workspace-packages=true`).
- [ ] `.nvmrc` pinned to current Node LTS.
- [ ] Package skeletons created under `packages/`, each with `package.json` (name `@astro-slides/<name>`, `private: false`, version `0.0.0`), a `src/` directory, and a `README.md`:
  - `cli` — the `astro-slides` command
  - `core` — Astro integration + Vite plugins + slide pipeline
  - `client` — runtime UI: layouts, click runtime, presenter
  - `parser` — MDX/MD → slide AST
  - `types` — shared TypeScript types
  - `mcp-server` — MCP tool surface
- [ ] `pnpm install` succeeds from a clean clone.
- [ ] `pnpm -r exec pwd` lists all six packages.

## Notes / decisions

- **Catalogs:** mirrored Slidev's `dev` / `frontend` / `prod` split. Seeded each
  with its most central locked pick (dev tooling; `astro`; `zod`) so the shape is
  real, not empty. Catalog entries are inert until a package references
  `catalog:<name>`, so seeding them does not pull anything on install — later
  phases add entries as they wire up tools.
- **Workspace globs:** included `themes/*` and `examples/*` alongside `packages/*`
  per `directory-conventions.md`. Those dirs don't exist yet; pnpm ignores
  empty globs without error.
- **`.nvmrc`:** pinned to major `24` (current Node LTS, and pre-25 so the Corepack
  removal doesn't bite). Avoids churn from patch-version pinning.
- **`packageManager`:** `pnpm@10.27.0` (installed version). pnpm offered an upgrade
  to 11.9.0 via Corepack — **declined**, Corepack is banned project-wide.
- **No `bin` on `@astro-slides/cli` yet:** declaring `astro-slides` now would point
  at a non-existent dist file. Deferred to the phase that builds the CLI entry.
- **CONTRIBUTING.md** (standalone-pnpm-install guidance) remains deferred to Phase 18
  per the task; not created here.

## Outcome

Monorepo scaffolded and installing cleanly.

- Created: `pnpm-workspace.yaml`, root `package.json`, `.npmrc`, `.nvmrc`,
  `pnpm-lock.yaml`, and six package skeletons under `packages/`
  (`cli`, `core`, `client`, `parser`, `types`, `mcp-server`) — each with a
  `package.json` (`@astro-slides/<name>`, `private: false`, `0.0.0`, `type: module`),
  a `src/index.ts` placeholder export, and a `README.md`.
- `pnpm install` succeeds from clean (7 projects = 6 packages + root).
- `pnpm -r exec pwd` lists all six packages.
- Next: task 02 (TypeScript config) — sequential dependency, packages now exist
  for `references`.
