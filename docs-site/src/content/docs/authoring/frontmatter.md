---
title: Frontmatter
description: Deck-wide headmatter versus per-slide frontmatter — every supported field, with examples.
---

Frontmatter is the YAML configuration you place between `---` fences. astro-slides has
two kinds, and the difference is purely *where the block appears* in the file:

- **Headmatter** — the **first** frontmatter block in the deck. Holds deck-wide config.
- **Per-slide frontmatter** — a frontmatter block after any later `---` separator.
  Overrides inherited config for that one slide.

:::note
The first block does double duty: it is the deck's headmatter **and** slide 1's
frontmatter. The parser runs it through both schemas, so headmatter fields and slide-1
fields can live side by side in that opening block.
:::

All frontmatter objects are **loose**: unknown keys (layout-specific fields, or Marp/
Slidev fields astro-slides doesn't model) pass through instead of being stripped. The
authoritative field list is the Zod schema in `packages/types/src/frontmatter.ts`.

## Headmatter (deck-level)

The first block, configuring the whole deck:

```md
---
title: Cosmic Theme Showcase
theme: cosmic
duration: 15min
---

# Cosmic

The flagship theme for astro-slides.
```

### Headmatter fields

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | string | `""` | Deck title for `<title>`, exports, MCP responses. |
| `theme` | string | `"starter"` | Bundled theme to apply (see below). |
| `class` | string | `""` | Default CSS class applied to every slide. |
| `aspectRatio` | string | `"16:9"` | Slide aspect ratio (e.g. `"16:9"`, `"4:3"`, `"1:1"`). |
| `canvasWidth` | number | `1920` | Pixel width of the slide canvas. |
| `colorSchema` | `"auto" \| "light" \| "dark" \| "all"` | `"auto"` | Force a color scheme. `"all"` ships both. |
| `transition` | string \| object | `"fade"` | Default slide-to-slide transition. |
| `fonts` | object | — | Font stack overrides (`sans`/`serif`/`mono`/`weights`/…). |
| `seoMeta` | object | — | Open Graph + Twitter card metadata. |
| `drawings` | object | `{ persist: false }` | Drawing-layer options (`persist`/`presenterOnly`/`syncAll`). |
| `record` | `"dev" \| "prod" \| false` | `false` | Enable the recording UI. |
| `presenter` | boolean | `true` | Whether the presenter view is reachable. |
| `routerMode` | `"history" \| "hash"` | `"history"` | URL routing strategy. |
| `duration` | string | — | Talk duration (e.g. `"20min"`); drives the presenter timer. |
| `addons` | string[] | `[]` | Addon names or paths to load. |
| `mdc` | boolean | `false` | Enable MDC directive syntax in MDX. |
| `monaco` | `"dev" \| "prod" \| false` | `false` | Enable Monaco code blocks (opt-in). |
| `marp` | boolean | — | Select the Marp-flavor parsing path. |

Note that `colorSchema` is the field name (the color-scheme control), spelled with the
`Schema` suffix.

### Opting into a theme

`theme:` names a **bundled theme** the deck opts into. `starter` is the default; set
another name to switch:

```md
---
title: My Talk
theme: cosmic
---
```

The deck and print routes stamp `data-theme="cosmic"` and the theme's tokens apply. See
the theme docs for the full list of bundled themes.

## Per-slide frontmatter

A block after a later `---` separator, scoped to the slide that follows it:

```md
---

## Default layout

- point one
- point two

---
layout: two-cols
---

Left column content.

::right::

Right column content.
```

### Per-slide fields

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `layout` | string | — | Layout to wrap this slide's body (see below). |
| `class` | string | — | CSS class applied to this slide. |
| `transition` | string \| object | inherited | Per-slide transition override. |
| `clicks` | number | computed | Override the computed total click count. |
| `clicksStart` | number | `0` | Starting click index for relative `+K` resolution. |
| `level` | number | — | Section nesting level (for the table of contents). |
| `hide` | boolean | `false` | Skip this slide in render and export. |
| `hideInToc` | boolean | `false` | Keep the slide but omit it from `<Toc>` lists. |
| `src` | string | — | Import another Markdown/MDX file as this slide's source. |
| `routeAlias` | string | — | URL fragment override for this slide. |
| `zoom` | number | `1` | Zoom multiplier for the slide content. |
| `preload` | boolean | `false` | Force eager-load of iframes/media. |
| `exportAs` | `"editable" \| "image"` | `"editable"` | PPTX export fidelity for this slide. |
| `background` | string | — | Slide background (color or image). |
| `dragPos` | object | — | Persisted positions for `<VDrag>` elements, by id. |
| `clickAnimation` | string | inherited | Default animation class for this slide's click steps. |

### Selecting a layout

`layout:` picks the layout that wraps a slide's body. astro-slides ships a set of
built-in layouts — `center`, `section`, `two-cols`, `statement`, `fact`, `quote`, `end`,
and more:

```md
---
layout: center
---

## Centered

Content centered on both axes.
```

Layouts can accept **extra fields** beyond the table above; because frontmatter is loose,
those pass straight through to the layout as props. For example, `two-cols` accepts
`leftClass` / `rightClass`:

```md
---
layout: two-cols
leftClass: pr-4
rightClass: pl-4
---
```

:::tip
Because the first block is both headmatter and slide 1's frontmatter, you can set the
opening slide's `layout` right in the deck's headmatter block.
:::

## Source

- `packages/types/src/frontmatter.ts` — the authoritative Zod `HeadmatterSchema` and
  `FrontmatterSchema` (field names, types, defaults).
- `docs/architecture/frontmatter.md` — the full frontmatter reference and compat notes.
- `docs/built/02-parser.md` — how the first block is run through both schemas.
- `examples/minimal/slides.md`,
  `examples/minimal/content/decks/cosmic/slides.mdx` — real headmatter and per-slide
  frontmatter.
