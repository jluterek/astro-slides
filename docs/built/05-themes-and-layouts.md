---
phase: 05-themes-and-layouts
status: distilled
distilled: 2026-06-30
---

# Phase 05 — Themes and layouts

The theme + layout system. Slides now render through 21 built-in layouts, styled by a
`--slide-*` CSS-custom-property contract and a bundled **starter** theme, with
filesystem-layered layout overrides and composition primitives. Archived task notes:
`todo/archive/05-themes-and-layouts/`.

## What shipped

**`@astro-slides/client`**
- `layouts/*.astro` (21) — thin structural wrappers: `cover`, `default`, `center`, `intro`,
  `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`,
  `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`,
  `404`, `error`. All visual structure is in `src/styles/layouts.css`.
- `components/*.astro` (8 primitives) — `Stack`, `HStack`, `Grid`, `Wrap`, `FlexBlock`,
  `FitText` (fitty island), `Morph` (`view-transition-name`, inert until Phase 07),
  `RenderWhen` (keys off deck `data-mode`).
- `src/primitives.ts` — `cssVars` / `flexBlockClass` (prop→DOM logic, unit-tested).
- `src/layout-types.ts` — `LayoutProps` + `fmString`.
- `src/fit-text.ts` — fitty initializer.
- `src/themes/starter/theme.css` — the token set (oklch, light/dark). `src/styles/base.css`
  (slide typography, bridges tokens → `--as-bg/fg`), `layouts.css`, `primitives.css`.

**`@astro-slides/types`** — `theme.ts`: `BUILTIN_LAYOUTS` (the 21) + `ThemeManifestSchema`.

**`@astro-slides/core`**
- `layout-resolver.ts` — layers user `layouts/` > theme > built-in into a name→path map;
  built-in dir found via `createRequire(...).resolve`.
- `virtual.ts` — `SlideRecord` gains rendered `slots` + `class` + `background`;
  `layoutsModuleSource` now emits a `name → component` map (static `.astro` imports).
- `vite-plugin.ts` — resolves layouts (memoized) and serves them via `@astro-slides/layouts`.
- `integration.ts` — adds `unplugin-icons` (`compiler: "astro"`).
- `routes/slide.astro` — wraps each section's content in its resolved layout; imports theme +
  base + layouts + primitives CSS; applies per-slide `class`/`background`; sets
  `data-color-scheme` from headmatter.

## How to navigate the result

- `packages/client/layouts/` + `src/styles/layouts.css` — the 21 layouts and their CSS.
- `packages/client/src/themes/starter/theme.css` — the token contract in practice.
- `packages/core/src/layout-resolver.ts` — filesystem-layered resolution.
- `packages/core/src/routes/slide.astro` — how a slide gets wrapped in a layout.
- `docs/architecture/theme-tokens.md` / `layout-primitives.md` — the stable specs.

## Key decisions

- **Thin layouts + centralized CSS** — 21 small `.astro` files, one `layouts.css`; consistency
  and theming live in tokens, not in each layout.
- **Layouts consume rendered slots** — `content` is the default slot only, so `SlideRecord`
  carries a rendered `slots` map; two-cols/media layouts index named slots + frontmatter URLs.
- **Component-map virtual module** — `@astro-slides/layouts` imports resolved `.astro` files by
  absolute path into a map; user files override built-ins by name.
- **oklch tokens, root-level dark** — `prefers-color-scheme` unless `data-color-scheme` forces it.
- **Absolute-center + scale** — replaced Phase 04's grid centering (browsers start-align
  oversized grid items) with reveal.js-style `translate(-50%,-50%) scale()`.
- **Primitives ship now, author-usable later** — consumed by layouts today; slide-level MDX
  authoring waits on the MDX gap below.

## What surprised us

- **A grid item larger than its cell aligns to `start`, not `center`** in Chromium — which is
  why Phase 04 slides silently rendered offset. Only visible once real layouts filled the frame.
- **`import.meta.resolve` throws inside Vite's SSR module runner** — `createRequire().resolve`
  is the portable way to locate a bundled asset from a plugin.
- **`content` ≠ the whole slide body** — it's just the default slot, so naive `set:html(html)`
  drops named-slot content; the rendered `slots` map was the missing piece.

## Loose ends

- **MDX component evaluation in slides** (the big one) — bodies still render Markdown→HTML, so
  primitives/icons are layout-only, not author-usable in slide markdown. **Phase 06 requires it**;
  recommend a focused MDX-compilation step first.
- **Theme resolution by name** — the route imports the starter theme statically; resolving an
  arbitrary `theme:` (and theme-provided `layouts/`) folder is a follow-up (the resolver already
  accepts extra layout dirs).
- **Overview thumbnails** still shrink via `font-size`, not true render-scaling.
- **`Morph`** is inert until Phase 07; **`RenderWhen` presenter/print modes** wire up in Phase 10/12.
- **oklch fallback** — no PostCSS fallback plugin yet (fine for 2026 browsers).

## Stats

New: 21 layouts, 8 primitives, starter theme + 4 CSS files, layout resolver, theme types. 117
unit tests (36 new: resolver order, primitive composition, slot rendering) + 7 Playwright e2e.
Demo grew to 9 layout-driven slides; `astro build` → 9 routes; visually verified.

---

**Workflow:** Created at phase close, before `todo/05-themes-and-layouts/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
