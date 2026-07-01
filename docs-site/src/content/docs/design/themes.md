---
title: Themes
description: Using a bundled theme and authoring your own from CSS tokens.
---

A **theme** controls how a deck looks — colors, type, spacing, block styling. In
astro-slides a theme is nothing more than a folder of plain CSS that sets a
contract of `--slide-*` custom properties. Layouts and primitives read only those
tokens, never hard-coded values, so swapping the theme restyles the whole deck.

There is no styling-system runtime (no styled-components, no theme-ui) — see
[ADR-0005: Themes as folders](https://github.com/jluterek/astro-slides/blob/main/docs/decisions/0005-themes-as-folders.md).

## Part 1 — Using a theme

### Opt in with `theme:`

Choose a bundled theme with the `theme:` **headmatter** key — the first frontmatter
block of the deck. It applies to the whole deck.

```mdx
---
title: Cosmic Theme Showcase
theme: cosmic
---

# Cosmic

The flagship theme for astro-slides.
```

If you omit `theme:`, the deck uses **`starter`**, the default.

### Bundled themes

| Theme | What it is |
| --- | --- |
| `starter` | The default. Deliberately plain — a neutral oklch palette with automatic light/dark, so layout correctness is visible without visual identity. |
| `cosmic` | The flagship. Landing-page polish, a deep-space oklch palette, self-hosted Space Grotesk + Inter, an 8px rhythm, FlexBlock cards, and a pure-CSS starfield. Dark-primary with a light variant for projectors. |
| `marp-default` | Marp's default theme, ported. |
| `marp-gaia` | Marp's Gaia theme, ported. |
| `marp-uncover` | Marp's Uncover theme, ported. |

:::note
Under the hood the deck route stamps `data-theme="<name>"` on the deck root and each
non-default theme scopes its tokens under a `[data-theme="<name>"]` selector, while
`starter` sets tokens on `:root`. That's why opting a deck into `cosmic` restyles
only that deck — everything else keeps the `:root` starter defaults. See
[Authoring](#part-2--authoring-a-theme) below.
:::

### Light and dark

Color scheme is a separate axis from the theme. Set it with the `colorSchema`
headmatter key:

```mdx
---
theme: cosmic
colorSchema: dark
---
```

| `colorSchema` | Behavior |
| --- | --- |
| `auto` (default) | Follows the OS `prefers-color-scheme`. |
| `light` | Forces light regardless of OS. |
| `dark` | Forces dark regardless of OS. |
| `all` | Ships both variants and defers to the OS. |

The route writes this to a `data-color-scheme` attribute on `<html>`; themes provide
their dark tokens under `@media (prefers-color-scheme: dark)` and a forced
`[data-color-scheme="dark"]` selector, so all tokens flip together.

### Per-slide overrides

You don't need a whole theme to tweak one slide. Two per-slide frontmatter keys help:

- `class:` adds a class to the slide `<section>`; a theme/deck class can then set
  tokens on it (e.g. `.themed-accent { --slide-bg: var(--slide-accent); }`).
- `background:` sets a cover image (path/URL) or any CSS color/gradient.

```mdx
---
layout: end
class: themed-accent
background: linear-gradient(135deg, #1a1a2e, #16213e)
---

## Thanks
```

Because tokens are inherited custom properties, an inline `style` that sets a
`--slide-*` value also cascades naturally to that slide's subtree.

## Part 2 — Authoring a theme

A theme is a folder whose `theme.css` sets the `--slide-*` tokens. Copy
`packages/client/src/themes/starter/theme.css` as your starting point and change the
values — you never touch layout CSS.

### Scope your tokens

`starter` (the global default) sets its tokens on `:root`. **Every other theme scopes
its tokens under a bare `[data-theme="<name>"]` selector**, where `<name>` matches the
`theme:` a deck opts in with. The selector is bare (not `.as-deck[data-theme=…]`) so
it matches on both the live deck route and the print route; nearest-ancestor
resolution means an opted-in deck's subtree overrides the `:root` defaults.

```css
/* packages/client/src/themes/aurora/theme.css */
[data-theme="aurora"] {
  --slide-bg: oklch(18% 0.03 250);
  --slide-fg: oklch(96% 0.01 250);
  --slide-accent: oklch(74% 0.16 190);
  /* …the rest of the token contract… */
}
```

### The token contract

These are the categories a theme sets. The canonical, commented source is
`packages/client/src/themes/starter/theme.css`.

**Color (semantic, not physical):**

```css
--slide-bg;        --slide-fg;          /* slide background / text */
--slide-accent;    --slide-accent-fg;   /* accent + text on accent */
--slide-muted;     --slide-border;      /* de-emphasized text; hairlines */
--slide-surface;   --slide-link;        /* raised surfaces; links */
--slide-code-bg;   --slide-code-fg;     /* code block / inline */
--slide-danger;    --slide-info;        /* status colors */
```

**Block family (FlexBlock cells, cards):**

```css
--slide-block-bg;
--slide-block-border;
--slide-block-radius;
```

**Typography:**

```css
--slide-font-body;
--slide-font-heading;
--slide-font-mono;
--slide-font-size-base;      /* e.g. 24px */
--slide-font-size-scale;     /* modular ratio, e.g. 1.25 */
--slide-line-height;
--slide-heading-line-height;
--slide-heading-weight;
```

**Type scale** — a derived modular scale (`base × scaleⁿ`):

```css
--slide-text-sm;  --slide-text-md;  --slide-text-lg;
--slide-text-xl;  --slide-text-2xl; --slide-text-3xl; --slide-text-4xl;
```

**Spacing (8px rhythm):**

```css
--slide-space-unit;   /* 8px */
--slide-space-1;  --slide-space-2;  --slide-space-3;  --slide-space-4;
--slide-space-6;  --slide-space-8;  --slide-space-12;
```

**Layout:**

```css
--slide-canvas-width;    /* e.g. 1920px */
--slide-canvas-height;   /* e.g. 1080px */
--slide-padding;         /* owned by layouts; full-bleed layouts set it to 0 */
--slide-content-max;
```

**Transitions:**

```css
--slide-transition-duration;   /* e.g. 400ms */
--slide-transition-easing;
```

:::tip
Use **semantic** names, not physical ones (`--slide-accent`, never `--slide-blue`),
and prefer `oklch()` for color — it's perceptually uniform and universally supported
in current browsers. `starter` and `cosmic` both rely on it, so there's no hex
fallback in the bundled themes.
:::

### Dark tokens

Provide the dark set twice — once for OS preference, once forced — so both `auto` and
an explicit `colorSchema: dark` work:

```css
@media (prefers-color-scheme: dark) {
  [data-theme="aurora"]:not([data-color-scheme="light"]) {
    --slide-bg: oklch(18% 0.03 250);
    /* …dark overrides… */
  }
}

[data-theme="aurora"][data-color-scheme="dark"] {
  --slide-bg: oklch(18% 0.03 250);
  /* …dark overrides… */
}
```

### Self-hosted fonts

Import web fonts **from the theme CSS itself**, not from a route — the theme owns its
font dependencies. Cosmic self-hosts its families via Fontsource this way:

```css
@import "@fontsource-variable/inter/wght.css";
@import "@fontsource/space-grotesk/700.css";

[data-theme="cosmic"] {
  --slide-font-body: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --slide-font-heading: "Space Grotesk", "Inter Variable", ui-sans-serif, sans-serif;
}
```

The `@font-face` declarations are cheap; the woff2 payloads only download when a
rendered deck actually uses those families.

:::note
Any visual polish beyond tokens (gradient-clipped headings, the starfield, card
shadows) is just extra CSS scoped under `[data-theme="cosmic"]` in the same file — it
still reads token values so light/dark keep working. Read `cosmic/theme.css` for a
full worked example.
:::

Layouts and primitives that consume these tokens are documented on the
[Layouts](/design/layouts/) page.

## Source

- `packages/client/src/themes/starter/theme.css` — the token contract in practice (the default).
- `packages/client/src/themes/cosmic/theme.css` — the flagship theme (tokens + visual pass + fonts).
- `packages/client/src/themes/marp-default/`, `marp-gaia/`, `marp-uncover/` — the ported Marp themes.
- `packages/client/src/styles/base.css` — bridges theme tokens into runtime vars (`--as-bg` / `--as-fg`).
- `packages/core/src/routes/slide.astro` / `print.astro` — `data-theme` / `data-color-scheme` stamping and theme imports.
- `packages/types/src/frontmatter.ts` — the `theme` / `colorSchema` / `class` / `background` fields.
- `docs/architecture/theme-tokens.md` — the stable token spec.
- `docs/built/05-themes-and-layouts.md`, `docs/built/16-default-theme.md` — how the theme system and Cosmic were built.
- `examples/minimal/content/decks/cosmic/slides.mdx` — a real `theme: cosmic` deck.
