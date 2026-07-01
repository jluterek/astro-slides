---
title: Layouts
description: The built-in slide layouts and how to select them per slide.
---

Every slide renders through a **layout** — a thin structural wrapper that decides
where your content sits on the canvas. astro-slides ships 21 built-in layouts, and
you pick one per slide with the `layout:` frontmatter key. If you don't set one, the
slide uses the `default` layout.

## Selecting a layout

Set `layout:` in a slide's frontmatter (the block between the `---` separators):

```mdx
---
layout: center
---

## Centered

This heading and paragraph are centered on both axes.
```

`layout:` is **per-slide** — it applies only to the slide whose frontmatter it
appears in, and does not inherit to later slides. The very first frontmatter block
is the deck **headmatter** (title, `theme`, etc.); a `layout:` there applies to the
first slide only.

:::note
Layout names are matched by filename. User- and theme-provided `layouts/*.astro`
override the built-ins of the same name, so you can redefine `two-cols` or add your
own `dashboard` layout without touching the framework. See the
[Source](#source) paths below.
:::

## Named slots

Most layouts render your slide body into a single default slot. Multi-region
layouts (`two-cols`, `two-cols-header`) expose **named slots** you fill with a
`::name::` marker on its own line. Everything before the first marker is the default
slot; everything after a marker goes into that named region.

```mdx
---
layout: two-cols
---

Left column content.

- point A
- point B

::right::

Right column content.

- point C
- point D
```

## The built-in layouts

### General purpose

| Layout | Purpose | Slots |
| --- | --- | --- |
| `default` | Standard slide — top-aligned body. The fallback when no `layout:` is set. | default |
| `center` | Content centered on both axes. | default |
| `full` | Full-bleed body with no layout padding (edge-to-edge content). | default |
| `none` | No structural wrapper at all — you own the entire canvas. | default |

### Title & divider slides

| Layout | Purpose | Slots |
| --- | --- | --- |
| `cover` | Deck opener — large centered title block. | default |
| `intro` | Introductory slide (title + supporting lines). | default |
| `section` | Section divider between topics. | default |
| `end` | Closing / "thanks" slide. | default |

### Big-statement slides

| Layout | Purpose | Slots |
| --- | --- | --- |
| `statement` | One large, centered sentence — a bold claim. | default |
| `fact` | A headline figure or stat with a caption underneath. | default |
| `quote` | A blockquote with attribution, with quote styling. | default |

### Multi-column

| Layout | Purpose | Slots |
| --- | --- | --- |
| `two-cols` | Two side-by-side columns. | default (left) + `::right::` |
| `two-cols-header` | A full-width header above two columns. | default (header) + `::left::` + `::right::` |

### Media (image)

These read the slide's `image:` frontmatter for the media source.

| Layout | Purpose | Slots |
| --- | --- | --- |
| `image` | Full-bleed image; if you add body text it becomes a caption. | default (optional caption) |
| `image-left` | Image on the left, content column on the right. | default (right column) |
| `image-right` | Image on the right, content column on the left. | default (left column) |

```mdx
---
layout: image-right
image: /assets/architecture.png
---

## How it fits together

- The image sits on the right
- Your bullets sit on the left
```

### Media (iframe)

These read the slide's `url:` frontmatter for the embedded page.

| Layout | Purpose | Slots |
| --- | --- | --- |
| `iframe` | Full-bleed embedded web page. | (none) |
| `iframe-left` | Embed on the left, content column on the right. | default (right column) |
| `iframe-right` | Embed on the right, content column on the left. | default (left column) |

```mdx
---
layout: iframe
url: https://example.com
---
```

### System

These render for framework / error states — you rarely set them by hand.

| Layout | Purpose | Slots |
| --- | --- | --- |
| `404` | "Slide not found" page. | default (extra content) |
| `error` | "Something went wrong rendering this slide" page. | default (extra content) |

## Worked example

A short deck exercising several layouts:

```mdx
---
title: My Deck
theme: starter
---

# Hello, astro-slides

The opening slide (default layout).

---
layout: section
---

## Part One

---
layout: two-cols
---

Left side.

::right::

Right side.

---
layout: statement
---

Ideas worth presenting deserve the web.

---
layout: fact
---

**100%**

web-native

---
layout: end
---

## Thanks
```

## Layout primitives

Inside any slide you can compose finer layout with the built-in **primitive
components** — plain Astro/JSX components usable directly in MDX:

- `Stack` — vertical stack with gap
- `HStack` — horizontal row with gap
- `Grid` — CSS grid with configurable columns
- `Wrap` — flex-wrap row
- `FlexBlock` — card / cell grid with `variant` styling (`features`, `metrics`, …)
- `FitText` — text that scales to fit its box
- `Morph` — element that animates across slides via View Transitions / FLIP
- `RenderWhen` — conditionally renders by presentation mode (presenter, print, …)

```mdx
<FlexBlock variant="features" columns={3}>

<div>
### Web-native
Renders in any browser.
</div>

<div>
### Composable
Layout primitives and FlexBlock variants.
</div>

<div>
### Portable
Export to PDF, PNG, and PPTX.
</div>

</FlexBlock>
```

:::tip
Layouts control the frame; primitives control the arrangement *inside* the frame.
Reach for a layout first, then compose with primitives where you need more than one
region. Styling for both flows entirely through theme tokens — see the
[Themes](/design/themes/) page.
:::

## Source

- `packages/client/layouts/` — the 21 built-in layout `.astro` files.
- `packages/client/src/styles/layouts.css` — the layout styling.
- `packages/client/components/` — the layout primitive components.
- `packages/core/src/layout-resolver.ts` — filesystem-layered layout resolution (user > theme > built-in).
- `packages/core/src/routes/slide.astro` — how a slide gets wrapped in its resolved layout.
- `packages/types/src/frontmatter.ts` — the `layout` / `image` / `url` / `background` frontmatter fields.
- `docs/architecture/layout-primitives.md` — the primitives spec.
- `docs/built/05-themes-and-layouts.md` — how the layout system was built.
- `examples/minimal/slides.md` — a real deck using these layouts.
