---
title: Markdown and MDX
description: Author slides in MDX (primary), Marp/Slidev-compatible Markdown (secondary), or drop to .astro as an escape hatch — and where those files live.
---

Slides in astro-slides are just text files. You write ordinary Markdown, sprinkle in
components where you want interactivity or layout, and the framework compiles each slide
to a static, web-native page.

## Which format to use

astro-slides accepts three author formats, in order of preference:

- **MDX (`.mdx`) — the primary format.** Markdown with JSX. Use this when you want React
  or Astro components, click steps, layout primitives, code islands, or diagrams inline
  with your prose. Almost every deck should be MDX.
- **Markdown (`.md`) — the secondary format.** Plain CommonMark/GFM, kept
  **Marp- and Slidev-compatible** so existing decks render largely unchanged. Good for
  simple text decks and for importing prior work.
- **Astro (`.astro`) — the escape hatch.** Reach for a component only when a slide needs
  full template power that Markdown/MDX can't express. This is rare; prefer MDX.

:::tip
When in doubt, author `.mdx`. It's a strict superset of the Markdown you already know —
plain Markdown is valid MDX until you add a component.
:::

## Where slide files live

There are two project shapes:

- **Single deck** — a `slides.md` or `slides.mdx` at the project root.
- **Multiple decks** — one folder per deck under `content/decks/<name>/`, each holding a
  `slides.md` or `slides.mdx`.

```
my-talk/
  slides.mdx                 # single-deck: the whole presentation

# — or —

my-talks/
  content/
    decks/
      intro/
        slides.mdx           # deck "intro"
      cosmic/
        slides.mdx           # deck "cosmic"
```

Each deck becomes a set of per-slide URLs at build time. You don't wire up routes
yourself — the framework discovers `slides.{md,mdx}` and generates them.

## Separating slides

A single file holds the entire deck. Slides are separated by a `---` fence (a thematic
break) on its own line:

```md
# First slide

Some content.

---

## Second slide

More content.
```

That same `---` is also how a slide declares its own frontmatter. If the lines directly
after a separator parse as a YAML mapping (ending at the next `---`), they become that
slide's [frontmatter](/authoring/frontmatter/); otherwise the `---` is just a plain
slide break:

```md
---
layout: center
---

## This slide is centered

The block above is per-slide frontmatter, not a new slide.
```

:::note
The very first frontmatter block in the file is special: it's the deck's **headmatter**
(deck-wide config) *and* the first slide's frontmatter at once. See
[Frontmatter](/authoring/frontmatter/).
:::

## Markdown basics

Standard Markdown works as you'd expect — headings, lists, emphasis, links, inline code,
and blockquotes:

```md
## A heading

- Markdown lists
- **Bold** and _italic_
- `inline code`
- [links](https://example.com)

> A blockquote.
```

Images use normal Markdown image syntax:

```md
![Alt text](/images/diagram.png)
```

## Components inside MDX

The reason to author `.mdx` is that you can drop React and Astro components straight into
your slides. Several are always in scope — no import needed — including the click-step
wrappers and the layout primitives:

```mdx
## Click steps

<Click>revealed on step one</Click>

<Click>revealed on step two</Click>

<Clicks>

<div>grouped reveal A</div>

<div>grouped reveal B</div>

</Clicks>
```

Layout primitives like `<FlexBlock>` compose card grids and metric rows directly in prose:

```mdx
<FlexBlock variant="features" columns={3}>

<div>

### Web-native

Renders in any browser.

</div>

<div>

### Composable

Layout primitives and variants.

</div>

</FlexBlock>
```

:::tip
Leave blank lines around block-level Markdown *inside* a component's children (as above).
MDX treats tightly-packed children as one block, so the blank lines keep each `<div>`'s
Markdown rendering as its own block.
:::

Marp and Slidev component/directive forms also work in `.md` and `.mdx` decks — e.g.
Slidev's `<v-click>` element and attribute forms are rewritten to `<Click>` for you:

```md
<v-click>

Revealed by a Slidev `v-click` element.

</v-click>

<div v-click>This uses the `v-click` attribute form.</div>
```

## The `export` gotcha

In MDX, **a line that begins with the word `export` is parsed as an ESM export
statement**, not as slide text. If your content naturally starts a line with "export",
reword it or restructure it so `export` isn't the first token on the line:

```mdx
✗ Parsed as a (broken) ESM export:

export your deck to PDF with one command.

✓ Reworded:

You can export your deck to PDF with one command.
```

This only affects lines that *start* with `export`; the word anywhere else on a line is
fine.

## Source

- `docs/built/02-parser.md` — the MDX/Markdown → slide AST pipeline.
- `docs/built/03-astro-integration.md` — deck discovery (`slides.{md,mdx}` at root,
  `content/decks/*/`) and routing.
- `docs/built/06-click-model.md` — MDX + React foundation; `<Click>`/`<Clicks>` in scope.
- `packages/parser/src/splitter.ts` — how `---` separates slides and opens frontmatter.
- `examples/minimal/slides.md` — a single-deck `.md` example.
- `examples/minimal/content/decks/cosmic/slides.mdx`,
  `examples/minimal/content/decks/compat/slides.mdx` — multi-deck MDX examples.
