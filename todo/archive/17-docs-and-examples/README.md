---
title: Phase 17 — Docs site, examples, CLI polish, scaffolder
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

A real docs site (Starlight — we dogfood Astro) and a curated set of example decks. CLI ergonomics polished with in-TTY shortcuts already scaffolded in Phase 03. A `create-astro-slides` scaffolder so new users can `pnpm create astro-slides` and have a working deck in 30 seconds. By the end of this phase, the project is presentable.

## Exit criteria

- [~] Starlight docs site under `docs-site/`, deployed to a stable URL. Site + `docs.yml` GitHub Pages workflow shipped; **enabling Pages is a repo setting** (Settings → Pages → GitHub Actions) — the first deploy runs once that's toggled.
- [x] Docs cover every author-facing surface — 17 pages across getting-started, authoring (MDX, frontmatter, slots/snippets/imports), layouts, themes, click model, transitions, code (Shiki/Magic Move/Twoslash), math/diagrams, presenter, drawing/recording/remote, export web + PPTX, MCP server, Marp/Slidev, CLI reference.
- [x] Every doc page ends with a `## Source` section linking the repo files it documents.
- [x] `examples/` has `minimal`, `blog-post-embed`, `conference-talk`, `technical-tutorial`, `marketing-pitch`.
- [x] Each example renders on `astro-slides dev` and builds via `astro build` (all 5 gated in CI). Export verified representatively: PDF (marketing-pitch) + PPTX (conference-talk); PNG shares the PDF screenshot path.
- [x] **`create-astro-slides` scaffolder**: `pnpm create astro-slides <target>` — `@clack/prompts` (target → theme), writes a runnable project with scripts; `--theme`/`--yes` for non-interactive use.
- [~] CLI in-TTY shortcuts polished: `r` restart, `o` open, `e` edit `$EDITOR`, `m` toggle MCP, `q` quit, `c` clear (kept the Phase 03 contract — QR already prints at `--remote` startup, so `c` stays "clear" rather than "print QR").
- [x] `--help`/command surface uses `picocolors`; shortcut help (`?`) lists every binding.
- [x] Docs screenshots use the Cosmic theme (dark) — `docs-site/public/img/`.

## Locked decisions

- **Docs framework:** Starlight (Astro). We dogfood.
- **Docs deploy target:** GitHub Pages (free, simple) initially; can move to Netlify if features warrant.
- **Scaffolder:** `create-astro-slides` package, separate from `@astro-slides/cli`. Convention for `pnpm create *`. Uses `@clack/prompts` for the interactive UI.
- **Examples count:** five (above). Cover the most common use cases.
- **Asset capture:** Playwright screenshots into `docs-site/public/`.

## Tasks (planned)

- Starlight site scaffolded under `docs-site/`
- Docs IA + writing pass — **one task per major topic, parallel:**
  - Getting started
  - Authoring (MDX, frontmatter, slot sugar, snippet imports, slide imports)
  - Layouts (one page per layout? or one page listing all 21?)
  - Themes (using + authoring)
  - Click model
  - Transitions
  - Code rendering (Shiki, Magic Move, Twoslash)
  - Math + diagrams
  - Presenter mode
  - Drawing + recording + mobile remote
  - Export (web)
  - Export (PPTX)
  - MCP server + skill bundle
  - Marp/Slidev compatibility
- Example decks — **one task per example, parallel:** minimal, blog-post-embed, conference-talk, technical-tutorial, marketing-pitch
- `create-astro-slides` scaffolder package
- CLI in-TTY shortcuts polish (mostly review since Phase 03 scaffolded)
- `--help` output polish
- Screenshot / GIF production
- Docs deploy workflow (GH Actions + GH Pages)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Starlight site scaffold | first |
| After scaffold | **~14 doc pages** parallel + **5 example decks** parallel + scaffolder + CLI polish — up to 20 parallel agents possible |
| Screenshots | parallel after Cosmic theme stable (Phase 16) |
| Docs deploy | final |

## Dependencies

- Phases 02-16 — we document what we built; can't document what doesn't exist.

## Risks

- **Documentation drift:** features change after docs are written. Mitigation: link each doc page to source paths so finding outdated content is easier.
- **Scaffolder UX:** the `pnpm create` flow has many micro-decisions (which theme, what examples, deck format). Keep the prompt count low (~3 questions).
- **Asset capture stability:** screenshots flake. Use Playwright's `expect(page).toHaveScreenshot()` for deterministic visual comparison.

## Notes

Docs site dogfooding has a useful side effect: anywhere the framework is annoying to use for our own docs, we'll feel it ourselves. That feedback is more valuable than any external review.

We deliberately avoid VitePress (Slidev's choice). Astro + Starlight is in-stack.

## Notes / decisions

- **Starlight 0.37** pinned — last line peering on Astro 5 (0.38+ needs Astro 6). Added to the
  frontend catalog with `sharp`.
- **Docs site location:** `docs-site/` (added to the pnpm workspace globs), separate from the
  `docs/` internal architecture/ADR tree.
- **Doc pages were fan-authored by 8 parallel agents**, each grounded in the matching
  `docs/built/NN` + source and told to verify flags/props/syntax. This surfaced real corrections
  (`--output` not `--out`; `--transport http` not `--http`).
- **Base-path gotcha:** Astro base-prefixes root-absolute markdown *links* but not `public/`
  image `src`; the landing page uses `` `${import.meta.env.BASE_URL}img/…` `` for screenshots.
  Also fixed agent-written `./`-relative links (resolved one level too deep) and ADR links (point
  to GitHub blob URLs, since the docs site doesn't host ADRs).
- **Examples are full projects** (`workspace:*` deps) so `astro-slides dev examples/<name>` works;
  a new CI **apps** job builds all of them + the docs site.
- **`c` = clear** kept over the plan's "print QR" (Phase 03 contract, already unit-tested).
- **Scaffolded projects pin `^0.1.0`** — unpublished until Phase 18; one `DEP_RANGE` constant.

## Outcome

astro-slides is now presentable. A dogfooded Starlight site documents every author-facing surface
(17 pages, each source-linked), five runnable example decks cover the common use cases, and
`pnpm create astro-slides` gets a new user to a working deck in one command. The `dev` CLI's
in-TTY shortcuts are fully wired, and a GitHub Pages workflow is ready to publish the docs. All
gates green: `tsc -b`, Biome, 310 unit tests (12 new — scaffolder + CLI shortcuts), 34 e2e, and
every example + the docs site build. Remaining external step: enable GitHub Pages in repo
settings so `docs.yml`'s first deploy runs.
