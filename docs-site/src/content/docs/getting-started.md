---
title: Getting started
description: Scaffold a deck project, author your first slide, and run the dev server.
---

astro-slides is a web-native presentation framework built on Astro. A deck is an
ordinary Astro project with the `astroSlides()` integration installed; you author
slides in Markdown/MDX and drive everything through the `astro-slides` CLI.

:::caution[pnpm only]
**pnpm** is the only supported package manager. Do not use `npm` or `yarn`.
Do **not** enable Corepack (it was removed in Node 25+) — install pnpm with the
standalone installer instead:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```
:::

## Create a new deck

The fastest path is the scaffolder, which lays down a ready-to-run project:

```bash
pnpm create astro-slides my-talk
cd my-talk
pnpm install
pnpm astro-slides dev
```

`my-talk` is the target directory. The scaffolder writes an `astro.config.mjs`
with the integration wired up, a starter `slides.mdx`, and a `package.json` that
already depends on the CLI, core, and client packages.

## Add astro-slides to an existing project

If you already have an Astro project (or want to add a deck to a repo), install
the packages and register the integration by hand:

```bash
pnpm add @astro-slides/cli @astro-slides/core @astro-slides/client
```

Then add the integration to your Astro config:

```js
// astro.config.mjs
import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [astroSlides()],
});
```

A convenient `dev` script wires the CLI into `pnpm dev`:

```json
{
  "scripts": {
    "dev": "astro-slides dev",
    "build": "astro build"
  }
}
```

## Project shape

A minimal deck project only needs two things: the Astro config and a slide
source file.

```
my-talk/
├── astro.config.mjs      # registers astroSlides()
├── package.json
└── slides.mdx            # your deck (or content/decks/<name>/slides.mdx)
```

A single-deck project can keep `slides.mdx` (or `slides.md`) at the root. For a
library of decks, put each one under its own folder:

```
content/decks/
├── intro/slides.mdx
└── q3-review/slides.mdx
```

:::note[Authoring formats]
`.mdx` is the recommended format (Markdown prose + JSX components + frontmatter).
Plain `.md` is supported for Marp / Slidev compatibility, and `.astro` is an
escape hatch for full-power custom slides.
:::

## Author your first slide

Slides are separated by a `---` fence. The block at the very top is the deck
**headmatter** (deck-wide config); a `---` fence followed by a YAML block
introduces per-slide frontmatter.

```mdx
---
title: My Talk
theme: starter
---

# Hello, astro-slides

A web-native presentation framework.

<!--
This trailing HTML comment is the speaker note for this slide.
-->

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
layout: center
---

## Centered

Content centered on both axes via the `center` layout.
```

A few things worth noting from that example:

- **`---` separates slides.** A `layout:` key in a slide's frontmatter selects
  one of the built-in layouts (`cover`, `center`, `two-cols`, `section`,
  `quote`, `fact`, `end`, and more).
- **`::right::`** is slot sugar that splits content into the layout's named
  regions — here, the two columns of `two-cols`.
- **The trailing `<!-- ... -->`** of a slide is its speaker note, visible in
  presenter mode.

## Run the dev server

From the project root:

```bash
pnpm astro-slides dev
```

This boots the Astro dev server with hot reload. Open the printed URL to view the
deck; each slide has its own URL (e.g. `/<deck>/3`), and a presenter view lives
at `/presenter/<deck>/<n>`. If a project has **more than one deck**, the root URL
(`/`) shows a **dashboard** listing them all with open / present / print links; a
single-deck project redirects straight to the first slide. From any slide, press
**`P`** to open the presenter view for the current spot in a new tab.

While the server runs, single-key shortcuts are available in the terminal —
press `?` to list them. See the [CLI reference](/reference/cli/) for the full
set.

:::tip[Present from your phone]
`pnpm astro-slides dev --remote` binds to your LAN and prints a QR code, turning
a phone into a touch remote. Add a password with `--remote=<password>`.
:::

## Where to go next

- [Markdown and MDX authoring](/authoring/markdown-and-mdx/) — prose, components, and slide syntax.
- [Frontmatter](/authoring/frontmatter/) — deck headmatter and per-slide config keys.
- [Layouts](/design/layouts/) — the built-in layouts and layout primitives.
- [Themes](/design/themes/) — swapping and customizing the deck's look.
- [Click model](/interactivity/click-model/) — `<Click>`, `<Clicks>`, and stepped reveals.
- [Web export](/export/web/) and [PPTX export](/export/pptx/) — PDF, PNG, HTML, and editable PowerPoint.
- [MCP server](/integrations/mcp-server/) — let an AI agent read, write, and drive your decks.

## Source

- `packages/cli/src/main.ts` — the CLI entry point and command surface.
- `examples/minimal/` — a runnable minimal deck (`astro.config.mjs`, `slides.md`, `package.json`).
- `readme.md` — the project vision and feature scope.
