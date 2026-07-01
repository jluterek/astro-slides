---
name: astro-slides
description: Author, present, and export web-native slide decks with astro-slides (Astro + MDX). Use when creating or editing decks, working with slides.md/MDX deck files, choosing layouts/themes, adding click animations, code, math or diagrams, running presenter mode, or exporting to PDF/PNG/PPTX. Also covers driving decks over the astro-slides MCP server.
---

# astro-slides

astro-slides is a web-native presentation framework built on Astro, TypeScript, and MDX. Decks
are authored in Markdown/MDX, presented in the browser, and exported to PDF/PNG/PPTX/HTML. It
ships a first-class MCP server so an AI agent can drive decks directly.

## When to use this skill

Reach for it when the user wants to build or change a slide deck in an astro-slides project:
authoring slides, picking layouts or themes, adding click-stepped reveals or transitions,
embedding code/math/diagrams, running presenter mode or the phone remote, or exporting.

## Orientation

- A deck is a Markdown/MDX file. **Single-deck** projects use `slides.md` (or `.mdx`) at the
  project root; **multi-deck** projects use `content/decks/<name>/slides.{md,mdx}`.
- Slides are separated by a `---` line. YAML **headmatter** at the top of the file sets
  deck-wide options; per-slide **frontmatter** (a `---` fenced block at the start of a slide)
  sets that slide's `layout`, `class`, `transition`, `background`, etc.
- Speaker notes are the trailing HTML comment in a slide.

```md
---
title: My Talk
theme: starter
---

# Hello

First slide.

<!-- Speaker note for slide 1. -->

---
layout: section
---

## Part One
```

## Common commands

```bash
astro-slides dev [dir]                 # dev server + live reload (add --remote for a phone remote)
astro-slides build [dir]               # static build
astro-slides export [dir] --format pdf # pdf | png | pptx | html
astro-slides mcp-server [dir]          # MCP server (stdio; add --transport http for remote)
```

## References

Load the reference for the task at hand:

- **[syntax](references/syntax.md)** — deck files, frontmatter fields, slots, speaker notes.
- **[layouts](references/layouts.md)** — the built-in layouts, layout primitives, themes.
- **[animations](references/animations.md)** — click steps (`<Click>`/`<After>`/`<Clicks>`),
  slide transitions, `<Morph>`.
- **[code](references/code.md)** — Shiki highlighting, line highlights, snippet imports,
  Twoslash, Magic Move.
- **[math-and-diagrams](references/math-and-diagrams.md)** — KaTeX math, Mermaid, PlantUML.
- **[presenter-and-remote](references/presenter-and-remote.md)** — presenter view, drawing +
  laser, recording, the phone remote.
- **[export](references/export.md)** — PDF/PNG/PPTX/HTML export flags.
- **[mcp](references/mcp.md)** — the MCP tool surface for driving decks programmatically.

## Working rules

- Keep TypeScript strict and prefer MDX; `.md` (Marp/Slidev-flavored) is compatible.
- When editing a deck via the MCP server, **read a slide before you change it**; slide numbers
  are 1-based.
- Don't invent frontmatter fields or components — stick to what the references document.
