---
title: Phase 17 — Docs site, examples, and CLI polish
status: pending
started:
ended:
---

## Goal

A real docs site (Starlight — we dogfood Astro) and a curated set of example decks. CLI ergonomics improved with in-TTY shortcuts (`r`/`o`/`e`/`q`/`c`) à la Slidev. By the end of this phase, the project is presentable: someone can land on the docs, read it, copy an example, and have a deck running in five minutes.

## Exit criteria

- [ ] Starlight docs site under `docs-site/` (or similar), deployed to a stable URL.
- [ ] Docs cover: getting started, authoring (MDX, frontmatter, slot sugar, snippet imports, slide imports), layouts (every built-in), themes (using and authoring), click model, transitions, code rendering (Shiki, Magic Move, Twoslash), math/diagrams, presenter mode, drawing/recording, mobile remote, export (PDF/PNG/PPTX/SPA), MCP server, Marp/Slidev compatibility.
- [ ] Every doc page references the relevant source files (using the same approach we used in `docs/reference-applications/`).
- [ ] `examples/` directory with at least: minimal, blog-post-embed, conference-talk, technical-tutorial, marketing-pitch.
- [ ] Each example renders cleanly on `astro-slides dev examples/<name>` and exports cleanly.
- [ ] CLI in-TTY shortcuts: `r` restart, `o` open browser, `e` edit in `$EDITOR`, `q` quit, `c` print QR (if `--remote`), `m` toggle MCP server.
- [ ] `--help` output is comprehensive and friendly.
- [ ] Screenshots / GIFs in the docs use the Cosmic theme (Phase 16).

## Planned tasks

- Starlight site scaffolded under `docs-site/`
- Docs IA + writing pass (one task per major topic)
- Example decks (one task per example)
- CLI in-TTY shortcuts
- `--help` polish
- Screenshot / GIF production
- Docs deploy (GitHub Pages or Netlify)

## Dependencies

- Phases 02-16 — we document what we built; can't document what doesn't exist.

## Notes

Docs site dogfooding has a useful side effect: anywhere the framework is annoying to use for our own docs, we'll feel it ourselves. That feedback is more valuable than any external review.

We deliberately avoid VitePress (Slidev's choice). Astro + Starlight is in-stack.

## Outcome

_Fill in when the phase closes._
