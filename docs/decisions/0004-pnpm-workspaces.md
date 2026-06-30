# 0004. pnpm workspaces for the monorepo

- **Status:** accepted
- **Date:** 2026-06-30

## Context

The framework needs to ship as several coordinated packages: a CLI, a runtime client, the parser, the types, an MCP server, default theme(s), and potentially per-integration packages. Monorepo tooling considered:

- **pnpm workspaces** (Slidev, Spectacle) — fast installs, native workspace support, catalog versioning for shared deps, hard-link / symlink approach keeps `node_modules` slim.
- **Yarn workspaces** — solid but pnpm has the momentum and the catalog feature.
- **Lerna** (MDX Deck) — effectively in maintenance mode, replaced by Nx/Turborepo.
- **npm workspaces** — fine for trivial cases, missing the catalog and filter ergonomics.
- **Turborepo / Nx** — adds build orchestration on top of workspaces. Premature for a project this size; can layer on later if needed.

## Decision

pnpm workspaces with **catalog versioning** for cross-package dependencies. `pnpm-workspace.yaml` at the repo root declares both the workspace globs and the catalogs (`catalogs.dev`, `catalogs.frontend`, `catalogs.prod` — modeled on Slidev's setup).

Workspace layout (initial sketch — confirmed in phase 1):

```
packages/
  cli/         — the `astro-slides` command
  core/        — Astro integration + Vite plugins + slide pipeline
  client/      — runtime components: layouts, click model, presenter UI
  parser/      — MDX/MD → slide AST
  types/       — shared TypeScript types
  mcp-server/  — the MCP tool surface
  theme-default/
themes/
  cosmic/      — default theme as a folder (see ADR-0005)
docs/
todo/
```

Use `pnpm` exclusively. Lock it via `packageManager` field in root `package.json` and require Corepack.

## Consequences

- One install across the whole repo. Catalog-versioned dependencies (Astro, TypeScript, Vitest, Playwright, Shiki, etc.) stay in lockstep across packages — no drift.
- `pnpm --filter @astro-slides/cli build` enables targeted work without rebuilding the world.
- Catalogs make Astro / TS upgrades a single diff instead of a coordinated multi-package edit.
- Trade-off: contributors must use pnpm. Documented in `CLAUDE.md` and enforced via Corepack.
- Trade-off: if we later need build orchestration beyond `pnpm run -r`, we'll layer Turborepo on top. Not before.
