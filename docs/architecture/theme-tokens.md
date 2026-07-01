# Theme tokens

- **Status:** stable
- **Owner phase:** Phase 05

The CSS custom-property contract that themes set and layouts/components consume. Per ADR-0005, every theme value flows through these tokens — a theme is a folder of CSS that sets `--slide-*` properties; layouts and primitives read only those, never hard-coded values.

## Naming conventions

- All tokens are prefixed `--slide-*` (never collide with the user's app CSS).
- **Semantic** names over physical ones (`--slide-accent`, not `--slide-blue`).
- Colors use `oklch()` (well-supported in 2026). A theme may ship `#rrggbb` fallbacks via a PostCSS plugin if it targets old engines.
- Color tokens have implicit dark variants (see *Dark/light* below).

## Token set

Canonical source: `packages/client/src/themes/starter/theme.css`.

### Color (semantic)

| Token | Role |
| --- | --- |
| `--slide-bg` / `--slide-fg` | Slide background / foreground text |
| `--slide-accent` / `--slide-accent-fg` | Accent + text on accent |
| `--slide-muted` | De-emphasized text |
| `--slide-border` | Hairlines, table/cell borders |
| `--slide-surface` | Raised surfaces (cards, code) |
| `--slide-link` | Links (defaults to accent) |
| `--slide-code-bg` / `--slide-code-fg` | Code block/inline |
| `--slide-danger` / `--slide-info` | Status colors |
| `--slide-block-bg` / `--slide-block-border` / `--slide-block-radius` | FlexBlock cells, cards |

### Typography

`--slide-font-body`, `--slide-font-heading`, `--slide-font-mono`, `--slide-font-size-base`, `--slide-font-size-scale`, `--slide-line-height`, `--slide-heading-line-height`, `--slide-heading-weight`, and the derived modular scale `--slide-text-sm … --slide-text-4xl` (base × scaleⁿ).

### Spacing / layout / motion

`--slide-space-unit` (8px) and `--slide-space-1 … 12`; `--slide-canvas-width` / `--slide-canvas-height`; `--slide-padding` (owned by the layout, so full-bleed layouts set it to 0); `--slide-content-max`; `--slide-transition-duration` / `--slide-transition-easing`.

### Runtime bridge

`base.css` maps theme tokens into the runtime's structural vars: `--as-bg: var(--slide-bg)` and `--as-fg: var(--slide-fg)`, so the deck background follows the theme.

## Dark / light

Applied on the root (`:root`) so all tokens flip together:

- **auto** (default) — OS preference: `@media (prefers-color-scheme: dark) { :root:not([data-color-scheme="light"]) { … } }`.
- **forced** — the route sets `data-color-scheme="light|dark"` on `<html>` from headmatter `colorSchema`; `:root[data-color-scheme="dark"]` forces the dark set regardless of OS.
- `colorSchema: "all"` ships both and defers to the OS (no attribute).

## Per-slide overrides

- Frontmatter `class` → applied to the slide `<section>` (`.as-slide`); a deck/theme class can then set tokens (e.g. `.themed-accent { --slide-bg: var(--slide-accent) }`).
- Frontmatter `background` → cover image (path/URL) or CSS color/gradient, set as inline `style` on the section.
- Inline token overrides via `style` cascade naturally (tokens are inherited custom properties).

## Change history

- 2026-06-30 — **stable.** Full token set shipped with the starter theme (Phase 05). Superseded the Phase 01 stub.
