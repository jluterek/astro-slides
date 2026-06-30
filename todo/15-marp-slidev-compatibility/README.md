---
title: Phase 15 — Marp and Slidev compatibility
status: pending
started:
ended:
---

## Goal

Deliver the second half of ADR-0002: existing Marp and Slidev decks render in astro-slides with as few changes as possible. Compatibility is bounded by feature overlap — features that don't translate are documented as known gaps, not silently failing.

## Exit criteria

- [ ] Marp directives parsed: global (`marp: true`, `theme: <name>`, `paginate: true`), local-inherited, local-scoped (`<!-- _class: -->`, `<!-- _backgroundColor: -->`, etc.).
- [ ] Marp's three built-in themes (`default`, `gaia`, `uncover`) ported to astro-slides themes under `themes/marp-*/`.
- [ ] Marp's image-syntax shorthand (`![bg](url)`, `![bg cover](url)`, `![w:200](url)`, etc.) translated to our equivalents.
- [ ] Slidev's component shims: `<Tweet>`, `<Youtube>`, `<Toc>`, `<VDrag>`, `<AutoFitText>`, `<LightOrDark>` — React/Astro implementations matching Slidev's API.
- [ ] Slidev's `v-click` / `v-after` / `v-clicks` directives accepted as aliases of our `<Click>` / `<After>` / `<Clicks>` components (via remark plugin that rewrites them).
- [ ] Slidev's `<<<` snippet import, `::name::` slot sugar, `src:` slide import — already implemented in Phase 02 — confirmed to behave identically for round-trip tests.
- [ ] A test corpus of upstream sample decks renders correctly (or fails loudly with clear messages): Marp examples, Slidev demo, a few community decks.
- [ ] `docs/built/15-marp-slidev-compatibility.md` lists known incompatibilities explicitly (e.g., Slidev's `{monaco}` fence info if we don't ship Monaco).

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

## Outcome

_Fill in when the phase closes._
