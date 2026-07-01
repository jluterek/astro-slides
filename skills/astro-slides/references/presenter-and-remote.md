# Presenter mode, drawing & remote

How to drive an astro-slides deck live: a speaker view, freehand drawing and a laser pointer, in-browser recording, and a phone-as-remote — all kept in sync across windows and devices.

## Presenter mode

Open the speaker view at the `/presenter/<deck>/<n>` route (where `<deck>` is the deck slug and `<n>` is the 1-based slide number). It is a three-pane layout:

- **Current slide** — an iframe pointed at the normal `/[deck]/[slide]` route, so every layout, code block, math, and transition renders exactly as the audience sees it.
- **Next preview** — a second iframe of the *upcoming* slide with its own click context (loaded in `?as-preview` follow-only mode, driven one click ahead of the main window).
- **Notes + timer** — the slide's speaker notes plus a timer and prev/next controls.

The panes are drag-resizable; sizes persist to `localStorage`.

### Cross-window sync

The audience window and the presenter view stay in sync over `BroadcastChannel` (same-origin). Local navigation broadcasts a `goto`; a remote `goto` mirrors the URL with a *replace* (no history noise). Whatever you do in the presenter view — advance, go back, blackout — reflects in the audience window immediately, and vice versa. Open the audience deck in one window (e.g. on the projector) and `/presenter/<deck>/<n>` in another.

### Speaker notes

Notes come from the trailing HTML comment on each slide (one notes block per slide, rendered to HTML at build time). Inline `[click]` or `[click:N]` markers in the notes highlight as you step through the slide's click stages, so you can pace narration to reveals.

### Timer

The timer runs as a stopwatch, or as a countdown when the deck sets a `duration:` in its headmatter. It syncs an epoch start time plus elapsed-before-pause (never a computed elapsed), so it can't drift between windows. Time strings accept forms like `"30min"`, `"1:05"`, `"2:30:00"`, or a bare number (minutes).

### Blackout

Press `B` to toggle a full-screen blackout overlay. It syncs across windows, so blacking out the presenter view also blanks the audience screen.

### Command palette

Press `K` or `/` to open the `cmdk` command palette. It is currently a **jump-to-slide** palette — type to filter and select a slide to navigate there.

### Keyboard shortcuts (presenter view)

| Key(s) | Action |
| --- | --- |
| `→` / `Space` / `PageDown` | Next slide or click step |
| `←` / `PageUp` | Previous |
| `B` | Toggle blackout |
| `F` | Fullscreen |
| `K` / `/` | Command palette (jump to slide) |

## Drawing overlay

Toggle the freehand drawing overlay with the `d` key. It is a drauu-powered `<svg>` mounted in the deck's design coordinate space, so annotations ride the viewport transform and stay resolution-independent at any window size.

A floating toolbar offers stylus / pen / line / arrow / rect / ellipse / eraser modes, six colors, and undo / redo / clear. Each stroke is stored per slide-step (keyed `"<no>:<step>"`): switching slides loads that step's saved drawing, and annotations sync live across windows. When the remote gateway is running, drawings are also POSTed to disk under `<root>/.astro-slides/drawings/<deck>/` (gitignored).

## Laser pointer

Toggle laser mode with the `l` key. While active, the pointer position is emitted as a normalized point and rendered as a laser dot in every synced window — good for pointing at content on a remote audience screen.

## Recording

In-browser recording is driven from a control panel in the presenter view. It captures the **screen** (`getDisplayMedia`) and/or **camera + mic** (`getUserMedia`) as *separate clips* via RecordRTC (lazily imported when you start recording). The panel provides a device picker, screen/camera toggles, a file-name stem, and per-clip download links after you stop; a `beforeunload` guard warns you before navigating away mid-recording.

Notes:
- Screen and camera are separate files, not a composited picture-in-picture.
- The WebM container's duration is repaired on stop.
- Production recording needs HTTPS (`getUserMedia`/`getDisplayMedia` require a secure context; `localhost` is exempt).

## Mobile phone remote

Run the dev server with the `--remote` flag to expose a phone remote over the LAN:

```bash
astro-slides dev --remote
```

This binds `0.0.0.0`, starts a Hono/WebSocket **sync gateway** on the dev server, and prints a QR code plus the LAN URL to the terminal. Scan the QR with your phone (on the same network) to open a touch remote at `/entry` with prev / next, blackout, and a laser pad.

The remote's actions flow through the same sync layer as everything else: a local `dispatch` fans out to `BroadcastChannel` *and* the WebSocket, and the idempotent draw/laser/blackout actions make double-delivery harmless.

### Optional password / token

Pass a password to require a shared-secret token on the remote URL:

```bash
astro-slides dev --remote=mysecret
```

The gateway derives a token from the password and bakes it into the QR/LAN URL. This is **LAN convenience only** — a URL-query token, not a real security boundary, and there is no TLS.

### Limits

- **Same-LAN only.** A public URL / `--tunnel` is out of scope; the remote works only for devices on the same network.
- **Whole-slide navigation.** The phone remote advances by absolute slide (`goto`), not per-click steps.
- Remote sync (WebSocket) only runs under `dev --remote`; static builds never open a socket.
