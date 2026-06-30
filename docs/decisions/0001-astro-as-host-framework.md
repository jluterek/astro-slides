# 0001. Astro as the host framework

- **Status:** accepted
- **Date:** 2026-06-30

## Context

astro-slides needs a web framework to host the deck runtime, dev server, per-slide static pages, the build pipeline, and the optional SPA mode. Candidates considered:

- **Astro** — content-first, islands architecture, native MDX, content collections, native View Transitions integration, static-first with SSR support.
- **Next.js** — strong React story but app-router complexity for a non-app product; bundle is heavy for static decks.
- **Vite-only** — most flexible, no opinions, but we'd own every piece of routing, layout, and SSG ourselves.
- **Vue + Vite (Slidev's choice)** — proven for this product class, but Vue-locks the component model; we want React/Solid/Vue interop.
- **Gatsby (MDX Deck's choice)** — effectively abandoned, ecosystem cost too high.

## Decision

Use Astro as the host framework.

## Consequences

- Native MDX support means our parser plugins (slot sugar, frontmatter merge, snippet imports, click-step extraction) plug directly into Astro's existing remark/rehype pipeline.
- Astro **content collections** give us a slide manifest with typed access for free — slide metadata is queryable at build time.
- The **islands architecture** lets each slide render as static HTML by default, hydrating only the interactive components. Most slides ship zero JS.
- **View Transitions** are first-class in Astro, matching ADR-0006.
- We can host React, Vue, Solid, Svelte, Preact components as islands — author choice, no framework lock-in inside slides.
- Trade-off: deep custom Vite plugin work must go through Astro's integration API (`AstroIntegration`), which is an extra layer compared to a pure Vite-only project.
- Trade-off: we inherit Astro's release cadence and any breaking changes between major versions. Mitigated by pinning major in catalog versions.
