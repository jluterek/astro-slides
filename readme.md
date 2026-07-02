# astro-slides

The best way to create and share slides on the internet.

astro-slides is a web-native presentation framework for people who want their decks to feel as alive as the work they describe. Write in Markdown and MDX, animate like a designer, present like a pro, and share with a URL — no app to install, no PDF to email. Built on Astro, fully typed, and the first deck framework with a first-class MCP server so an AI can author and drive your slides.

## Why astro-slides

Presentations live on the web now. They get shared in chats, embedded in blog posts, watched on phones, and revisited months later. The dev community has produced great web deck frameworks — reveal.js, Slidev, Spectacle, Marp — but each picks a corner of the problem and leaves the rest on the table. astro-slides is the one that picks the whole table.

- **Author with the web.** Markdown, MDX, React, and Astro components — the same tools you already use. Compatible with Marp and Slidev syntax, so existing decks work unchanged.
- **Share with a link.** Every deck is a website. Every slide has its own URL. Embed a single slide into a blog post with one tag.
- **Animate like Keynote.** Object continuity between slides via the View Transitions API, with a FLIP-based fallback for older browsers. Code animates with Shiki Magic Move. Lists step. Diffs morph.
- **Built for code.** Syntax highlighting (Shiki + Twoslash), animated code diffs (Magic Move), Mermaid, KaTeX, PlantUML. Out of the box, not bolt-ons.
- **AI-native authoring.** Ships with a real MCP server — not just a skill bundle. Claude, Cursor, and any MCP-aware client can read, write, present, and export your decks programmatically.
- **Honest exports.** PDF, PNG, and real editable PPTX (via PptxGenJS, not image rasterization). What survives the export is what an OOXML file can actually express; we tell you up front when something won't.

## Tech Stack

- **[Astro](https://astro.build)** — Ships zero JavaScript by default, hydrates only what needs it. Decks load fast and embed cleanly into any Astro site.
- **TypeScript** — Fully typed APIs and components, end to end. Frontmatter has a JSON Schema generated from the types.
- **MDX** — Authoring format. Markdown for prose, JSX for components, frontmatter for config.
- **[Shiki](https://shiki.style)** + **[`@shikijs/magic-move`](https://github.com/shikijs/shiki-magic-move)** — TextMate-grade syntax highlighting and animated code diffs.
- **[Drauu](https://github.com/antfu/drauu)** — Drawing and annotation overlay.
- **[RecordRTC](https://recordrtc.org/)** — Camera, mic, and screen recording.
- **[PptxGenJS](https://gitbrent.github.io/PptxGenJS/)** — Real editable `.pptx` export.
- **[Playwright](https://playwright.dev)** — Headless export pipeline; optional, browser-native print is the default.
- **MCP Server** — First-class agent integration. Tools for listing, reading, writing, navigating, and exporting decks live alongside the runtime.

## Authoring

astro-slides reads three flavors of source, with no migration required:

- **`.mdx` (recommended).** Markdown for prose, JSX for components, frontmatter for config, slot sugar (`::right::`) for layouts. The trailing HTML comment of each slide is the speaker note.
- **`.md` (Marp / Slidev compatible).** YAML frontmatter, `---` slide separators, HTML-comment directives, fragmented lists. Existing Marp and Slidev decks render as-is.
- **`.astro`** for full-power custom slides when you want to drop down to a single component.

Every authoring mode benefits from the same things:

- **Slot sugar** (`::right::`) for two-column and split layouts.
- **External snippet imports** — `<<< @/snippets/auth.ts#region {twoslash}` — so demo code lives next to the implementation.
- **Slide imports** — `src: ./sections/intro.mdx` in frontmatter — for composing decks from reusable sections.
- **Auto-imported components** from `components/` and the active theme.
- **Hot reload** via Vite — edit a slide, the deck refreshes in place.
- **Git-friendly source.** Plain text. No opaque JSON, no binary blobs.

## Layouts & themes

- **Filesystem-layered themes.** Drop a `.astro` file in `layouts/`, `components/`, or `styles/`. Later roots silently override earlier ones — built-ins, then the active theme, then addons, then your project. No registration, no manifest.
- **Themes are folders, not packages.** Clone a theme, tweak a color, commit it. No `npm publish`, no eject step.
- **CSS custom properties drive every theme value.** Override `--slide-bg` per slide. Swap the palette with a single attribute. Themes inherit from the design tokens, not the cascade.
- **21 built-in layouts** — `cover`, `default`, `center`, `intro`, `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`, `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`, `404`, `error`. Override any of them by shipping the same filename in your theme.
- **Layout primitives** — `Stack`, `Grid`, `Wrap`, `FlexBlock`, `FitText` — so you rarely reach for inline styles.
- **Design DNA worth showing off.** Default themes ship with curated palettes, an 8-pixel rhythm, and landing-page-quality typography. Decks look like they came from a designer, even when they didn't.

## Code-first

Most decks worth giving have code in them.

- **Shiki syntax highlighting** with VS-Code-grade themes, line numbers, and `{1|3-5|9}` per-step line highlighting.
- **Shiki Magic Move** for animated diffs between code states — your function refactor literally morphs.
- **Twoslash hover popovers** show inferred types right in the slide.
- **Mermaid, KaTeX, and PlantUML** built in, with click-step reveals.
- **Charts** via any React library — slides are MDX, so import Recharts, Chart.js, or D3 straight into a slide. None required, none bundled.
- **MDX everywhere** so a slide can import the very component it's demoing. The demo and the deck are the same code.

## Layout, animation, and continuity

Move from a wall of text to a designed presentation without leaving the editor.

- **Object continuity between slides** via the View Transitions API, with paired `view-transition-name` elements morphing position, size, and style. FLIP-based fallback for browsers without View Transitions, modeled on reveal.js's Auto-Animate.
- **Per-slide transitions** — set a deck-wide default in headmatter, override it on any slide. Not a single global preset.
- **Click steps** as a first-class primitive. `<Click>`, `<Clicks>`, `<After>`, ranges, absolute and relative positions. Steps are resolved at parse time — no mount-time discovery — so the presenter view, exports, and AI agents all see the same plan.
- **Grid-based layouts** for consistent alignment across a deck.
- **Overview mode** for seeing the whole deck at a glance and jumping anywhere in it.

## Presenter mode

Everything you need on stage, nothing you don't.

- **Speaker view** at `/presenter/:n` — current slide, next slide preview (with its own click context, so you see what the next click will do), notes, timer, clock.
- **Deck timer** — a stopwatch by default, or a countdown when the deck declares `duration: 35min` in headmatter.
- **Laser pointer and freehand drawing** via Drauu, with brush colors, shapes, undo/redo, and persistent annotations.
- **Phone-as-clicker** — bind to `0.0.0.0` with one flag, print a QR code, your phone becomes a touch-friendly remote.
- **Camera and screen recording** in the box — two streams (presenter + screen), Web-MIME negotiation, automatic duration repair. Capture a deck as a video without leaving the browser.
- **Blackout / Q&A toggle** for side conversations.
- **Cross-window sync** via `BroadcastChannel` (same-origin) with WebSocket fallback for remote phones.

## Export and distribution

Your deck, in whatever format the moment calls for.

- **PDF** — Browser-native print by default; Playwright for high-fidelity output when you need it. Cross-slide links, optional TOC outline, with-clicks or without.
- **PNG** — One image per slide, or one image per click step.
- **PPTX with real editable text** via PptxGenJS — text frames stay editable, lists stay bullets, tables stay tables. We document the fidelity gaps up front (CSS-only effects, web components, animations don't survive OOXML), and fall back to image-only PPTX per-slide for content that can't be expressed natively.
- **Standalone HTML bundle** for offline presenting.
- **Static SPA build** for hosting on GitHub Pages, Netlify, or anywhere else.
- **Per-slide deep links** and embeddable single slides — perfect for blog posts and docs.
- **Print and handout layouts** for the audience that wants paper.

## Interactivity and live content

Slides that stay current and respond to the room.

- **Present-time data** — slides are MDX, so a hydrated island can fetch live dashboards and latest metrics as you present.
- **Interactive demos as slides** — clickable state, not just embedded video.
- **Audience polls, Q&A, and reactions** for live engagement — the audience joins by QR code over the same sync gateway that powers the phone remote *(in development — the next phase after 1.0; see the [roadmap](#roadmap))*.

## Accessibility and polish

- **Keyboard navigation** and screen reader labels throughout, with an `aria-live` status region announcing slide and fragment changes.
- **Responsive scaling** so a 16:9 deck doesn't look broken at 4:3 or on mobile.
- **Dark and light theme variants** of the same deck, with `prefers-color-scheme` respected and overridable per deck.
- **Reduced-motion mode** automatically softens transitions when the OS asks.

## Distribution as a site

astro-slides isn't just one deck — it's your slide library on the web.

- A **full website** that showcases every deck you've ever given.
- **Easy embed** into existing Astro sites, so your deck library lives next to your blog.
- Every deck gets a permanent URL; every slide gets a deep link; every slide can be embedded standalone in an `<iframe>`.

## AI-assisted authoring

Most decks frameworks now ship "a Claude Code skill" — a bundle of docs the model reads. astro-slides goes further: a **real MCP server** lives in the CLI.

```bash
astro-slides mcp-server
```

That gives any MCP-aware client (Claude Code, Cursor, Windsurf, Continue, custom agents) tools to:

- `list_decks`, `list_slides`, `get_slide`, `add_slide`, `update_slide`, `delete_slide`
- `set_frontmatter`, `set_theme`, `get_speaker_notes`, `list_layouts`, `list_themes`
- `next_slide`, `prev_slide`, `goto_slide`, `set_step`
- `screenshot_slide`, `export_pdf`, `export_pptx`, `export_png`, `export_md`

A curated skill bundle ships alongside, so models without MCP support still get rich, structured reference docs in their context.

## Roadmap

What's next after 1.0, in order:

- **Audience engagement** — polls, Q&A, and emoji reactions, live on the slide. The audience joins by QR code over the sync gateway that already powers the phone remote. See [`todo/19-audience-engagement`](./todo/19-audience-engagement/README.md).
- **VS Code extension** — slide preview and navigation in the editor.

## Software details

- Extensive unit test suite (Vitest) plus end-to-end tests (Playwright)
- Fully typed, end to end — public types inferred from Zod schemas
- Hot reload via Vite

## Project structure

```
slides/
├── docs/
│   └── reference-applications/   # Deep-dive research on prior art (reveal.js, Slidev, Spectacle, Marp, etc.)
├── reference-applications/       # Source of the projects studied during design
├── todo/                         # Open design questions and tracked work
└── readme.md
```
