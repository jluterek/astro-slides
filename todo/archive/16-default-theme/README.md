---
title: Phase 16 — Default theme and design DNA
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Ship "Cosmic" — astro-slides's flagship theme. A landing-page-quality default with WebSlides-grade design DNA. This is the theme that people screenshot for the readme and the docs site. The brand's space-theme nod (per the project name) shows up here.

## Exit criteria

- [x] A complete, polished Cosmic theme covering every built-in layout — shipped at `packages/client/src/themes/cosmic/theme.css` (see *Notes* for the location deviation from `themes/cosmic/`).
- [x] Curated palette (semantic color tokens: bg, fg, accent, muted, danger, info; light + dark variants).
- [x] Typography scale (display/h1/h2/h3/body/small) using a self-hosted font stack — Space Grotesk (display) + Inter (body), OFL via Fontsource; not the Google CDN.
- [x] 8-pixel vertical rhythm enforced via CSS variables (`--slide-space-unit: 8px` + multiples).
- [x] `.flexblock`-family variants styled to landing-page quality (features/metrics/steps; clients inherits the base card treatment).
- [x] Default cover, intro, section, two-cols, quote, fact, statement layouts hand-tuned via scoped selectors.
- [x] Subtle starfield background (pure-CSS, dark-mode-only). [~] Planetary accents descoped — kept tasteful with the starfield alone.
- [~] Comparison shots in `docs/built/16-default-theme.md`: Cosmic (dark) + Cosmic-light vs. starter. External WebSlides/Slidev shots descoped (apps not buildable in-repo; reference-applications gitignored).
- [x] Theme is opt-out: `theme: starter` (the default) falls back to the Phase 05 starter theme.

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

## Notes / decisions

- **Location deviation.** Cosmic ships at `packages/client/src/themes/cosmic/` — not the planned
  root `themes/cosmic/` — matching the Phase 05/15 precedent where all *bundled* themes are CSS
  files consumed by the deck route. The `themes/*` workspace glob remains for external/clone-target
  themes; no CLI packaging step is needed. See `docs/built/16-default-theme.md` § *Decisions*.
- **Theme-by-name switching** is the enabling infra: the deck + print routes stamp
  `data-theme={config.theme}` and non-default themes scope tokens under a bare `[data-theme]`
  selector (nearest-ancestor custom-prop override). This also made the Phase 15 Marp ports
  selectable (re-scoped from `:root`).
- **Fonts** are `@import`ed from `cosmic/theme.css` (client owns the Fontsource deps), keeping the
  core routes font-agnostic and fixing pnpm resolution.
- **Descoped:** PostCSS hex fallback (oklch universal in 2026), planet glyphs (starfield only),
  per-layout `.astro` overrides (one scoped CSS file covers all layouts).
- **MDX gotcha:** a line starting with `export` parses as an ESM export — the metrics deck cell
  "export formats" was reworded to "output formats".

## Outcome

Cosmic delivers the bar the phase set: a five-minute deck with `theme: cosmic` looks
ship-ready. Dark-primary deep-space palette, gradient-clipped Space Grotesk display type, glowing
oklch accent numerals, hairline FlexBlock cards, and a faint pure-CSS starfield — all driven
through the `--slide-*` token contract with a full light variant. Verified end to end: `tsc -b`,
Biome, 298 unit tests, and 34 e2e (incl. 3 new theme-switching specs) all green; the example
builds with the Fontsource woff2 emitted only for the cosmic deck. Comparison screenshots
(dark + light + starter) live in `docs/built/16-default-theme.md`.
