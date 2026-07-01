---
title: Drawing, recording & remote
description: Annotate live, record your talk, and drive the deck from your phone.
---

Three tools for driving a live talk: a freehand **drawing / laser overlay** you can toggle
on any slide, in-browser **screen and camera recording** from the presenter view, and a
**phone-as-remote** that runs over your local network.

## Drawing overlay

Press <kbd>D</kbd> on any slide to toggle the drawing layer. A floating toolbar appears
and the deck starts capturing your pen. Press <kbd>D</kbd> again to put the pen away (your
drawing stays on the slide).

The overlay draws in the deck's design coordinate space, so annotations stay crisp at any
window size and look identical in the audience window.

### Pen tools

The toolbar offers:

- **Modes** — stylus, freehand pen, straight line, arrow, rectangle, ellipse, and an
  eraser.
- **Colors** — six swatches (red, amber, green, blue, near-black, white).
- **Actions** — undo, redo, and clear (clears the current slide-step's drawing).

Drawings are tracked **per slide _and_ per click step** — advancing a click gives you a
fresh surface, and stepping back reveals what you drew there before.

## Laser pointer

Press <kbd>L</kbd> to toggle the laser. While it's on, moving your pointer over the slide
shows a red dot that is mirrored into the audience window (and any other synced window) in
real time. Press <kbd>L</kbd> again to hide it.

:::tip
The laser dot is synced, not the raw cursor, so it lands in the right place even when the
audience screen is a different size or resolution than yours.
:::

## Persisting drawings

By default, annotations live only for the current session. To save them to disk so they
survive a reload, opt in from the deck headmatter:

```mdx
---
title: My talk
drawings:
  persist: true
---
```

With `persist: true`, each committed stroke is POSTed to the dev-server gateway and stored
under `<root>/.astro-slides/drawings/<deck>/` (this directory is gitignored). Persistence
requires the dev server's gateway, so it applies while running locally.

## Recording

The presenter view can record your talk in the browser using RecordRTC — no external
capture tool needed. Enable it from the deck headmatter:

```mdx
---
title: My talk
record: dev
---
```

`record:` accepts `dev` (record in the dev server only), `prod`, or `false` (off, the
default). When enabled, a recording panel appears in the presenter view's notes pane where
you can:

- Toggle **screen** capture (`getDisplayMedia`) and/or **camera** capture.
- Pick a specific **camera** and **microphone** from the device menus.
- Set a **file-name stem** for the downloads.
- **Record** / **Stop**, then download each clip.

:::note
Screen and camera are captured as **separate clips**, not a composited picture-in-picture.
While recording, the tab warns you before closing so you don't lose a take. Device labels
only appear after you've granted the browser camera/mic permission once.
:::

## Mobile remote

Turn your phone into a clicker for the deck. Start the dev server with `--remote`:

```bash
astro-slides dev --remote
```

The terminal prints a **QR code** and a LAN URL. Scan the QR with your phone (on the same
Wi-Fi) and it opens the remote page.

### The `/entry` remote page

The remote lives at `/entry` on the LAN address. It's a self-contained, touch-friendly
controller with:

- **Previous / Next** buttons that advance whole slides.
- A **Blackout** toggle for the audience.
- A **laser pad** — drag on it to move the synced laser dot on the slide.

The phone joins the same sync room as your laptop over a WebSocket, so it stays in step
with the presenter view and audience window.

:::note
The phone remote advances **whole slides** (not individual click steps). Fine-grained
click stepping stays on the laptop / presenter view.
:::

### Password protection

To require a token, pass a password:

```bash
astro-slides dev --remote=mytalk
```

The printed URL and QR then include an access token, and the remote won't connect without
it.

:::caution
`--remote` binds the dev server to **all network interfaces** (`0.0.0.0`) so other devices
on the LAN can reach it. Plain `--remote` is **open to anyone on the same network** — use
it on trusted networks only. The `--remote=<password>` token is a convenience gate, **not
a security boundary**: it travels in the URL and there's no TLS. Do not expose the remote
beyond a trusted LAN, and don't treat the token as a secret.
:::

## Source

- `packages/client/src/drawing/overlay.ts` — the drawing overlay, toolbar, and <kbd>D</kbd> toggle.
- `packages/client/src/drawing/laser.ts` — the laser pointer and <kbd>L</kbd> toggle.
- `packages/client/src/recording/` — RecordRTC capture core and MIME negotiation.
- `packages/client/components/recording/RecordingControls.tsx` — the presenter recording panel.
- `packages/core/src/server/` — the sync gateway (`gateway.ts`), relay (`hub.ts`), and `/entry` remote (`entry-page.ts`).
- `packages/core/src/drawing/persistence.ts` — drawing persistence to `.astro-slides/drawings/`.
- `packages/cli/src/main.ts` — `dev --remote[=password]`, the QR code, and LAN URL.
- `packages/types/src/frontmatter.ts` — the `drawings:` and `record:` headmatter fields.
