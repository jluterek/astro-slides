# 0008. Click steps resolved at parse time, not mount time

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Element step-reveals (the "click N times to walk through bullets" pattern) need a click counter per slide. Two implementation approaches in the reference field:

- **Mount-time discovery** (Slidev) — each `v-click` directive calls `register(el, info)` during the mounted hook. The slide's total click count is `max(maxMap.values())`. Works, but lazy-mounted elements (inside `v-if`, conditional renders) can change the total *mid-presentation*. Frontmatter `clicks:` is the manual override.
- **Runtime DOM walk** (Spectacle) — after mount, walk the DOM for `<Appear>` placeholders and assign sequential indices. Same problem with conditional renders.
- **Parse-time resolution** (no prior art for slides; standard for compilers) — at MDX/Markdown compile time, walk the AST, identify every `<Click>`, `<After>`, `<Clicks>` invocation, assign a deterministic step index, and emit the per-slide total as static metadata. The runtime is purely consumer of pre-computed numbers.

The frameworks doing mount-time discovery were authored before Astro and content collections existed; they didn't have the compile-time slot. We do.

## Decision

Resolve click steps at MDX compile time. The slide AST node carries:

- `clickSteps: ClickStep[]` — ordered list of click positions with the element selector or component reference at each step.
- `totalClicks: number` — the computed total.
- `frontmatter.clicks` — author override; if set, replaces the computed total (but the AST still describes the per-step elements).

Implementation: a remark/rehype plugin runs as part of the MDX pipeline, walks for `<Click at="…">` / `<Clicks>` / `<After>` nodes, assigns step indices, and writes the metadata to the slide's frontmatter sidecar module.

Relative references (`at="+1"`, `at="[2,5]"`) resolve at parse time using the cumulative step position from preceding click components in the same slide.

## Consequences

- Presenter view, exports (PDF with `--with-clicks`, PNG per step, PPTX per step), MCP tools, and the runtime all see the same plan. No drift.
- Total clicks per slide are static — knowable from the slide manifest without rendering. Tooling can show "10 slides, 47 click steps" before running anything.
- Conditional renders that produce different click counts (e.g. data-dependent content) are **not supported**. Authors must make click steps statically discoverable in the source.
- Trade-off: a slide that *needed* dynamic click resolution loses that capability. We consider this an acceptable simplification — the cases we've seen are presenter-mode concerns (do I show this bullet?), not authoring concerns.
- Trade-off: the parser has more work to do. Mitigated by Astro's content collection caching and Vite's HMR.
