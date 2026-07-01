# Layouts

A layout is the structural wrapper around a slide's content; you pick one per slide via frontmatter and compose its content with layout primitive components in MDX.

## Setting a layout

Set `layout` in a slide's frontmatter:

```mdx
---
layout: section
---
# Part Two
```

Each slide in a deck is separated by `---`, and every slide can carry its own frontmatter (headmatter) with a `layout` field.

### Default resolution

If you omit `layout`, the framework picks one for you:

- **Slide 1** → `cover`
- **All other slides** → `default`

Set `layout` explicitly whenever you want something other than these defaults.

## Built-in layouts

There are 21 built-in layouts. They are thin structural wrappers; all visual styling comes from theme tokens (`--slide-*`), so switching themes restyles every layout consistently.

### Content

General-purpose text slides.

- `default` — standard content slide (the fallback for slides after the first).
- `center` — content centered in the frame.
- `full` — full-bleed content (padding collapses to 0).
- `none` — no structural wrapper; you own the entire frame.

```mdx
---
layout: center
---
# Centered heading
Everything on this slide is centered.
```

### Section / statement

Big-type dividers and emphasis slides.

- `cover` — title/opening slide (the default for slide 1).
- `intro` — introductory slide.
- `section` — section divider.
- `statement` — a single bold statement.
- `fact` — a headline fact/number.
- `quote` — a pull quote.
- `end` — closing slide.

```mdx
---
layout: quote
---
> Design is how it works.
```

### Media / image

The media URL comes from frontmatter (`image`), and slide body content fills the `default` slot.

- `image` — full-frame image.
- `image-left` — image on the left, content on the right.
- `image-right` — image on the right, content on the left.

```mdx
---
layout: image-right
image: /assets/diagram.png
---
# With a picture
Text sits beside the image.
```

### Iframe

Embed a live URL; the URL comes from frontmatter (`url`), body content fills the `default` slot.

- `iframe` — full-frame embedded page.
- `iframe-left` — iframe left, content right.
- `iframe-right` — iframe right, content left.

```mdx
---
layout: iframe
url: https://example.com
---
```

### Two-column

Two content columns fed by named slots (see slot sugar below).

- `two-cols` — left (`default`) + `right`.
- `two-cols-header` — header (`default`) + `left` + `right`.

### Error

Used by the runtime for error/not-found states; you rarely author these directly.

- `404` — not-found page.
- `error` — error page.

## Two-column slot sugar

Two-column layouts consume named slots. In slide markdown, the `::name::` marker starts a named slot; everything before the first marker is the `default` slot.

`two-cols` — content before `::right::` is the left column; content after is the right:

```mdx
---
layout: two-cols
---
# Left column
Goes in the default (left) slot.

::right::

# Right column
Goes in the right slot.
```

`two-cols-header` — `default` is the header, then `::left::` and `::right::` feed the two columns:

```mdx
---
layout: two-cols-header
---
# Header spans the top

::left::
Left column content.

::right::
Right column content.
```

## Layout primitive components

Primitives are composition helpers you can use inside slide bodies (MDX) to arrange content. They read only theme tokens, so they stay on-theme automatically.

| Component | Purpose | Key props |
| --- | --- | --- |
| `<Stack>` | Vertical flex stack | `gap`, `align`, `justify` |
| `<HStack>` | Horizontal flex stack | `gap`, `align`, `justify` |
| `<Grid>` | CSS Grid wrapper | `cols` (grid-template-columns value), `gap` |
| `<Wrap>` | Centered max-width wrap | `max` |
| `<FlexBlock>` | Equal-height auto-wrap cells | `variant` (`features`\|`metrics`\|`clients`\|`steps`), `columns`, `gap` |
| `<FitText>` | Auto-fit text to width | `min`, `max` (px bounds) |
| `<Morph>` | Element paired across slides | `id`, `as` |
| `<RenderWhen>` | Show only in a given mode | `when` (`slide`\|`presenter`\|`print`) |

All of them also accept `class`.

```mdx
---
layout: default
---
# Features

<FlexBlock variant="features" columns={3}>
  <div><h3>Markdown-first</h3><p>Author with the web.</p></div>
  <div><h3>AI-native</h3><p>Drive with an MCP server.</p></div>
  <div><h3>Beautiful by default</h3><p>Themed out of the box.</p></div>
</FlexBlock>
```

## Themes and overriding layouts

- **Themes are folders, not packages** — a theme is a directory of CSS that sets `--slide-*` tokens; layouts and primitives consume only those tokens, never hard-coded values.
- **Layouts are resolved in layers** — user `layouts/` > theme > built-in. To override any built-in, drop a same-named file in your project's `layouts/` directory (e.g. `layouts/cover.astro` replaces the built-in `cover`).
- Per-slide styling hooks: frontmatter `class` is applied to the slide `<section>` (a deck/theme class can then set tokens), and frontmatter `background` sets a cover image or CSS color/gradient.
