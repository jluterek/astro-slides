# Theme tokens

- **Status:** stub (full spec lands in Phase 05)
- **Owner phase:** Phase 05

The CSS custom-property contract that themes set and layouts/components consume. Per ADR-0005, every theme value flows through these tokens.

## Scope

- The full list of `--slide-*` and `--theme-*` custom properties
- Semantic naming conventions
- Light vs dark variant strategy
- How per-slide overrides cascade

## Starting token set (lands in Phase 05)

```css
:root {
  /* Color — semantic */
  --slide-bg: #fff;
  --slide-fg: #111;
  --slide-accent: #4f46e5;
  --slide-muted: #6b7280;
  --slide-link: var(--slide-accent);
  --slide-code-bg: #f3f4f6;
  --slide-code-fg: #111;
  --slide-danger: #dc2626;
  --slide-info: #2563eb;

  /* Typography */
  --slide-font-body: ui-sans-serif, system-ui, sans-serif;
  --slide-font-heading: var(--slide-font-body);
  --slide-font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --slide-font-size-base: 24px;
  --slide-font-size-scale: 1.25;

  /* Spacing — 8-pixel rhythm (WebSlides-inspired) */
  --slide-space-unit: 8px;
  --slide-space-1: calc(var(--slide-space-unit) * 1);
  --slide-space-2: calc(var(--slide-space-unit) * 2);
  /* ... up to --slide-space-12 */

  /* Layout */
  --slide-canvas-width: 1920px;
  --slide-canvas-height: 1080px;
  --slide-padding: var(--slide-space-8);

  /* Transitions */
  --slide-transition-duration: 400ms;
  --slide-transition-easing: cubic-bezier(0.26, 0.86, 0.44, 0.985);
}

@media (prefers-color-scheme: dark) {
  :root {
    --slide-bg: #0a0a0a;
    --slide-fg: #fafafa;
    /* ... */
  }
}
```

Per-slide override:
```yaml
---
layout: cover
class: themed-warm
---
<!-- inside the layout, --slide-bg can be set via class .themed-warm -->
```

## Naming conventions

- All tokens prefixed `--slide-` so we never collide with the user's app CSS.
- Semantic names over physical ones (`--slide-accent`, not `--slide-blue`).
- Color tokens have implicit dark variants under `@media (prefers-color-scheme: dark)`.

## Open questions

- Do we use `oklch()` for color so palette generation is easier? Browser support is good in 2026.
- Token names for the `.flexblock` family — `--slide-block-bg`, `--slide-block-border`?
- Whether to expose a "compatibility" alias set for Slidev (`--slidev-*`) so Slidev themes work.

## Change history

- 2026-06-30 — stub (Phase 01 prep). Full token set finalized in Phase 05.
