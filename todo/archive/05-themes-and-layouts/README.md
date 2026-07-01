---
title: Phase 05 — Themes and layouts
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Materialize the theme system from ADR-0005 (themes as folders) and ship the 21 built-in layouts. Filesystem layering ([built-in, theme, addons, user]) resolves which layout file wins. Finalize the theme-token spec and layout-primitive props.

## Exit criteria

- [x] All 21 built-in layouts implemented as `.astro` components under `packages/client/layouts/`: `cover`, `default`, `center`, `intro`, `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`, `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`, `404`, `error`.
- [x] Filesystem-layered resolution: a layout file in the user project overrides the same name in the built-ins.
- [x] `docs/architecture/theme-tokens.md` finalized with the complete token list (status `stable`).
- [x] `docs/architecture/layout-primitives.md` finalized with `Stack`, `HStack`, `Grid`, `Wrap`, `FlexBlock`, `FitText`, `Morph`, `RenderWhen` (status `stable`).
- [x] CSS custom properties drive all theme values (`--slide-bg`, `--slide-fg`, etc.).
- [x] Per-slide overrides via frontmatter (`layout`, `class`, `background`; token overrides cascade via `style`).
- [x] Layout primitive components implemented.
- [x] A minimal "starter" theme in `packages/client/src/themes/starter/` (light/dark, sensible defaults). Bundled as the absolute fallback.
- [x] Icons via `unplugin-icons` + `@iconify-json/carbon` (other collections opt-in).
- [x] Demo deck rendered through representative layouts; verified via `astro build` + Playwright screenshots.
- [x] Tests cover resolution order (built-in vs user override) and primitive composition.

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

## Notes / decisions (as built)

- **Thin `.astro` layouts + one centralized `layouts.css`.** Each of the 21 layouts is a tiny structural wrapper (`set:html` of the default slot or named slots); all visual structure lives in `src/styles/layouts.css`, driven entirely by `--slide-*` tokens. Keeps 21 files consistent and lets a theme restyle without touching layout files.
- **Layouts consume rendered slots.** The parser sets a slide's `content` to the *default slot only*; named slots live in `slide.slots`. `SlideRecord` now carries a rendered-HTML `slots` map (+ per-slide `class`/`background`), and layouts index it (`two-cols` = default+right, `two-cols-header` = default+left+right, `image*/iframe*` take the URL from frontmatter).
- **Resolution via a component-map virtual module.** `@astro-slides/layouts` now emits `import`s of the resolved `.astro` files (absolute paths) into a `name → component` map instead of a list of names. `layout-resolver.ts` layers user `layouts/` > theme > built-in; the route picks `layouts[slide.layout] ?? default`. User override of a built-in name works. Built-in dir is located via `createRequire(...).resolve` (not `import.meta.resolve`, which Vite's module runner doesn't support).
- **Tokens use `oklch()`** on `:root`; dark applies under `prefers-color-scheme` unless `data-color-scheme` (from headmatter `colorSchema`) forces a scheme. `base.css` bridges `--slide-bg/fg` into the runtime's `--as-bg/fg`.
- **Absolute-center + scale fix.** Phase 04 centered the scaled viewport with CSS grid, but browsers align an oversized grid item to the *start*, not center — so slides rendered offset to the bottom-right. Switched `.as-viewport` to `position:absolute; top/left:50%; translate(-50%,-50%) scale(...)` (reveal.js-style). Verified centered (viewport rect `0,0 → 1280×720`).
- **Primitives are `.astro` + CSS**, with prop→DOM logic (`cssVars`, `flexBlockClass`) extracted to `src/primitives.ts` so "composition" is unit-testable. `<FitText>` uses `fitty` via an island script; `<Morph>` sets `view-transition-name` (inert until Phase 07); `<RenderWhen>` keys off the deck's `data-mode`.
- **`unplugin-icons`** wired into the integration (`Icons({ compiler: "astro" })`); `@iconify-json/carbon` bundled. Usable in `.astro` layouts today.
- **MDX gap flagged (key loose end).** Slide bodies still render Markdown → HTML strings (Phase 03/04 never added MDX-component compilation). So primitives/icons are consumed by *layouts*, not yet author-usable inside slide markdown. **Phase 06 (click model) hard-requires MDX/JSX component evaluation in slides** — recommend a focused MDX-compilation step before/at the start of Phase 06. Building layouts/primitives on the HTML-string model is not wasted (a layout arranges content the same way regardless).

## Outcome

Shipped the theme + layout system: 21 built-in layouts, 8 primitives, the `--slide-*` token contract + bundled **starter** theme (light/dark, oklch), a filesystem-layered layout resolver (user > theme > built-in) exposed as a `name→component` virtual module, per-slide `class`/`background` overrides, and `unplugin-icons`. Both architecture docs (`theme-tokens.md`, `layout-primitives.md`) are now `stable`. 117 unit tests (resolver order, primitive composition, slot rendering) + 7 Playwright e2e (incl. layout wrapping) green; the 9-slide demo renders through the layouts and was visually verified. Distilled to [`docs/built/05-themes-and-layouts.md`](../../docs/built/05-themes-and-layouts.md).
