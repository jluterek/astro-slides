---
title: Phase 06 — Click model
status: pending
started:
ended:
---

## Goal

Implement parse-time click resolution per ADR-0008. Each `<Click>`, `<After>`, `<Clicks>` invocation is identified by a remark plugin during MDX compile, assigned a deterministic step index, and the per-slide total is emitted as static metadata. The runtime is purely a consumer of the pre-computed plan.

## Exit criteria

- [ ] `<Click at="…">`, `<After>`, `<Clicks every={N}>` components in `packages/client/` implemented.
- [ ] Remark plugin walks the slide MDX AST, finds click components, assigns step indices, and writes the per-slide step list and total to the slide's frontmatter sidecar module.
- [ ] Relative offsets (`at="+1"`, `at="+0"` = `<After>`) and ranges (`at="[2,5]"`) supported and resolved at parse time.
- [ ] Frontmatter `clicks: N` override accepted; the AST step plan is preserved regardless.
- [ ] Runtime reads `?step=N` from the URL (nanostore-backed), toggles class names on click targets.
- [ ] Click steps animate in via CSS transitions (`fade`, `up`, `down`, `left`, `right`, `scale`, composable modifiers via class composition).
- [ ] `next()` / `prev()` walk clicks before changing slides (integrated with Phase 04 navigation).
- [ ] Tests: parser correctness (counts, ordering, ranges), runtime stepping, URL state survives reload, frontmatter override behavior.

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

## Outcome

_Fill in when the phase closes._
