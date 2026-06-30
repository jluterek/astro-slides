---
title: Phase 05 — Themes and layouts
status: pending
started:
ended:
---

## Goal

Materialize the theme system from ADR-0005 (themes as folders) and ship the 21 built-in layouts. Filesystem layering ([built-in, theme, addons, user]) resolves which layout file wins. Finalize the theme-token spec and layout-primitive props.

## Exit criteria

- [ ] All 21 built-in layouts implemented as `.astro` components under `packages/client/layouts/`: `cover`, `default`, `center`, `intro`, `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`, `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`, `404`, `error`.
- [ ] Filesystem-layered resolution: a layout file in the user project overrides the same name in the built-ins.
- [ ] `docs/architecture/theme-tokens.md` finalized with the complete token list (status moves to `stable`).
- [ ] `docs/architecture/layout-primitives.md` finalized with `Stack`, `HStack`, `Grid`, `Wrap`, `FlexBlock`, `FitText`, `Morph`, `RenderWhen` (status: `stable`).
- [ ] CSS custom properties drive all theme values (`--slide-bg`, `--slide-fg`, etc.).
- [ ] Per-slide overrides via frontmatter (`layout`, `class`, inline `style` for CSS variables).
- [ ] Layout primitive components implemented.
- [ ] A minimal "starter" theme in `packages/client/src/themes/starter/` (just light/dark, sensible defaults). Bundled as the absolute fallback.
- [ ] Icons via `unplugin-icons` + `@iconify-json/carbon` (and other collections opt-in).
- [ ] Demo deck rendered through every layout for visual verification.
- [ ] Tests cover resolution order (built-in vs user override) and primitive composition.

## Locked decisions

- **Layout file format:** `.astro` components (Astro components can host React/Vue islands if interactivity is needed).
- **Theme = folder.** Per ADR-0005. Starter theme bundled; user themes and the Phase 16 "Cosmic" theme live at `themes/<name>/` in the repo and can be cloned to user projects.
- **Token naming:** all CSS custom properties prefixed `--slide-*`. Semantic names over physical (`--slide-accent`, not `--slide-blue`).
- **Dark/light:** via `@media (prefers-color-scheme: dark)` override in token CSS. `colorSchema: "all"` in headmatter ships both; `"light"` or `"dark"` forces one.
- **Color space:** `oklch()` where possible (well-supported in 2026), with `#rrggbb` fallbacks via PostCSS plugin if needed.
- **Layout primitives** ship in `@astro-slides/client`. Authors import from `astro-slides/components`.
- **Icon plugin:** `unplugin-icons` (drop astro-icon; it's stale).
- **Auto-fit text:** `<FitText>` primitive uses `fitty` v2.4+.

## Tasks (planned)

- Theme token spec finalization (write `docs/architecture/theme-tokens.md`)
- Layout primitive props spec finalization (write `docs/architecture/layout-primitives.md`)
- Theme contract types in `packages/types/`
- Filesystem-layered resolver in `packages/core/`
- Layout primitives implementation (Stack/HStack/Grid/Wrap/FlexBlock/FitText/Morph/RenderWhen)
- Built-in layouts — **21 separate tasks**, each a single `.astro` file
- `unplugin-icons` setup with default collections
- Starter theme files
- Per-slide frontmatter override plumbing (class, style cascade)
- Resolution-order tests

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Theme token + layout primitive specs | sequential within this group |
| Theme contract types + resolver | parallel after specs |
| Layout primitives | parallel after specs (8 primitives → up to 8 agents) |
| **Built-in layouts (21)** | **highly parallel** — 21 independent files. Spawn ~5 agents handling ~4 layouts each. |
| Starter theme | after primitives |
| Tests | parallel with implementations |

## Dependencies

- Phase 04 (runtime core — layouts wrap slide bodies)

## Risks

- **Composition order between Astro components and React islands.** Layouts as `.astro` host their children — most slide content is MDX, which Astro renders. Interactive bits (Click components, drawing layer) are React islands. Verify the boundary doesn't cause hydration mismatches.
- **`oklch()` legacy fallback.** Two color systems coexist briefly during transition. Pick a PostCSS plugin and lock the fallback strategy.

## Notes

The default theme proper ("Cosmic") lands in Phase 16. This phase ships a deliberately plain "starter" so layout correctness is testable independent of visual identity.

Reference: `docs/reference-applications/slidev.md` § *Layouts (built-in)* for the 21-layout list; `docs/reference-applications/WebSlides.md` § *CSS / design system* for vertical rhythm and `.flexblock` taxonomy; `docs/reference-applications/reveal.js.md` § *Theming* for CSS-custom-property patterns.

## Outcome

_Fill in when the phase closes._
