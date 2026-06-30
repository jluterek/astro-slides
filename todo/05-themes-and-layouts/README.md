---
title: Phase 05 — Themes and layouts
status: pending
started:
ended:
---

## Goal

Materialize the theme system from ADR-0005 (themes as folders) and ship the built-in layout catalog from the readme — `cover`, `default`, `center`, `intro`, `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`, `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`, `404`, `error`. Filesystem layering ([built-in, theme, addons, user]) resolves which layout file wins.

## Exit criteria

- [ ] All 21 built-in layouts implemented under `packages/client/layouts/`.
- [ ] Filesystem-layered resolution: a layout file in the user project overrides the same name in the built-ins.
- [ ] CSS custom properties drive all theme values (`--slide-bg`, `--slide-fg`, `--slide-accent`, font tokens, spacing tokens).
- [ ] Per-slide overrides via frontmatter (`layout: two-cols`, `class: text-center`, custom inline CSS variables).
- [ ] Layout primitive components (`Stack`, `Grid`, `Wrap`, `FlexBlock`, `FitText`) implemented.
- [ ] Theme contract types in `packages/types/` documented.
- [ ] A minimal "starter" theme in `themes/starter/` (just light/dark, sensible defaults).
- [ ] Demo deck rendered through every layout to visually verify.
- [ ] Tests cover resolution order (built-in vs user override).

## Planned tasks

- Layout component types and contract (`packages/types/`)
- Filesystem-layered resolver (in `packages/core/`)
- Built-in layouts (21 files)
- Layout primitives (`Stack`, `Grid`, `Wrap`, `FlexBlock`, `FitText`)
- CSS custom property tokens defined (and documented in the *Outcome*)
- Starter theme
- Per-slide frontmatter override plumbing
- Tests for resolution order, theme inheritance, CSS variable cascade

## Dependencies

- Phase 04 (runtime core — layouts wrap slide bodies)

## Notes

The default theme proper ("Cosmic") lands in Phase 16. This phase ships a deliberately plain "starter" so layout correctness is testable independent of visual identity.

Reference: `docs/reference-applications/slidev.md` § *Layouts (built-in)* for the layout list and resolution pattern; `docs/reference-applications/WebSlides.md` § *CSS / design system* for the layout-primitive vocabulary (`.wrap`, `.flexblock`, etc.); `docs/reference-applications/reveal.js.md` § *Theming* for the CSS-custom-property pattern.

Decision likely needed: should layouts be `.astro` components, React/Vue/Solid, or Astro components that internally use a chosen framework? Astro components by default with React islands for interactivity is the natural fit.

## Outcome

_Fill in when the phase closes._
