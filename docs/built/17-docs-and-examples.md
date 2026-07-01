---
phase: 17-docs-and-examples
status: distilled
distilled: 2026-07-01
---

# Phase 17 — Docs site, examples, scaffolder, CLI polish

The phase that makes astro-slides presentable: a real documentation site, a curated set of
runnable example decks, a `pnpm create` scaffolder, and the finished in-TTY CLI shortcuts.
Archived task notes: `todo/archive/17-docs-and-examples/`.

## What shipped

**Starlight docs site** — `docs-site/`
- A dogfooded Astro + Starlight app (`@astro-slides/docs-site`, added to the pnpm workspace).
  Starlight **0.37** is pinned — the last line that peers on Astro 5 (0.38+ requires Astro 6).
- 17 author-facing pages across nine sidebar groups: getting-started + CLI reference; authoring
  (Markdown/MDX, frontmatter, slots & imports); design (layouts, themes); interactivity (click
  model, transitions); rich content (code, math & diagrams); presenting (presenter mode,
  drawing/recording/remote); export (web, PPTX); integrations (MCP server, Marp/Slidev). Each
  page ends with a `## Source` section linking the repo files it documents, and was written
  grounded in the matching `docs/built/NN-*.md` + source (flags/props/syntax verified, not
  guessed — e.g. the real export flag is `--output`, the MCP transport flag is `--transport http`).
- `base: /astro-slides/` for GitHub Pages. **Link gotcha:** Astro base-prefixes root-absolute
  markdown *links* (`/reference/cli/` → `/astro-slides/reference/cli/`) but **not** `public/`
  image `src` — the landing page references screenshots via `` `${import.meta.env.BASE_URL}img/…` ``.

**Example decks** — `examples/`
- Four new runnable projects beside `minimal`: `blog-post-embed` (short, `?embed=1` in a blog
  post), `conference-talk` (16 slides — sections, reveals, highlighted code, quote/fact/statement,
  speaker notes), `technical-tutorial` (Shiki highlights, click-stepped code, Magic Move, a
  two-column walkthrough, a Mermaid diagram), and `marketing-pitch` (Cosmic + FlexBlock feature/
  metric grids). Each is a full Astro project (`workspace:*` deps) that runs on
  `astro-slides dev examples/<name>` and builds in CI. Verified: all four `astro build`, plus a
  representative PDF (marketing-pitch) and PPTX (conference-talk) export.

**`create-astro-slides` scaffolder** — `packages/create-astro-slides/`
- `pnpm create astro-slides <target>` — a `@clack/prompts` flow (target dir → theme) that writes a
  runnable project (`package.json` scripts, `astro.config.mjs`, `slides.mdx`, `.gitignore`,
  `README.md`). Template rendering is a pure `scaffold()` → path→contents `Map`, unit-tested
  independently of the interactive `run()`. Flags `--theme=<starter|cosmic>` and `--yes` make it
  non-interactive/scriptable. The bin runs `src/main.ts` under Node type-stripping (same pattern
  as the CLI). Verified end to end: a scaffolded deck renders through the real pipeline.

**CLI in-TTY shortcuts + `--help`** — `packages/cli/src/main.ts`
- The `dev` command now wires the full SHORTCUTS map to real actions: `r` restart (recycles
  Astro's dev server), `o` open browser (`openCommand` per-platform), `e` edit in `$EDITOR`/
  `$VISUAL` (`editorCommand` splits flags; `findDeckSource` locates the deck file), `c` clear,
  `m` toggle a child HTTP MCP server pointed at the dev deck, `q` quit. New pure helpers are
  unit-tested.

**Deploy + CI** — `.github/workflows/`
- `docs.yml`: builds the docs site and deploys `docs-site/dist` to GitHub Pages on push to main
  (PRs build only). `ci.yml`: a new **apps** job builds every `example-*` and the docs site, so a
  broken deck or doc page fails CI.

## Deviations & notes

- **`c` = clear, not print-QR.** The locked exit criteria listed `c` as "print QR", but the
  Phase 03 SHORTCUTS contract (already unit-tested) had `c` = clear console; the QR already
  prints at startup under `--remote`. Kept the existing contract rather than churn it.
- **Scaffolded projects pin `^0.1.0`** of the workspace packages — those are unpublished until the
  v1 release (Phase 18), so `pnpm install` in a scaffolded project works only once publishing
  lands. Tracked as a single `DEP_RANGE` constant to bump at release.
- **GitHub Pages enablement is a repo setting** (Settings → Pages → Source: GitHub Actions) that
  can't be done from code. The `docs.yml` workflow is ready; the first deploy runs once Pages is
  enabled for the repo.
- External comparison shots (WebSlides/Slidev) stay descoped (Phase 16 rationale); the docs use
  self-captured Cosmic screenshots.

## How to navigate the result

- `docs-site/` — the Starlight app (`astro.config.mjs` sidebar, `src/content/docs/**`).
- `examples/<name>/` — runnable decks; `examples/README.md` indexes them.
- `packages/create-astro-slides/src/main.ts` — scaffolder (`scaffold`/`writeScaffold`/`run`).
- `packages/cli/src/main.ts` — the wired `dev` shortcuts + `openCommand`/`editorCommand`/`findDeckSource`.
- `.github/workflows/docs.yml` + `ci.yml` (apps job) — deploy + gating.
