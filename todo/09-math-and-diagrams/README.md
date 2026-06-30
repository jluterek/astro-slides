---
title: Phase 09 — Math and diagrams
status: pending
started:
ended:
---

## Goal

Add KaTeX-rendered math, Mermaid diagrams, and PlantUML diagrams. All three plug into the same click-step infrastructure so step-by-step reveals work for math derivations and diagram building.

## Exit criteria

- [ ] Inline math (`$x$`) and block math (`$$ ... $$`) render via KaTeX, with conditional bundle inclusion (skip KaTeX when no math is detected — see parser's feature detection from Phase 02).
- [ ] Block math supports per-click reveal via `$$ {1|3|all}\n…\n$$` syntax.
- [ ] Mermaid code blocks (` ```mermaid `) render as SVG inside a Shadow DOM (CSS isolation).
- [ ] Mermaid block options accepted via YAML in the fence info (`theme: neutral, scale: 0.8`).
- [ ] PlantUML code blocks render via a configurable server endpoint (default `https://www.plantuml.com/plantuml`).
- [ ] All three respect the active color scheme (dark/light) and update on theme switch.
- [ ] Tests cover: math click-step rendering, Mermaid SVG isolation, PlantUML encoding, conditional bundle inclusion.

## Planned tasks

- KaTeX markdown-it/remark plugin (port from `markdown-it-katex`, mirror Slidev's `packages/slidev/node/syntax/katex.ts`)
- `<KaTexBlockWrapper>` component (click-step reveal for math)
- Mermaid integration (`renderMermaid` helper, Shadow DOM mount)
- PlantUML integration (`plantuml-encoder` + configurable server URL)
- Conditional bundle inclusion (driven by feature detection from Phase 02)
- Tests across all three with click-step variants

## Dependencies

- Phase 02 (parser — feature detection and fence handling)
- Phase 06 (click model — math and diagram reveals register clicks)

## Notes

Reference: `docs/reference-applications/slidev.md` § *Math (KaTeX)* and *Diagrams (Mermaid, PlantUML)* — implementation shapes are usable as-is, just need React/Astro wrappers.

MathJax remains an option for users who specifically need it (LaTeX-purist workflows), but KaTeX is the default — faster, smaller, no font fetching when fonts are self-hosted.

## Outcome

_Fill in when the phase closes._
