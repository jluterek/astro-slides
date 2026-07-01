---
phase: 15-marp-slidev-compatibility
status: distilled
distilled: 2026-07-01
---

# Phase 15 — Marp & Slidev compatibility

The second half of ADR-0002: existing Marp and Slidev decks render in astro-slides with few
changes, and what doesn't translate is documented rather than silently broken. Work is
parser-level (semantics, not pixel-perfect appearance). Archived task notes:
`todo/archive/15-marp-slidev-compatibility/`.

## What shipped

**Slidev `v-click` aliases** — `packages/core/src/compat/remark-slidev.ts`
- A remark plugin (runs *before* remark-clicks) rewrites the `v-click` family to our native
  components, so they then get numbered by the normal click resolver:
  - **Element form** — `<v-click>`, `<v-after>`, `<v-clicks>` → `Click` / `After` / `Clicks`
    (a `<v-click="3">` value moves to `at`).
  - **Attribute form** — a `v-click` / `v-after` / `v-clicks` attribute on any element wraps
    that element in the matching component (`v-click="+1"` → `<Click at="+1">`).
- Wired into the MDX `remarkPlugins` in `integration.ts`.

**Marp directives + image shorthand** — `packages/parser/src/marp.ts`
- `extractMarpDirectives` (Phase 02) already maps global/local/scoped comment directives
  (`_class`, `_backgroundColor` → `background`, …) to frontmatter. Phase 15 adds
  `extractMarpImages`: `![bg](url)` / `![bg cover](url)` → the slide `background` (stripped
  from the body); `![w:200 h:120](url)` → an inline `<img width height>`. Wired into the
  Marp-mode parse path (`applyMarp`), so it only runs when `marp: true`.

**Slidev component shims** — `packages/client/components/`
- `Youtube` (embed iframe), `AutoFitText` (alias of our fit-text), `LightOrDark` (light/dark
  named slots, CSS-toggled on `data-color-scheme`), `Tweet` (link-card fallback), `VDrag`
  (static absolute positioning), `Toc` (slide-title list). Registered in the deck `COMPONENTS`
  map in **both** `slide.astro` and `print.astro`, so they resolve in every deck.

**Marp theme ports** — `packages/client/src/themes/marp-{default,gaia,uncover}/theme.css`
- Each mirrors starter's `--slide-*` token contract, re-valued to approximate the Marp
  theme's look. Shipped as artifacts (see the theme-switching gap below).

## How to navigate the result

- `packages/core/src/compat/remark-slidev.ts` (+ `__tests__/remark-slidev.test.ts`).
- `packages/parser/src/marp.ts` `extractMarpImages` (+ `__tests__/marp-images.test.ts`).
- `packages/client/components/{Youtube,Tweet,Toc,VDrag,AutoFitText,LightOrDark}.astro`.
- `packages/core/src/routes/{slide,print}.astro` — the shared `COMPONENTS` registration.
- `examples/minimal/content/decks/compat/slides.mdx` + `e2e/compat.spec.ts` — the corpus.
- `::name::` slots / `<<<` snippets / `src:` imports (Phase 02) are unchanged; their existing
  `slots.test.ts` / `snippets.test.ts` / `imports.test.ts` confirm the round-trip.

## Key decisions

- **`v-click` aliasing is a remark pass before click resolution**, so Slidev directives share
  the exact numbering semantics as native `<Click>` — one code path, no divergence.
- **Marp image shorthand runs only in `marp: true` mode**, folded into `applyMarp` alongside
  directive extraction, so MDX decks that legitimately use `![bg]`-style alt text are untouched.
- **Shims live flat in `components/` and are registered in both deck routes.** A nested
  `src/compat/` location did not compile as MDX components, and the deck + print routes each
  keep their own `COMPONENTS` map — both must list a component or the print export breaks
  (this cost real debugging; the two maps are now kept in sync with a comment).

## What surprised us

- **Two `COMPONENTS` maps.** `slide.astro` and `print.astro` each register components. A shim
  added only to `slide.astro` renders fine at `/deck/n` but throws "component not defined"
  when the build prerenders `/print/deck`. Both maps now carry the shims.
- **Component location matters.** `.astro` shims only resolve as MDX components from the
  package's flat `components/` dir (where the primitives live), not a nested `src/compat/`
  subpath — so the shims sit alongside the primitives.

## Loose ends (documented gaps)

- **Marp themes don't auto-apply yet.** `slide.astro` still imports the starter theme
  statically; resolving an arbitrary `theme:` to its folder is the Phase 05 follow-up that
  lands with Phase 16 (default theme). The three `marp-*` themes are shipped and ready for it.
- **Tweet is a link-card fallback**, not a live embed (we don't ship `react-tweet`).
- **Toc renders from a `slides` prop**; the `@astro-slides/slides` virtual module isn't
  cleanly importable/typed from the client package, and `maxDepth` is accepted but inert.
- **VDrag is static** — `pos` is honored, but interactive drag + source persistence (which
  needs an editor round-trip) is out of scope.
- **`v-click.hide`/`.show` modifiers** are tolerated (base name still maps) but the hide/show
  distinction isn't modeled.
- **`<v-clicks>` over a Markdown list** reveals the list as a single step (our native
  `<Clicks>` semantics), not per-item.
- **Marp `bg` size keywords / split backgrounds / filters** collapse to a plain `background`;
  `paginate: true` passes through to frontmatter but visible page-number rendering isn't wired.
- **No translation of Vue-specific syntax** (`<script setup>`, `<template>`) or Slidev's
  `{monaco}` fence (we don't ship Monaco) — these need manual conversion (the v1 limit,
  per ADR-0002).

## Stats

New: `remark-slidev` plugin, `extractMarpImages`, 6 Slidev shims, 3 Marp theme CSS folders,
the `compat` corpus deck. Shims registered in both deck routes. **298 unit tests** (+15: 8
`v-click` alias, 7 Marp image) + **31 Playwright e2e** (+3: `v-click` reveal, Youtube, AutoFit).
Verified live: the `compat` deck builds and renders `v-click` reveals + shims on the slide and
print routes.

---

**Workflow:** Created at phase close, before `todo/15-marp-slidev-compatibility/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
