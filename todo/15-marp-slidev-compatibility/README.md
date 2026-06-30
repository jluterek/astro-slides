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
- [ ] Marp's three built-in themes (`default`, `gaia`, `uncover`) ported to astro-slides themes.
- [ ] Marp's image-syntax shorthand (`![bg](url)`, `![bg cover](url)`, etc.) translated.
- [ ] Slidev's component shims: `<Tweet>`, `<Youtube>`, `<Toc>`, `<VDrag>`, `<AutoFitText>`, `<LightOrDark>` — React/Astro implementations matching Slidev's API.
- [ ] Slidev's `v-click` / `v-after` / `v-clicks` directives accepted as aliases of our `<Click>` / `<After>` / `<Clicks>` components.
- [ ] Slidev's `<<<` snippet import, `::name::` slot sugar, `src:` slide import — already implemented in Phase 02 — confirmed to behave identically for round-trip tests.
- [ ] A library of upstream sample decks (Marp examples + Slidev demo + a few community decks) renders correctly. Differences documented per deck.
- [ ] `docs/built/15-marp-slidev-compatibility.md` lists known incompatibilities (e.g., Slidev's Monaco fence info if we don't ship Monaco).

## Planned tasks

- Marp directive parser (translate to our frontmatter / class system)
- Port Marp's three built-in themes
- Marp image-syntax handling
- Slidev component shims (one task per component)
- Slidev directive aliases
- Compatibility test corpus (sample decks)
- Gap documentation

## Dependencies

- Phase 02 (parser — directive parsing extends the existing pipeline)
- Phase 05 (themes/layouts — Marp themes ported here)
- Phase 06 (click model — Slidev directive aliases)
- Phase 08 (code rendering — fence-info compatibility)

## Notes

We are NOT claiming Marp/Slidev are renamable to astro-slides without reading the readme — there will be edge cases. The promise is "most decks Just Work, the rest fail loudly with clear messages."

Reference: `docs/reference-applications/marp.md` § *Features* for the directive list, `docs/reference-applications/slidev.md` § *Features* for the component surface to shim.

## Outcome

_Fill in when the phase closes._
