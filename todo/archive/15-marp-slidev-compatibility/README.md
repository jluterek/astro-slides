---
title: Phase 15 — Marp and Slidev compatibility
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Deliver the second half of ADR-0002: existing Marp and Slidev decks render in astro-slides with as few changes as possible. Compatibility is bounded by feature overlap — features that don't translate are documented as known gaps, not silently failing.

## Exit criteria

- [x] Marp directives parsed: global (`marp: true`, `theme: <name>`, `paginate: true` passes through), local-inherited, local-scoped (`_class`, `_backgroundColor` → `background`) — the Phase 02 `extractMarpDirectives`, confirmed by `marp.test.ts`. Visible pagination rendering is a documented gap.
- [x] Marp's three built-in themes (`default`, `gaia`, `uncover`) ported under `packages/client/src/themes/marp-*/` as `--slide-*` token sets. Shipped as artifacts; live `theme:`-by-name application is the Phase 05 follow-up landing in Phase 16 (documented gap).
- [x] Marp image shorthand (`![bg](url)`, `![bg cover](url)`, `![w:200 h:120](url)`) translated → `background` / sized `<img>` (`extractMarpImages`, marp-mode only).
- [x] Slidev component shims: `<Tweet>`, `<Youtube>`, `<Toc>`, `<VDrag>`, `<AutoFitText>`, `<LightOrDark>` as Astro components (with documented simplifications — Tweet link-card, VDrag static, Toc prop-driven).
- [x] Slidev `v-click` / `v-after` / `v-clicks` accepted as aliases of `<Click>` / `<After>` / `<Clicks>` — a remark plugin rewriting both the element and attribute forms before click resolution.
- [x] `<<<` snippet import, `::name::` slot sugar, `src:` slide import (Phase 02) — confirmed unchanged by the existing `snippets.test.ts` / `slots.test.ts` / `imports.test.ts`.
- [~] Test corpus: a `compat` deck (`examples/minimal/content/decks/compat`) renders `v-click` + shims in a real build (`e2e/compat.spec.ts`); Marp translation is unit-tested. Importing full upstream Marp/Slidev sample decks wholesale was not done (they mix in unsupported Vue/Monaco syntax — the documented v1 limit).
- [x] `docs/built/15-marp-slidev-compatibility.md` lists the known incompatibilities explicitly.

## Locked decisions

- **Compatibility goal:** parser-level read of both formats. Rendering matches semantics, not pixel-perfect appearance.
- **Marp themes:** ship as folder themes at `themes/marp-default/`, `themes/marp-gaia/`, `themes/marp-uncover/`. Authors opt in via `theme: marp-default`.
- **Slidev directive aliases:** implemented as a remark plugin that rewrites `<v-click>` JSX to `<Click>` etc. at MDX compile time.
- **Slidev component shims** live in `packages/client/src/compat/slidev/`. They are auto-imported when `compat: slidev` is in headmatter.
- **Marp `bg` image syntax:** transformed to our `background:` frontmatter at parse time.
- **No translation of Vue-specific syntax** (`<template>`, `<script setup>`) — Slidev decks using these need manual conversion to MDX. Documented as the v1 limit.

## Tasks (planned)

- Marp directive parser (translate to our frontmatter / class system)
- Port Marp's three built-in themes (one per theme — parallel-friendly)
- Marp image-syntax handling (`![bg]`, `![w:N]`, etc.)
- Slidev component shims — **one task per component (six components):**
  - `<Tweet>`, `<Youtube>`, `<Toc>`, `<VDrag>`, `<AutoFitText>`, `<LightOrDark>`
- Slidev directive aliases (remark plugin)
- Compatibility test corpus (sample decks) + visual snapshots
- Gap documentation (`docs/built/15-marp-slidev-compatibility.md`)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Marp directive parser + Slidev directive aliases | parallel |
| **Theme ports (3) + Slidev component shims (6)** | **highly parallel** — 9 independent tasks. ~3 agents handling ~3 each. |
| Test corpus assembly | parallel with implementations |
| Gap documentation | final, after corpus runs |

## Dependencies

- Phase 02 (parser — extends with directive support)
- Phase 05 (themes/layouts — Marp themes ported here)
- Phase 06 (click model — Slidev directive aliases)
- Phase 08 (code rendering — fence-info compatibility)

## Risks

- **Slidev's `<v-click>` is a directive on any element; ours is a component wrapping children.** Most usages convert cleanly. The edge case is `v-click="3"` on a leaf element with no children — wrap in a fragment. Document.
- **Marp's `paginate: true` adds page numbers via a specific layout.** Implement as a layout override that adds a slide-number element.
- **Marp's `_class:` directive applies CSS classes scoped to a single slide.** Our equivalent is per-slide `class:` frontmatter — semantically identical.
- **Test corpus stability:** upstream decks change. Snapshot the SHA when adding to the corpus.

## Notes

We are NOT claiming Marp/Slidev decks can be renamed to astro-slides without reading the readme — there will be edge cases. The promise is "most decks Just Work, the rest fail loudly with clear messages."

Reference: `docs/reference-applications/marp.md` § *Features* for the directive list, `docs/reference-applications/slidev.md` § *Features* for the component surface to shim.

## Notes / decisions made while building

- **`v-click` aliasing is a remark pass before remark-clicks** — Slidev directives become native `<Click>`/`<After>`/`<Clicks>` and share one numbering path. Both element (`<v-click>`) and attribute (`<div v-click>`) forms handled.
- **Marp image shorthand folded into `applyMarp`** (marp-mode only), so MDX decks aren't affected.
- **Shims registered in BOTH `slide.astro` and `print.astro`** — each route has its own `COMPONENTS` map; a shim missing from print.astro throws "component not defined" only when the build prerenders `/print/<deck>` (cost real debugging). They're kept in sync with a comment.
- **Shims live flat in `packages/client/components/`** (where the primitives are) — a nested `src/compat/` subpath did not resolve as MDX components.
- **Theme-switching-by-name is not wired** (Phase 05 follow-up) — Marp themes shipped as artifacts; they apply once Phase 16 wires `theme:` resolution.

## Outcome

Delivered parser-level Marp + Slidev compatibility: a remark plugin aliasing the `v-click` family (element + attribute forms) to our click components before resolution; Marp image shorthand (`![bg]` → background, `![w:N]` → sized `<img>`) in the marp-mode parse path; six Slidev component shims (Youtube, AutoFitText, LightOrDark, Tweet, VDrag, Toc) registered in both deck routes; and three Marp theme token-sets shipped as artifacts. A `compat` corpus deck exercises the aliases + shims in a real build (e2e), and Marp translation is unit-tested. Descoped/documented: live `theme:`-by-name application (Phase 16), interactive VDrag, live Tweet embeds, `v-clicks`-per-list-item, and Vue/`{monaco}` syntax (the v1 limit per ADR-0002). **298 unit tests** (+15) and **31 e2e** (+3) green; typecheck + Biome clean. Distilled to `docs/built/15-marp-slidev-compatibility.md`; merged via PR #15.
