---
title: Phase 16 — Default theme and design DNA
status: pending
started:
ended:
---

## Goal

Ship "Cosmic" — astro-slides's flagship theme. A landing-page-quality default with WebSlides-grade design DNA, optionally extended into a small theme family (light/dark variants, optional alternates). This is the theme that people screenshot for the readme and the docs site. The brand's space-theme nod (per the project name) shows up here.

## Exit criteria

- [ ] `themes/cosmic/` is a complete, polished theme covering every built-in layout.
- [ ] Curated palette (semantic color tokens: bg, fg, accent, muted, danger, info; light + dark variants).
- [ ] Typography scale (display/h1/h2/h3/body/small) using a single high-quality font stack (self-hosted, not Google Fonts CDN).
- [ ] 8-pixel vertical rhythm enforced via CSS variables (mirrors WebSlides).
- [ ] `.flexblock`-family components (features, metrics, clients, steps) styled to landing-page quality.
- [ ] Default cover, intro, section, two-cols, quote, fact, statement layouts hand-tuned (not just functional).
- [ ] Space-themed default assets: subtle starfield background option, optional planetary accents. Tasteful, not garish.
- [ ] Side-by-side comparison shots in `docs/built/16-default-theme.md` showing Cosmic vs WebSlides demos vs Slidev's `default` and `seriph`.
- [ ] Theme is opt-out: `theme: starter` in frontmatter falls back to the Phase 05 starter theme.

## Planned tasks

- Color system + palette (light/dark, semantic tokens)
- Typography choice + self-hosting
- Layout-by-layout visual pass (21 layouts)
- `.flexblock` family components
- Cover-slide and intro-slide showstopper design
- Optional space-theme accents (starfield, planet glyphs)
- Documentation of theme tokens (CSS-variable reference)
- Side-by-side comparison shots

## Dependencies

- Phase 05 (layouts and theme system must be stable)
- Phase 16 doesn't strictly depend on phases 07-14 to *build*, but you can't really judge the theme until transitions, code, math, and presenter mode all exist. Practically: schedule late.

## Notes

WebSlides is the visual reference (`docs/reference-applications/WebSlides.md` § *CSS / design system*). We lift the palette idioms, vertical rhythm, and `.flexblock` taxonomy — not the SCSS-via-webpack-3 implementation.

Cosmic's distinguishing quality must be: a deck created in 5 minutes with default styles looks *good enough to ship*. That's the bar.

Open question for the phase: do we ship a second flagship theme as a counterpoint (e.g., minimal-serif) to show that the theme system isn't tied to one aesthetic? Probably not in v1 — better to nail one than ship two mediocre.

## Outcome

_Fill in when the phase closes._
