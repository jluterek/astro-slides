---
title: Set up pnpm workspaces and package skeletons
phase: 01-foundation
status: pending
created: 2026-06-30
started:
ended:
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

(Fill in during work — corepack enable approach, catalog naming conventions, any deviations from Slidev's shape.)

## Outcome

_Fill in when status flips to `done`._
