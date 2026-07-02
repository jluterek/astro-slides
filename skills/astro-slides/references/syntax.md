# Syntax

How to author an astro-slides deck: where the file lives, how slides are separated, and the frontmatter, slots, and speaker-notes syntax you can put in each one.

## Where the deck lives

astro-slides discovers decks two ways:

- **Single-deck project** — one `slides.md` (or `slides.mdx`) at the project root.
- **Multi-deck project** — one folder per deck under `content/decks/<name>/slides.{md,mdx}`. The deck's name is its folder name.

MDX (`.mdx`) is the primary author format (it lets you use components). Plain Markdown (`.md`), including Marp/Slidev-compatible `.md`, is fully supported.

Related project folders (all optional):

```
<deck>/
├── slides.mdx        # or content/decks/<name>/slides.mdx
├── components/       # your components, auto-imported into MDX
├── layouts/          # override built-in layouts (kebab-case.astro)
├── theme/            # a folder theme (plain CSS/Astro)
├── snippets/         # files pulled in via <<< @/snippets/...
└── public/           # static assets
```

## Slides are separated by `---`

A deck is a sequence of slides split by a `---` line (a thematic break on its own line):

```markdown
# Slide one

First slide body.

---

# Slide two

Second slide body.
```

Note: `---` is overloaded — it separates slides **and** opens/closes a YAML frontmatter block. A `---` after a slide boundary is treated as frontmatter **only if** the lines up to the next `---` parse as a YAML mapping (`key: value`). A block that starts with content like `# Heading` is body, not frontmatter — so you don't need to escape headings.

## Headmatter vs. per-slide frontmatter

The **first** frontmatter block at the top of the file is the **headmatter**: it is both the deck-level config *and* slide 1's frontmatter (it is run through both schemas). Every later `---`-delimited YAML block is that slide's own frontmatter.

Deck-level headmatter:

```markdown
---
title: My Talk
theme: starter
transition: fade
duration: 30min
class: text-lg
---

# Title slide

The headmatter above also configures this first slide.
```

Per-slide frontmatter overrides deck defaults for one slide:

```markdown
---
layout: two-cols
class: dark
transition: slide-left
clicks: 3
background: '#101018'
---

Slide body here.
```

## Key frontmatter fields

Deck-level (headmatter), with defaults:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | string | `""` | Deck title (page `<title>`, exports, MCP). |
| `theme` | string | `"starter"` | Theme to apply (folder-layered). |
| `class` | string | `""` | CSS class applied to every slide. |
| `aspectRatio` | string | `"16:9"` | Slide aspect ratio (`"16:9"`, `"4:3"`, `"1:1"`). |
| `transition` | string \| object | `"fade"` | Default slide transition. |
| `colorSchema` | `auto`\|`light`\|`dark`\|`all` | `"auto"` | Force a color scheme. |
| `duration` | string | — | Talk length (`"30min"`, `"1:05"`) — drives the presenter timer. |
| `presenter` | boolean | `true` | Whether `/presenter` is reachable. |

Per-slide, with defaults:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `layout` | string | `"default"` (`"cover"` for slide 0) | Layout wrapping the body. |
| `class` | string | `""` | CSS class for this slide. |
| `transition` | string \| object | inherited | Per-slide transition. |
| `clicks` | number | computed | Override total click-step count. |
| `clicksStart` | number | `0` | Start index for relative click resolution. |
| `background` | string | — | Shorthand for background color/image. |
| `exportAs` | `editable`\|`image` | `"editable"` | PPTX export fidelity for this slide. |
| `hide` | boolean | `false` | Skip this slide in render + export. |
| `src` | string | — | Import another markdown file as this slide's source. |
| `routeAlias` | string | — | URL fragment override for this slide. |

Frontmatter objects are **loose**: unknown keys (layout-specific fields, Marp/Slidev extras) pass through instead of being stripped. For example a `two-cols` layout accepts `leftClass` / `rightClass`.

## Slot sugar (`::name::`)

Multi-region layouts (like `two-cols`) receive named content regions. Everything before the first `::name::` marker is the `default` slot; each `::name::` line starts a new named slot:

```markdown
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

Here `default` fills the left column and `right` fills the right. The available slot names depend on the layout.

## Speaker notes (trailing HTML comment)

The **last** HTML comment in a slide's body is its speaker notes. Notes support Markdown, and `[click]` markers align a note segment with a click step so it highlights as you advance:

```markdown
## Speaker notes demo

This slide has stepped notes.

<Click>first reveal</Click>
<Click>second reveal</Click>

<!--
Reveal the **first** point [click], then the **second** [click], then wrap up.
Notes support _markdown_.
-->
```

`[click]` advances one step; `[click:2]` jumps to a specific step index.

## A complete minimal deck

```markdown
---
title: Minimal Deck
theme: starter
duration: 20min
---

# Hello, astro-slides

A web-native presentation framework.

<!-- Welcome the audience. [click] Mention the web-native angle. -->

---
layout: section
---

## A section divider

---
layout: two-cols
---

Left side.

::right::

Right side.

---
layout: end
class: themed-accent
---

## Thanks

Questions?
```

## Compatibility

- **Marp:** set `marp: true` in headmatter to select Marp-flavor parsing; Marp directives (`_class:`, `backgroundColor`, etc.) are parsed into frontmatter. Note: `paginate`, `header`, and `footer` pass through to frontmatter but have no visible rendering yet — do not promise page numbers or running headers.
- **Slidev:** documented Slidev frontmatter fields are honored; Slidev-only extras are ignored gracefully.
