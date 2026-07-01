---
title: Phase 09 — Math and diagrams
status: done
started: 2026-07-01
ended: 2026-07-01
---

## Goal

Add KaTeX-rendered math, Mermaid diagrams, and PlantUML diagrams. All three plug into the same click-step infrastructure so step-by-step reveals work for math derivations and diagram building.

## Exit criteria

- [x] Inline math (`$x$`) and block math (`$$ ... $$`) render via KaTeX at build time, with conditional CSS inclusion (KaTeX stylesheet linked only when `deck.features.katex`).
- [x] Block math supports per-click reveal via `$$ {1|3|all}` syntax (each `\\`-row is a step, wired to the click model).
- [x] Mermaid code blocks (` ```mermaid `) render as SVG inside a Shadow DOM (CSS isolation), lazily loaded (code-split).
- [x] Mermaid block options accepted via the fence info (`theme: neutral, scale: 0.8`).
- [x] PlantUML code blocks render via a configurable server endpoint (default `https://www.plantuml.com/plantuml`, `plantumlServer` option).
- [x] KaTeX/Mermaid follow the active color scheme; Mermaid re-renders on theme switch. (PlantUML scheme response is server-limited — documented.)
- [x] Tests cover math + stepped-math rendering, Mermaid SVG isolation, PlantUML encoding, and conditional inclusion.

> **Deviation from plan:** the "port markdown-it-katex" approach is impossible under MDX
> (`{` in `e^{i\pi}` is parsed as a JS expression before any remark plugin runs). Uses
> **`remark-math`** for delimiter tokenization, then our `remark-katex` renders the nodes.

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

Shipped. Build-time KaTeX (inline + block + `$$ {1|3}` stepped rows wired to the click
model) via `remark-math` (delimiter tokenization, essential under MDX) + our `remark-katex`;
KaTeX CSS linked conditionally via `deck.features.katex`. Mermaid rendered client-side —
lazily imported (code-split) only when present, mounted in a Shadow DOM, scheme-aware.
PlantUML encoded at build time to a configurable-server `<img>`. Shared `click-total.ts` lets
math + code cooperate on `totalClicks`. 181 unit + 17 e2e green; demo grew to 21 slides.
Distilled → `docs/built/09-math-and-diagrams.md`.
