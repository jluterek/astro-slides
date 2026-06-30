---
title: Phase 09 — Math and diagrams
status: pending
started:
ended:
---

## Goal

Add KaTeX-rendered math, Mermaid diagrams, and PlantUML diagrams. All three plug into the same click-step infrastructure so step-by-step reveals work for math derivations and diagram building.

## Exit criteria

- [ ] Inline math (`$x$`) and block math (`$$ ... $$`) render via KaTeX, with conditional bundle inclusion (skip KaTeX when no math is detected — leverages parser feature detection from Phase 02).
- [ ] Block math supports per-click reveal via `$$ {1|3|all}\n…\n$$` syntax.
- [ ] Mermaid code blocks (` ```mermaid `) render as SVG inside a Shadow DOM (CSS isolation).
- [ ] Mermaid block options accepted via YAML in the fence info (`theme: neutral, scale: 0.8`).
- [ ] PlantUML code blocks render via a configurable server endpoint (default `https://www.plantuml.com/plantuml`).
- [ ] All three respect the active color scheme (dark/light) and update on theme switch.
- [ ] Tests cover: math click-step rendering, Mermaid SVG isolation, PlantUML encoding, conditional bundle inclusion.

## Locked decisions

- **Math engine:** `katex` v0.17+. Self-host fonts (no Google Fonts CDN).
- **Math markup parser:** port the markdown-it-katex algorithm into a remark plugin, mirroring Slidev's `packages/slidev/node/syntax/katex.ts`.
- **Mermaid:** `mermaid` v11+. Mount inside a Shadow DOM via `renderMermaid` helper.
- **PlantUML:** `plantuml-encoder` for encoding, configurable server URL (default public; can be self-hosted).
- **Conditional bundles:** parser's feature detection emits `detectedFeatures.katex|mermaid|plantuml` per slide. Vite plugins use the flags to tree-shake.
- **Click integration:** KaTeX block wrapper and Mermaid component register their reveal steps with the Phase 06 click context.

## Tasks (planned)

- KaTeX remark plugin (port from `markdown-it-katex`)
- `<KaTexBlockWrapper>` component (click-step reveal for math)
- Mermaid integration (`renderMermaid` helper, Shadow DOM mount)
- `<Mermaid>` component
- PlantUML integration (`plantuml-encoder` + configurable server URL)
- `<PlantUml>` component
- Conditional bundle inclusion (driven by feature detection from Phase 02)
- Tests across all three with click-step variants

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| All three integrations | **fully parallel** — KaTeX, Mermaid, PlantUML are independent. Three parallel agents. |
| Conditional bundle inclusion | after all three done (verifies tree-shaking) |
| Tests | parallel with implementations |

## Dependencies

- Phase 02 (parser — feature detection and fence handling)
- Phase 06 (click model — math and diagram reveals register clicks)

## Risks

- **Mermaid CSS bleed:** Mermaid injects its own CSS. Shadow DOM mount is the answer; verify it doesn't break interactivity (clicks inside Mermaid SVG).
- **PlantUML server availability:** default public server may rate-limit. Document self-hosting; consider caching encoded URLs.
- **KaTeX font subsetting:** the full font set is large. Consider subsetting at build time for production decks.

## Notes

Reference: `docs/reference-applications/slidev.md` § *Math (KaTeX)* and *Diagrams (Mermaid, PlantUML)* — implementation shapes are usable as-is; we just wrap in React/Astro instead of Vue.

MathJax is **not** in v1. KaTeX is faster and sufficient. Users who need MathJax can author with raw HTML and a custom remark plugin in `setup/`.

## Outcome

_Fill in when the phase closes._
