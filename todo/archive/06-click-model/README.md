---
title: Phase 06 — Click model
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Implement parse-time click resolution per ADR-0008. Each `<Click>`, `<After>`, `<Clicks>` invocation is identified by a remark plugin during MDX compile, assigned a deterministic step index, and the per-slide total is emitted as static metadata. The runtime is purely a consumer of the pre-computed plan.

## Exit criteria

- [x] `<Click at="…">`, `<After>`, `<Clicks every={N}>` components in `packages/client/` implemented (React, static-rendered).
- [x] Remark plugin (`remark-clicks`) walks the slide MDX AST, finds click components, assigns step indices, and writes the per-slide total to the compiled module (`export const totalClicks`), summed in the manifest.
- [x] Relative offsets (`at="+1"`, `at="+0"` = `<After>`) and ranges (`at="[2,5]"`) supported and resolved at parse (MDX-compile) time.
- [x] Frontmatter `clicks: N` override accepted (authoritative in the manifest total); the AST step plan is preserved.
- [x] Runtime reads `?step=N` from the URL (nanostore-backed), toggles class names on click targets (incl. range hide).
- [x] Click steps animate in via CSS transitions (`fade` default, `up`/`down`/`left`/`right`/`scale` via `as-anim-*`).
- [x] `next()` / `prev()` walk clicks before changing slides (Phase 04 navigation — totals now real).
- [x] Tests: parser correctness (counts, ordering, ranges, offsets, After, Clicks grouping), runtime stepping + range reveal, URL `?step` survives reload, frontmatter override; Playwright click-stepping e2e.

## Locked decisions

- **Click components are wrappers, not directives.** `<Click at="2">content</Click>` wraps its child. (Slidev uses a Vue directive `v-click` since they're Vue; we use a React component since we're MDX/React.)
- **Animation system:** CSS transitions for click steps (NOT View Transitions API — VTA is for slide-level morphs per ADR-0006). Author can drop in `@formkit/auto-animate` for list/grid reveal cases where CSS isn't enough.
- **URL state:** `?step=N` query param, backed by nanostore so all islands see updates.
- **AST extension:** `clickSteps: ClickStep[]` added to the `Slide` AST node (see `docs/architecture/ast.md`).
- **Magic Move and KaTeX click reveals also register clicks.** Their build-time transformers (Phase 08, 09) emit click steps into the same AST.

## Tasks (planned)

- AST node types for click steps (extend `Slide` type in `packages/types/`)
- Remark plugin: walk MDX AST, identify click components, assign indices
- Runtime click components (`<Click>`, `<After>`, `<Clicks>`)
- Click state composable (URL ↔ nanostore ↔ DOM class)
- CSS animation classes
- Integration with Phase 04 navigation (clicks first, then slides)
- Optional `@formkit/auto-animate` adapter for list-mutation reveal
- Tests across parser, runtime, navigation, persistence

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| AST node types | first |
| After AST | **remark plugin, runtime components, CSS animations, nanostore composable, navigation integration** — five parallel agents |
| Tests | parallel with implementation |

## Dependencies

- Phase 02 (parser — extends the AST)
- Phase 04 (runtime core — wires into navigation and nanostores)
- Phase 05 (layouts — click components usable inside layouts)

## Risks

- **Click components nested inside other components.** Our remark plugin walks JSX children — it must descend into MDX children of arbitrary components. Verify with a layout-wrapped click test.
- **Magic Move and KaTeX click registration timing.** Phases 08/09 emit click steps from code-block transformers. The remark plugin must run after those transformers (or merge their click metadata).
- **Frontmatter `clicks:` override semantics.** If override < computed total, do we hide later steps or truncate? Decision: override is authoritative; steps beyond the override are ignored at runtime but kept in AST for tooling.

## Notes

This is one of the more delicate phases because we're making a deliberate departure from Slidev's mount-time discovery (per ADR-0008). The benefit — exports, MCP tools, presenter all see the same plan — only pays off if the AST extraction is exhaustive.

Reference: `docs/reference-applications/slidev.md` § *Click animations (`v-click` and friends)* for the model, with the caveat that we resolve at parse time, not mount time.

## Notes / decisions (as built)

- **The MDX + React migration happened here (user-chosen).** This was the big prerequisite flagged after Phase 05. Slides now compile as **Astro-native MDX**: each slide's slot sources are emitted to temp `.mdx` files under `<root>/.astro-slides/` (gitignored), imported by the generated `@astro-slides/slides` manifest, and rendered inside layouts. Components (`<Click>`, layout primitives, icons) are injected via the MDX `components` prop, so authors don't import them. `astroSlides()` now adds `@astrojs/react` + `@astrojs/mdx` itself (integration-adds-integrations).
- **Layouts moved from `set:html` to Astro slots.** All 21 layouts render `<slot>` / `<slot name="right">` etc.; the route places each slot's compiled MDX component into the matching slot. `SlideRecord` (HTML strings) → a manifest of component slots + `totalClicks`.
- **Click resolution is a remark plugin at MDX compile (ADR-0008), in `core`, not the parser.** Because content now flows through MDX, `remark-clicks` walks the MDX AST, assigns steps, rewrites `at`/`to` as string attributes, and injects `export const totalClicks`. The parser's `Slide.clickSteps` stays empty (superseded by the compile-time plan).
- **Click components render statically; the runtime drives reveal.** `<Click>`/`<After>` emit `<span class="as-click" data-click="N">` (React, but SSR'd to static HTML — **zero client JS on slide pages**). The Phase-04 vanilla runtime toggles `.as-click-shown` by `?step`. This is lighter than hydrating each click and reuses the tested step machine.
- **`<Clicks>` splits at parse time, not in the component.** MDX groups adjacent block children unpredictably, so `remark-clicks` wraps each revealable child (grouped by `every`) in a resolved `<Click>` and the component is a pass-through — deterministic numbering. (Wrapping block content in a reveal `<span>` is tolerated; list-item auto-reveal without explicit blocks is a future nicety.)
- **Runtime derives the step total from the DOM** (`max(data-click, data-click-to)`) as a fallback, so clicks step even if the metadata export is absent; the compile-time total (or frontmatter `clicks`) is authoritative when present.
- **`.tsx` components are not in `tsc -b`** (same as `.astro`) — Astro/Vite compile + the build validates them. Adding them to the composite build would fight `rootDir`; deferred.

## Outcome

Delivered the MDX + React foundation **and** the click model on top. Slides compile as Astro-native MDX (temp `.mdx` per slot → manifest → rendered in layouts) with components injected via the `components` prop and React islands available; `remark-clicks` resolves `<Click>`/`<After>`/`<Clicks>` steps at compile time (offsets, ranges, `every`, frontmatter override) and the Phase-04 runtime steps through them via `?step`. Static-rendered (no client JS for clicks). 128 unit tests (remark-clicks resolution, DOM step reveal + ranges, manifest override) + 8 Playwright e2e (incl. click stepping) green. Distilled to [`docs/built/06-click-model.md`](../../docs/built/06-click-model.md). **Closes the MDX-compilation gap** noted after Phase 05.
