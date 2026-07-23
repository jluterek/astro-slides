---
title: Presenter mode
description: The speaker view — current slide, next preview, notes, and a synced timer.
---

Presenter mode gives you a dedicated **speaker view**: the current slide, a preview of
what's coming next, your speaker notes, and a timer — all while your audience sees only
the clean deck on the projector. The two windows stay in lockstep: advancing in one
advances the other.

## Opening the presenter view

Every deck has a parallel presenter route:

```
/presenter/<deck>/<slide>
```

If your audience window is showing `/mydeck/4`, open the presenter view for the same
spot at:

```
/presenter/mydeck/4
```

:::tip[Launch it from the deck]
From any slide, press **`P`** (or open the keyboard-help overlay with `?` and click
**Open presenter view**) to open the presenter view for the current deck at the current
slide in a new tab — no need to type the URL.
:::

A typical setup:

1. Open the deck normally (`/mydeck/1`) and drag that window onto the **projector /
   shared screen**, then make it fullscreen.
2. Open `/presenter/mydeck/1` in a **second window** on your laptop screen.
3. Drive the talk from the presenter window. The audience window follows every move.

:::note
Both windows must be on the **same origin** (same host and port). Sync runs over the
browser's `BroadcastChannel`, which is same-origin only. Opening the presenter view and
the deck in two tabs/windows of the same dev server is exactly what it expects. To drive
the deck from a phone across the network instead, see
[Drawing, recording & remote](/presenting/drawing-and-remote/).
:::

## The three panes

The presenter view is a set of resizable panes (drag the dividers; your layout is
remembered per deck):

- **Current** — an iframe of the slide the audience is seeing right now, at its current
  click step. This is the exact deck renderer, so layouts, code, math, and transitions
  look identical to the projector.
- **Next** — a preview iframe showing the **result of your next click** (the next step,
  or the first step of the next slide). It runs on a separate preview channel, so it can
  sit one click ahead of the audience without disturbing them.
- **Notes** — your speaker notes for the current slide, plus the control bar: previous /
  next, the timer (start / pause / reset), and a blackout toggle.

## Keyboard shortcuts

The presenter window binds its own shortcuts:

| Key | Action |
| --- | --- |
| <kbd>→</kbd> / <kbd>Space</kbd> / <kbd>PageDown</kbd> | Next slide or step |
| <kbd>←</kbd> / <kbd>PageUp</kbd> | Previous slide or step |
| <kbd>B</kbd> | Blackout the audience |
| <kbd>F</kbd> | Toggle fullscreen |
| <kbd>K</kbd> or <kbd>/</kbd> | Open the command palette |
| <kbd>Esc</kbd> | Close the command palette |

## Speaker notes

Notes are authored **in the slide itself**, as the trailing HTML comment at the bottom of
the slide. Everything inside the comment is rendered as Markdown into the notes pane.

```mdx
# Our Q3 numbers

<Chart data={revenue} />

<!--
Revenue is up 40% year over year — lead with that.

Pause here and let the chart land before you talk to the breakdown.
-->
```

:::note
A slide has exactly **one** notes block — the last HTML comment on the slide. Other
comments in the slide body are not treated as notes.
:::

### Click markers

If a slide reveals content across several clicks, you can mark the exact point in your
narration where you advance, using `[click]` markers. The presenter pane renders each
marker as a small diamond (`◆1`, `◆2`, …) and **highlights the one matching your current
step**, so your notes scroll in time with the slide.

```mdx
# Architecture

<Click>The gateway relays messages…</Click>
<Click>…and every client reduces them locally.</Click>

<!--
Start with the problem. [click] Now introduce the gateway as a dumb relay.
[click] Emphasize that the reducer stays on the client.
-->
```

- `[click]` — the next step in order (1, 2, 3, …).
- `[click:3]` — an explicit step number; bare markers after it continue from there.

## The timer

The control bar shows a running clock:

- With no configuration it's a **stopwatch** (counts up from Start).
- Add a `duration:` to the deck headmatter and it becomes a **countdown** from that
  length:

```mdx
---
title: My talk
duration: 30min
---
```

`duration:` accepts values like `30min`, `1:05`, `2:30:00`, or a bare number of minutes.
The timer syncs across windows using the wall-clock start time, so the presenter and any
other synced window can never drift apart.

## Blackout

Press <kbd>B</kbd> (or the **Black** button) to drop a full-screen black overlay on the
**audience** window — handy for pulling attention back to you. Press <kbd>B</kbd> again to
restore the slide. The presenter view keeps showing the slide the whole time.

## Command palette

Press <kbd>K</kbd> or <kbd>/</kbd> to open a **jump-to-slide** palette (built on `cmdk`).
Start typing a slide number or title, and <kbd>Enter</kbd> jumps both windows straight to
that slide. Press <kbd>Esc</kbd> to dismiss it.

:::tip
Because the palette matches on slide titles, giving your slides `#` headings makes them
much easier to jump to mid-talk.
:::

## Recording

If the deck opts in with `record:` headmatter (`dev`, `prod`, or `false`), a recording
panel appears in the notes pane. See
[Drawing, recording & remote](/presenting/drawing-and-remote/) for the details.

## The slide grid — see all slides

The **Slides** button in the toolbar (or `G`) opens a full-screen grid of every slide
as a real, scaled thumbnail — numbered, titled, with the current slide highlighted.
Click any slide to jump straight to it; the jump lands at **step 0**, skipping click
steps and animations (the PowerPoint "see all slides" gesture). `Esc` closes.

Thumbnails are prerendered slide content, not screenshots — code, math, and diagrams
all render, and there is no capture step.

## Source

- `packages/core/src/routes/presenter.astro` — the `/presenter/<deck>/<slide>` route.
- `packages/client/components/presenter/PresenterApp.tsx` — the speaker UI (panes, timer, palette, shortcuts).
- `packages/client/src/sync/` — the shared state, reducer, and `BroadcastChannel` transport.
- `packages/core/src/notes.ts` — notes rendering and `[click]` marker handling.
- `packages/types/src/frontmatter.ts` — the `duration:` and `record:` headmatter fields.
- `docs/architecture/sync-state.md` — the sync state and protocol spec.
