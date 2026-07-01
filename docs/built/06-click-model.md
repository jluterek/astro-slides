---
phase: 06-click-model
status: distilled
distilled: 2026-06-30
---

# Phase 06 — Click model (+ the MDX/React foundation)

Two things shipped together: the **MDX + React rendering foundation** (the prerequisite
flagged after Phase 05) and the **click model** built on it. Slides now compile as
Astro-native MDX with components in scope; `<Click>`/`<After>`/`<Clicks>` resolve to a
deterministic step plan at compile time (ADR-0008) that the Phase-04 runtime consumes.
Archived task notes: `todo/archive/06-click-model/`.

## What shipped

**MDX foundation**
- `mdx-emit.ts` (core) — writes each slide's slot sources to temp `.mdx` files under
  `<root>/.astro-slides/` (gitignored); returns a metadata manifest with slot file paths.
- `virtual.ts` — `slidesModuleSource` now emits `import`s of those `.mdx` files into a
  manifest whose `slots` are components and whose `totalClicks` sums each slot's
  compile-time export (frontmatter `clicks` overrides).
- `integration.ts` — `astroSlides()` adds `@astrojs/react` + `@astrojs/mdx` (with
  `remark-clicks`) itself; still adds the virtual-module plugin + `unplugin-icons`.
- `routes/slide.astro` — renders each slot's MDX component inside its layout, injecting
  the component map (`Click`, `After`, `Clicks`, layout primitives) via the MDX
  `components` prop. Static-rendered: **no client JS ships for clicks**.
- 21 layouts reworked from `set:html` to Astro `<slot>` / `<slot name>`.

**Click model**
- `remark-clicks.ts` (core) — walks the MDX AST, assigns step indices in document order,
  rewrites `at`/`to` (string attrs), wraps `<Clicks>` children in resolved `<Click>`s, and
  injects `export const totalClicks`. Semantics: auto, absolute `at`, relative `+K`,
  ranges `[a,b]`, `<After>` (= previous step), `<Clicks every={N}>`.
- `components/Click.tsx`, `After.tsx`, `Clicks.tsx` (client, React) — emit
  `<span class="as-click" data-click>` (Clicks is a pass-through; remark does the split).
- `styles/click.css` — fade default + `as-anim-{up,down,left,right,scale}`; overview shows all.
- Runtime: `navigation.ts` range-aware reveal (`data-click-to`); `runtime.ts` derives the
  step total from the DOM as a fallback.

## How to navigate the result

- `packages/core/src/mdx-emit.ts` + `virtual.ts` — how slides become MDX modules + manifest.
- `packages/core/src/remark-clicks.ts` — the parse-time step resolver.
- `packages/core/src/routes/slide.astro` — MDX components rendered inside layouts.
- `packages/client/components/Click.tsx` — the reveal wrapper contract.
- `packages/client/src/navigation.ts` (`applyStepReveal`) — how `?step` toggles reveals.

## Key decisions

- **Astro-native MDX via temp files**, not `@mdx-js` → React. Keeps `.astro` layouts +
  primitives usable inside MDX and gives real React islands, without a components-framework
  mismatch. Files are emitted before the manifest imports them.
- **Clicks resolve at compile time, render statically.** The component is a dumb wrapper; the
  runtime toggles classes. No per-click hydration; the tested Phase-04 step machine is reused.
- **`<Clicks>` split in remark, not the component** — MDX groups block children
  unpredictably, so parse-time wrapping is the only deterministic option.
- **Integration adds its own integrations** (`react()`, `mdx()`), so a deck's `astro.config`
  stays a one-liner.

## What surprised us

- **An Astro integration can add other integrations** via `updateConfig({ integrations })` —
  so `astroSlides()` wires MDX + React with zero user config.
- **A React component used in MDX SSRs to static HTML with no client bundle** unless a
  `client:*` directive is present — exactly what click wrappers want.
- **`import.meta.resolve` throws in Vite's module runner** (hit again) — `createRequire` is
  the portable resolve inside plugins.
- **MDX merges adjacent block children** passed to a component, breaking naive child-splitting
  — the reason `<Clicks>` had to become a remark transform.

## Loose ends

- **`.tsx` components aren't in `tsc -b`** (like `.astro`); the build typechecks them.
- **`<Clicks>` over a markdown list** (auto-reveal each `<li>`) needs list descent — today it
  reveals explicit block children.
- **Click reveal wraps block content in `<span>`** (tolerated, not ideal) — a block-aware
  wrapper is a polish item.
- **Magic Move / KaTeX click registration** (Phases 08/09) will emit into the same plan.
- **HMR** for deck edits is still full-reload; temp-file regeneration on watch is basic.

## Stats

MDX migration touched core (emit/virtual/plugin/integration/route) + all 21 layouts +
Click family; new `remark-clicks`. 128 unit tests (+11: remark-clicks resolution, DOM step
reveal + ranges, manifest override) + 8 Playwright e2e (incl. click stepping in Chromium).
Demo grew to 10 slides with a click-step slide. Closes the post-Phase-05 MDX gap.

---

**Workflow:** Created at phase close, before `todo/06-click-model/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
