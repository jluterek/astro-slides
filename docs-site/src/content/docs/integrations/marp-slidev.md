---
title: Marp & Slidev compatibility
description: Render existing Marp and Slidev decks in astro-slides with few changes — v-click directives, Marp image shorthand, component shims, and ported themes.
---

astro-slides renders many existing **Marp** and **Slidev** decks with little to no editing. Compatibility is handled at the **parser level**: Slidev directives and Marp shorthand are rewritten into astro-slides' native model before rendering, so they share the same code path — and the same semantics — as decks authored natively.

:::note[Semantics, not pixels]
Compatibility targets **meaning, not pixel-perfect appearance**. A Slidev `v-click` reveals at the same step it would in Slidev; a Marp `![bg]` becomes the slide background. Fonts, spacing, and exact visual styling come from astro-slides themes, not the source framework. Anything that doesn't translate is documented below rather than silently broken.
:::

## Slidev: `v-click` directives

Slidev's click directives are rewritten to astro-slides' native `<Click>` / `<After>` / `<Clicks>` components *before* click numbering runs, so they get the exact same step semantics as native reveals. Both the **element form** and the **attribute form** are supported.

```md
<!-- Element form -->
<v-click>Revealed on the first click</v-click>
<v-after>Revealed with the previous step</v-after>

<v-clicks>

- These list items
- reveal together

</v-clicks>

<!-- A value moves to `at` -->
<v-click="3">Revealed on click 3</v-click>
```

The **attribute form** wraps any element it's placed on:

```md
<!-- v-click="+1" becomes <Click at="+1"> around this element -->
<div v-click="+1">Relative step</div>
```

| Slidev | Maps to |
| --- | --- |
| `<v-click>` / `v-click` attr | `<Click>` |
| `<v-after>` / `v-after` attr | `<After>` |
| `<v-clicks>` / `v-clicks` attr | `<Clicks>` |

:::caution[Known gaps]
- `<v-clicks>` over a Markdown list reveals the whole list as **one step** (native `<Clicks>` semantics), not per item.
- `v-click.hide` / `v-click.show` modifiers are tolerated — the base name still maps — but the hide/show distinction is not modeled.
- Vue-specific syntax (`<script setup>`, `<template>`) and Slidev's `{monaco}` fence are **not** translated; these need manual conversion.
:::

## Marp mode

Set `marp: true` in the deck's headmatter to enable Marp mode. This turns on Marp-specific parsing — directive comments and image shorthand — that is intentionally *off* for native MDX decks (so an MDX deck that legitimately uses `![bg]`-style alt text isn't affected).

```md
---
marp: true
theme: marp-default
---

# My Marp deck
```

### Directive comments

Marp global, local, and scoped directive comments map to slide frontmatter — for example `_backgroundColor` becomes the slide `background`, and `_class` is carried through.

```md
<!-- _class: lead -->
<!-- _backgroundColor: #101020 -->
```

### Image shorthand

In Marp mode, Marp's image shorthand is rewritten:

```md
![bg](city.jpg)            <!-- becomes the slide background -->
![bg cover](city.jpg)      <!-- background, cover-fit -->
![w:200 h:120](logo.png)   <!-- inline <img> with width/height -->
```

:::caution[Known gaps]
Marp `bg` size keywords, split backgrounds, and filters collapse to a plain `background`. `paginate: true` passes through to frontmatter, but visible page-number rendering isn't wired.
:::

## Slidev component shims

A set of Slidev components ship as shims so decks that use them render without edits:

| Component | Behavior |
| --- | --- |
| `Youtube` | Embeds a YouTube iframe. |
| `Tweet` | Link-card fallback (a live embed isn't shipped). |
| `Toc` | Renders a table of contents from the slide titles. |
| `VDrag` | Static absolute positioning — honors `pos`, but interactive drag isn't supported. |
| `AutoFitText` | Alias of astro-slides' fit-text primitive. |
| `LightOrDark` | Light/dark named slots, toggled on the color scheme. |

```md
<Youtube id="dQw4w9WgXcQ" />

<Toc />
```

## Marp theme ports

Three Marp themes are ported to astro-slides' theme-token contract and selectable by name via the `theme:` headmatter:

- `marp-default`
- `marp-gaia`
- `marp-uncover`

```md
---
marp: true
theme: marp-gaia
---
```

Each theme re-values astro-slides' `--slide-*` tokens to approximate the original Marp look. As with all compatibility here, the goal is a faithful *feel*, not a pixel match.

## Source

- `docs/built/15-marp-slidev-compatibility.md` — the distilled phase writeup, including the full gap list.
- `packages/core/src/compat/remark-slidev.ts` — the `v-click` family rewriter.
- `packages/parser/src/marp.ts` — `extractMarpDirectives` + `extractMarpImages`.
- `packages/client/components/{Youtube,Tweet,Toc,VDrag,AutoFitText,LightOrDark}.astro` — the Slidev shims.
- `packages/client/src/themes/marp-{default,gaia,uncover}/theme.css` — the Marp theme ports.
