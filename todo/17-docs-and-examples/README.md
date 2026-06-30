---
title: Phase 17 — Docs site, examples, CLI polish, scaffolder
status: pending
started:
ended:
---

## Goal

A real docs site (Starlight — we dogfood Astro) and a curated set of example decks. CLI ergonomics polished with in-TTY shortcuts already scaffolded in Phase 03. A `create-astro-slides` scaffolder so new users can `pnpm create astro-slides` and have a working deck in 30 seconds. By the end of this phase, the project is presentable.

## Exit criteria

- [ ] Starlight docs site under `docs-site/`, deployed to a stable URL (GitHub Pages or Netlify).
- [ ] Docs cover every author-facing surface: getting started, authoring (MDX, frontmatter, slot sugar, snippet imports, slide imports), layouts (every built-in), themes (using and authoring), click model, transitions, code rendering (Shiki, Magic Move, Twoslash), math/diagrams, presenter mode, drawing/recording, mobile remote, export (PDF/PNG/PPTX/SPA), MCP server, Marp/Slidev compatibility.
- [ ] Every doc page references the relevant source files (using the same approach we used in `docs/reference-applications/`).
- [ ] `examples/` directory with at least: `minimal`, `blog-post-embed`, `conference-talk`, `technical-tutorial`, `marketing-pitch`.
- [ ] Each example renders cleanly on `astro-slides dev examples/<name>` and exports cleanly to PDF + PNG + PPTX.
- [ ] **`create-astro-slides` scaffolder**: `pnpm create astro-slides <target>` interactively (via `@clack/prompts`) sets up a new deck project with chosen theme, example content, ready-to-go scripts.
- [ ] CLI in-TTY shortcuts polished: `r` restart, `o` open browser, `e` edit in `$EDITOR`, `q` quit, `c` print QR (if `--remote`), `m` toggle MCP server.
- [ ] `--help` output is comprehensive and friendly (uses `picocolors` for highlights).
- [ ] Screenshots / GIFs in the docs use the Cosmic theme (Phase 16).

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

## Outcome

_Fill in when the phase closes._
