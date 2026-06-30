---
title: Phase 03 — Astro integration
status: pending
started:
ended:
---

## Goal

Wire the parser into Astro. Define the Astro integration (`AstroIntegration`) that registers Vite plugins, content collections, virtual modules, and route generation so that a deck is just a content collection of `.mdx`/`.md` files and per-slide URLs exist out of the box.

## Exit criteria

- [ ] `@astro-slides/core` exports an `astroSlides()` integration that users `add` to their `astro.config.mjs`.
- [ ] A `decks` content collection (or equivalent) discovers `.mdx`/`.md` files and exposes typed access.
- [ ] Each slide gets a route at `/<deck>/<slide-no>` and a deep link supporting `?step=N` query.
- [ ] Virtual modules expose: `@astro-slides/slides`, `@astro-slides/layouts`, `@astro-slides/configs`, `@astro-slides/titles` (model: Slidev's `/@slidev/*`).
- [ ] Hot reload of `.mdx`/`.md` is granular: content changes invalidate the slide module; frontmatter-only changes invalidate the frontmatter module only.
- [ ] Astro view transitions enabled on slide routes.
- [ ] A demo project under `examples/minimal/` boots with `astro dev` and renders the first slide (no styling, no animations yet — just text).

## Planned tasks

- `astroSlides()` integration scaffold
- Content collection schema for decks
- Vite plugin: register virtual modules
- Vite plugin: per-slide module loader (markdown ID + frontmatter ID, à la Slidev)
- Per-slide route generator (Astro `injectRoute`)
- HMR handling for slide updates and frontmatter-only updates
- Demo project (`examples/minimal/`) wired end-to-end
- Integration tests with Astro's test harness

## Dependencies

- Phase 01 (foundation)
- Phase 02 (parser — the AST it produces is what we serve from virtual modules)

## Notes

This is where the project goes from "library" to "framework". The integration boundary is delicate — we want to be a good citizen of Astro's lifecycle.

Reference: `docs/reference-applications/slidev.md` § *Architecture* and *Code patterns worth studying* / *Slide route generation (Vite plugin pattern)*.

Decisions likely needed:
- Whether multiple decks per repo is supported in v1 (probably yes — `content/decks/<name>/slides.mdx`).
- Routing scheme: `/decks/<name>/<n>` vs `/<name>/<n>` vs `/<n>` for single-deck mode.

## Outcome

_Fill in when the phase closes._
