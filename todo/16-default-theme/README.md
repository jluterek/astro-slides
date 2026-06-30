---
title: Phase 16 — Default theme and design DNA
status: pending
started:
ended:
---

## Goal

Ship "Cosmic" — astro-slides's flagship theme. A landing-page-quality default with WebSlides-grade design DNA. This is the theme that people screenshot for the readme and the docs site. The brand's space-theme nod (per the project name) shows up here.

## Exit criteria

- [ ] `themes/cosmic/` is a complete, polished theme covering every built-in layout.
- [ ] Curated palette (semantic color tokens: bg, fg, accent, muted, danger, info; light + dark variants).
- [ ] Typography scale (display/h1/h2/h3/body/small) using a single high-quality font stack (self-hosted, not Google Fonts CDN).
- [ ] 8-pixel vertical rhythm enforced via CSS variables (WebSlides-inspired).
- [ ] `.flexblock`-family variants (features, metrics, clients, steps) styled to landing-page quality.
- [ ] Default cover, intro, section, two-cols, quote, fact, statement layouts hand-tuned (not just functional).
- [ ] Space-themed default assets: subtle starfield background option, optional planetary accents. Tasteful, not garish.
- [ ] Side-by-side comparison shots in `docs/built/16-default-theme.md` showing Cosmic vs WebSlides demos vs Slidev's `default` and `seriph`.
- [ ] Theme is opt-out: `theme: starter` in frontmatter falls back to the Phase 05 starter theme.

## Locked decisions

- **Theme name:** Cosmic.
- **Distribution:** folder at `themes/cosmic/` in the monorepo. Shipped bundled with `@astro-slides/cli` (via `package.json::files`) and discoverable as a clone target.
- **Color space:** `oklch()` palette; fallback hex via PostCSS plugin.
- **Font stack:** self-hosted via `astro:assets` font loading. Pick fonts during the phase (likely Inter for body, custom display face for headings).
- **Token compliance:** all tokens defined in `docs/architecture/theme-tokens.md`. No magic values.
- **Assets:** SVG starfield (vector, scales infinitely), optional inline-able. Planet glyphs as SVG icons via `@iconify-json/custom` collection.
- **Dark variant:** primary deck mode; light variant tunes contrast for projector use.

## Tasks (planned)

- Color system + palette (light/dark, semantic tokens) → `themes/cosmic/styles/tokens.css`
- Typography choice + self-hosted font load → `themes/cosmic/styles/type.css`
- Layout-by-layout visual pass (21 layouts) → `themes/cosmic/layouts/*.astro` (only those that override the built-in look)
- `.flexblock` family components (features/metrics/clients/steps)
- Cover-slide and intro-slide showstopper design
- Optional space-theme accents (starfield SVG, planet glyphs)
- Documentation of theme tokens (CSS-variable reference in the theme's README.md)
- Side-by-side comparison shots (Playwright + visual snapshot)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Color + typography systems | first |
| After tokens | **21 layout visual passes** (only overriding the ones we want to restyle, likely ~10-14) — parallel-friendly with multiple agents |
| `.flexblock` family + cover-slide + assets | parallel after tokens |
| Comparison shots | final, after layouts done |

## Dependencies

- Phase 05 (layouts and theme system must be stable)
- Practically: schedule late so transitions, code, math, presenter all exist for the visual pass

## Risks

- **`oklch()` legacy support.** Browser support is good in 2026 (Chrome 111+, Safari 16.4+, Firefox 113+). PostCSS plugin provides hex fallback.
- **Font licensing.** Self-hosting commercial fonts requires the right license. Use SIL/OFL fonts (Inter, JetBrains Mono) to avoid issues.
- **Subjective design quality.** "Landing-page-quality" is a judgment call. Include external feedback in the *Outcome*.

## Notes

WebSlides is the visual reference (`docs/reference-applications/WebSlides.md` § *CSS / design system*). We lift the palette idioms, vertical rhythm, and `.flexblock` taxonomy — not the SCSS-via-webpack-3 implementation.

Cosmic's distinguishing quality must be: a deck created in 5 minutes with default styles looks *good enough to ship*. That's the bar.

We ship one flagship theme in v1. A counterpoint (e.g., minimal-serif) is a post-v1 addition if there's appetite.

## Outcome

_Fill in when the phase closes._
