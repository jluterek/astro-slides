# Contributing to astro-slides

Thanks for your interest in astro-slides. This document covers local setup, the workflow, and
the conventions the project holds itself to.

## Setup

astro-slides uses **pnpm workspaces**. pnpm is the only supported package manager — do not use
`npm` or `yarn`, and **do not enable Corepack** (removed in Node 25+). Install pnpm with the
standalone installer:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Then, from the repo root:

```bash
pnpm install
```

Node 24+ is required (see `.nvmrc`).

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc -b` across every package (strict, composite refs). |
| `pnpm check` | Biome lint + format + import sorting (matches the pre-commit hook). |
| `pnpm test` | Vitest unit tests. |
| `pnpm test:e2e` | Playwright end-to-end tests (builds + serves the minimal example). |
| `pnpm build` | Builds the MCP server bundle (the CLI imports its dist). |
| `pnpm --filter @astro-slides/docs-site dev` | Runs the docs site locally. |

Every one of `typecheck`, `check`, `test`, and `test:e2e` must be green before a PR merges — CI
enforces all four, plus a build of every example and the docs site.

## Workflow

- **Branch, don't push to `main`.** Create a feature branch, open a PR, let CI gate it, and
  squash-merge (`--delete-branch`).
- **Add a changeset** for any user-facing change: `pnpm changeset`, pick the packages and bump
  level, and write a short summary. Release automation consumes these (see `.changeset/README.md`).
- **Match the surrounding code.** TypeScript is strict end-to-end (`strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any` without a comment saying why.
- **Zod is the source of truth for public types** — derive TS types with `z.infer` and JSON
  Schemas with `z.toJSONSchema()`; don't hand-write parallel interfaces.

## Architecture etiquette

The repo documents *why* things are the way they are, and expects changes to keep that current:

- Cross-cutting decisions live as **ADRs** in `docs/decisions/`. If your change makes an
  architectural choice (a library, a pattern), write or update an ADR.
- Cross-cutting design specs live in `docs/architecture/`. Before adding a dependency, check
  `docs/architecture/dependencies.md` — if it's not listed, propose it there first.
- `CLAUDE.md` is the canonical "how to work in this repo" file; update the relevant convention in
  the same change.
- Work is organized in phases under `todo/`; see `todo/README.md` for the ways of working.

## Reporting bugs & requesting features

Open an issue at <https://github.com/jluterek/astro-slides/issues>. For security reports, see
[SECURITY.md](./SECURITY.md) — please do **not** file public issues for vulnerabilities.

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
