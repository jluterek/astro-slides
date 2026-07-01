---
title: Click model
description: Reveal slide content step by step with <Click>, <After>, and <Clicks>.
---

Most slides show everything at once. The **click model** lets you reveal content one
step at a time — bullet by bullet, block by block — as you advance through a slide with
the arrow keys, before moving on to the next slide.

astro-slides resolves click steps at **MDX compile time**, not at runtime
([ADR-0008](https://github.com/jluterek/astro-slides/blob/main/docs/decisions/0008-parse-time-click-resolution.md)). Every `<Click>`, `<After>`, and `<Clicks>` in a slide is
assigned a deterministic step index while the deck is built, and the per-slide total is
baked into the manifest. The components you author are static wrappers — the runtime just
toggles a `.as-click-shown` class as the current step changes. No hydration, no client JS
for the reveal itself.

## `<Click>` — reveal one thing

Wrap any content in `<Click>` to hide it until the next step. Each bare `<Click>` claims
the next auto-incrementing step in document order.

```mdx
## Agenda

<Click>First, the problem</Click>

<Click>Then, the approach</Click>

<Click>Finally, the results</Click>
```

The slide above has three click steps. It starts blank; each arrow-key press reveals the
next line. After the third reveal, advancing again moves to the following slide.

### The `at` prop

`at` pins a `<Click>` to a specific step instead of taking the next auto step. It accepts
both absolute and relative values, all resolved at compile time:

| `at` value    | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| _(omitted)_   | Next auto step in document order                     |
| `at="3"`      | Absolute step 3                                      |
| `at="+1"`     | One step after the previous click                    |
| `at="+2"`     | Two steps after the previous click                   |
| `at="[2,5]"`  | Visible during steps 2 through 5, then hidden again  |

```mdx
<Click at="1">Shown on step one</Click>

<Click at="1">Also shown on step one</Click>

<Click at="[2,3]">Appears on step two, disappears after step three</Click>

<Click at="+1">One step after the click above</Click>
```

The `[start,end]` range form emits a `to` bound: the element reveals at `start` and hides
again once you pass `end` — handy for content you want to show and then swap out.

### Reveal animation

An optional `anim` prop sets the enter animation. Supported values are `fade` (the
default), `up`, `down`, `left`, `right`, and `scale`.

```mdx
<Click anim="up">slides up as it fades in</Click>

<Click anim="scale">scales up as it fades in</Click>
```

## `<After>` — reveal alongside the previous click

`<After>` reveals its content at the **same** step as the preceding `<Click>` (equivalent
to `at="+0"`). Use it to bring in a caption, aside, or second element together with the
thing before it, without consuming an extra step.

```mdx
<Click>The headline claim</Click>

<After>...and its supporting detail, revealed together.</After>
```

## `<Clicks>` — step through a group

`<Clicks>` reveals each of its children one step at a time. You author the group once and
the compiler wraps each child in a resolved `<Click>` for you.

```mdx
<Clicks>

<div>grouped reveal A</div>

<div>grouped reveal B</div>

<div>grouped reveal C</div>

</Clicks>
```

Use the `every` prop to reveal children in batches — `every="2"` steps two children at a
time:

```mdx
<Clicks every="2">

<div>revealed together on step one</div>
<div>revealed together on step one</div>

<div>revealed together on step two</div>
<div>revealed together on step two</div>

</Clicks>
```

:::note
The child split happens in the compiler, not in the `<Clicks>` component. MDX groups
adjacent block children unpredictably, so resolving the split at parse time is the only
way to keep step numbering deterministic. `<Clicks>` reveals explicit block children;
auto-revealing each `<li>` of a plain Markdown list is not yet supported — wrap items in
elements if you need per-item reveal.
:::

## Overriding the click total

The per-slide click total is computed automatically. If you need to force a different
number (for extra manual steps, for example), set `clicks:` in the slide's frontmatter:

```md
---
clicks: 5
---
```

## How navigation steps through clicks

The runtime tracks a `?step` value per slide. Arrow keys (or space) advance the step; when
the current step is below the slide's total, forward navigation reveals the next click
rather than changing slides. Once every click is revealed, the next press moves to the
following slide. Backward navigation walks the steps in reverse. Because totals are static,
tooling can report "10 slides, 47 click steps" without rendering anything, and presenter
view, exports, and MCP navigation all see the same plan — no drift.

:::tip
In overview mode every click step is forced visible, so slide thumbnails show their full
content.
:::

## Speaker-note click markers

Speaker notes (the trailing HTML comment on a slide) can mark where in your narration each
click happens, so presenter view highlights the note that matches the current step.

- `[click]` — the next auto step (1, 2, 3, ...)
- `[click:N]` — absolute step `N`; subsequent bare markers continue from `N+1`

```md
## Speaker notes demo

<Click>first reveal</Click>

<Click>second reveal</Click>

<!--
Reveal the **first** point [click], then the **second** [click], then wrap up.
Notes support _markdown_.
-->
```

An explicit `[click:3]` pins a marker to step 3, and later bare `[click]` markers continue
at 4.

## Slidev `v-click` compatibility

Decks written for Slidev use `v-click`, `v-after`, and `v-clicks` (in both element and
attribute forms). These are rewritten to `<Click>`, `<After>`, and `<Clicks>` during
parsing, so existing Slidev click markup works unchanged. See the
[Marp / Slidev compatibility](/integrations/marp-slidev/) page for the full mapping.

## Source

- `packages/client/components/Click.tsx`
- `packages/client/components/After.tsx`
- `packages/client/components/Clicks.tsx`
- `packages/core/src/remark-clicks.ts`
- `packages/core/src/notes.ts`
- `packages/client/src/styles/click.css`
- `packages/client/src/navigation.ts`
- `docs/decisions/0008-parse-time-click-resolution.md`
- `docs/built/06-click-model.md`
- `examples/minimal/slides.md`
