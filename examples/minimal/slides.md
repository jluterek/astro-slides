---
title: Minimal Deck
theme: starter
---

# Hello, astro-slides

A web-native presentation framework — this deck exercises the built-in layouts.

<!-- Speaker note: this is the cover slide. -->

---
layout: section
---

## Layouts

---

## Default layout

- Markdown lists
- **Bold** and _italic_
- `inline code`
- [links](https://example.com)

---
layout: center
---

## Centered

Content centered on both axes via the `center` layout.

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
layout: quote
---

> The best way to predict the future is to invent it.

---

## Click steps

<Click>revealed on step one</Click>

<Click>revealed on step two</Click>

<Clicks>

<div>grouped reveal A</div>

<div>grouped reveal B</div>

</Clicks>

---
transition: slide-left
---

## Directional transition

This slide arrives with a `slide-left` transition (per-slide `transition:` frontmatter).

---

## Morph: before

<Morph id="hero" as="div" class="demo-hero">astro-slides</Morph>

---
layout: center
---

<Morph id="hero" as="div" class="demo-hero demo-hero--big">astro-slides</Morph>

The `<Morph>` element above continues from the previous slide — same-document View
Transition where supported, FLIP animation as the fallback.

---
layout: end

class: themed-accent
---

## Thanks

Questions?
