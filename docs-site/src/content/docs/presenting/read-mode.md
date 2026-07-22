---
title: Read mode
description: The annotated deck view — slides rendered static with companion prose beneath, at the same URL.
---

Decks are shared by URL and revisited after the talk. Slides should stay sparse — one
idea each — but your audience later needs the full content: stats with sources, the
spoken argument, the detail that would crowd a slide. **Read mode** is that
annotated-presentation format as a first-class output of every deck: each slide
rendered as a static block with flowing article prose beneath it.

## The `::read::` slot

Companion prose lives in a reserved named slot, using the same `::name::` slot sugar
as layouts:

```mdx
---

## The trust inversion

One sparse chart, one idea.

::read::

Stack Overflow's 2025 survey (~49k respondents) found 84% of developers use or plan
to use AI tools, up from 76% in 2024 — while trust in accuracy fell from 43% to 33%.
Source: https://survey.stackoverflow.co/2025/ai/

<!-- pause on the crossing lines, then land the year-over-year drop -->
```

- `::read::` content renders **only** on the read page — never in the live deck,
  presenter view, print, PPTX, or image exports.
- Full Markdown/MDX: links, lists, code blocks, components.
- **Author it before the speaker-notes comment** — notes are the *trailing* HTML
  comment of the slide and stay private, exactly as before.
- Click steps inside read prose are ignored (they never widen the slide's step count).

## The `/read` route

Every deck gets a prerendered route beside `/print`:

```
/read/<deck>            (or  <prefix>/read/<deck>  when embedding with a prefix)
```

- Each slide renders as a static, theme-styled block — all click steps revealed, like
  print — scaled to a readable article column. Responsive and phone-friendly; the only
  script on the page is a tiny scaler.
- Slides with `::read::` content get their prose beneath the block; slides without it
  just show the block. A deck with no annotations still renders (slides only, with a
  note saying so).
- **Per-slide anchors**: `#slide-3` links directly to an annotated slide — handy from
  a blog post. Hover the slide number in the margin for the link.
- The header links back to the live deck (**Present**) and to **Print**. Browser-print
  of the read page makes a serviceable handout.

## Discoverability

- The `?` help overlay in any deck has **Open reading view**.
- Multi-deck dashboards get a **Read** action per deck.

## Example

`examples/minimal` annotates its cover slide; `examples/conference-talk` shows the
conference shape — sparse fact slides with sourced receipts in `::read::`.

## Source

- `packages/core/src/routes/read.astro` — the route
- `packages/client/src/styles/read.css` — article layout + slide scaling
- `packages/parser/src/slots.ts` — slot sugar (nothing read-specific; `read` is reserved by convention)
