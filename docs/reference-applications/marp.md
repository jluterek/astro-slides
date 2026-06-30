# Marp

## Summary

**Marp** (**Mar**kdown **P**resentation Ecosystem) is a family of tools that turn plain CommonMark Markdown files into HTML/PDF/PPTX/PNG/JPEG slide decks. Authors write a single `.md` file annotated with YAML front-matter and HTML-comment "directives"; a converter splits the document into one `<section>` per slide, applies a CSS theme, and renders the result. The ecosystem is intentionally fragmented into small packages so each layer can be reused independently:

- **Marpit** — the engine. A skinny framework that turns Markdown into a slide-deck HTML/CSS document. Theme-agnostic, ships no built-in look. (`@marp-team/marpit`)
- **Marp Core** — Marpit + a curated bundle of opinionated extras: three built-in themes (`default`, `gaia`, `uncover`), math typesetting (MathJax/KaTeX), fitting headers, auto-scaling, emoji, code highlighting. (`@marp-team/marp-core`)
- **Marp CLI** — command-line tool that wraps Marp Core, drives Chromium (Puppeteer) to export PDF/PPTX/images, runs a watch/preview server, and ships the `bespoke` browser template with keyboard navigation, fragmented lists, page transitions (View Transitions API), and presenter view. (`@marp-team/marp-cli`)
- **Marp for VS Code** — official VS Code extension with live preview, IntelliSense for directives, export commands. (`marp-team/marp-vscode`)
- **Website** — `marp.app`, the docs/landing site (this repo).

The whole ecosystem is TypeScript/Node, MIT-licensed, and maintained primarily by Yuki Hattori (`@yhatt`). It's mature — Marpit framework is on v2, Marp Core on v3, Marp CLI on v2+. Status as of the docs in this repo: actively developed, single-maintainer, "minimal by design".

## What's in this repo

`/Users/jluterek/code/jluterek/slides/reference-applications/marp` is **the entrance / website repo** (`@marp-team/marp`), not the engine. Verified from:

- `/Users/jluterek/code/jluterek/slides/reference-applications/marp/package.json` — name `@marp-team/marp`, marked `private: true`, declares a single workspace `website`, and has no engine code (only Prettier/ESLint/TypeScript tooling).
- `/Users/jluterek/code/jluterek/slides/reference-applications/marp/README.md` — explicitly states "This repo (**marp-team/marp**) is an entrance to the Marp family, and places [our website](https://marp.app/) in `/website`."
- `/Users/jluterek/code/jluterek/slides/reference-applications/marp/netlify.toml` — Netlify deploy config (`publish = "website/out"`, runs `next export`).

The contents are:

- `website/` — a **Next.js 13** + **Tailwind** + TypeScript site that renders the landing page, blog, and docs. It is the only workspace. (`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/package.json`)
- `website/docs/` — the Markdown docs surfaced at `marp.app/docs`. Many pages are intentional **stubs** (e.g. `theme.md`, `marp-cli.md`, `marp-for-vs-code.md` say "This is a stub page!"). The substantive feature docs live in three places:
  1. This site (a small, curated subset),
  2. `marpit.marp.app` (Marpit engine docs — directives, image syntax, theming),
  3. `github.com/marp-team/marp-core` and `…/marp-cli` READMEs (Core extras and CLI behavior).
- `website/blog/` — release notes and a deep-dive on building custom slide transitions; these are by far the richest source of feature info in this repo.
- `website/components/`, `website/pages/`, `website/utils/markdown/` — the Next.js app: a Markdown pipeline (remark + remark-gfm + remark-slug), a `Marp` React component that calls `@marp-team/marp-core` server-side and renders the resulting HTML into a Shadow DOM at runtime.
- `LICENSE` (MIT), `tsconfig.json`, `netlify.toml`, two PNG logos.

The actual engine source lives in separate GitHub repos: `marp-team/marpit`, `marp-team/marp-core`, `marp-team/marp-cli`, `marp-team/marp-vscode`. If we want to study rendering internals we'll need to clone those separately.

## Ecosystem map

| Package | Role | Repo |
| --- | --- | --- |
| `@marp-team/marpit` | Engine: Markdown → slide HTML/CSS. Defines directives, image syntax, theme contract. | https://github.com/marp-team/marpit |
| `@marp-team/marp-core` | Marpit + built-in themes (default, gaia, uncover) + math + emoji + auto-scale + fitting header + code highlight. | https://github.com/marp-team/marp-core |
| `@marp-team/marp-cli` | Command-line converter. Drives Puppeteer for PDF/PPTX/PNG/JPEG. Owns the `bespoke` browser template with transitions, fragmented lists, presenter view. | https://github.com/marp-team/marp-cli |
| `marp-team/marp-vscode` | VS Code extension. Live preview, IntelliSense for directives, export commands. | https://github.com/marp-team/marp-vscode |
| `@marp-team/marp-react` | Inactive. React renderer component. | https://github.com/marp-team/marp-react |
| `@marp-team/marp-vue` | Inactive. Vue renderer component. | https://github.com/marp-team/marp-vue |
| `marp-team/marp-web` | Inactive tech demo. PWA frontend (Preact). | https://github.com/marp-team/marp-web |
| `@marp-team/marp` (this repo) | Umbrella repo + marp.app website. | https://github.com/marp-team/marp |

Marpit and Marp Core are the components our project should care about most. Marp CLI defines the de-facto "what's a Marp deck in the browser" UX (keyboard navigation, transitions, presenter view).

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | CommonMark Markdown + YAML front-matter + HTML-comment directives + GFM extensions (tables, strikethrough, autolinks, emoji shortcodes) |
| Slide separator | Horizontal rule (`---`, `___`, `***`, `- - -`) — or auto-split via `headingDivider` directive |
| Engine stack | Node.js, TypeScript, [markdown-it](https://github.com/markdown-it/markdown-it) for parsing, PostCSS for theme handling |
| Rendering model | One slide per `<section>` element; deck is one HTML document with all sections inline; theme is plain CSS applied to those sections |
| Math | MathJax (default in Core v3+), KaTeX (opt-in via `math: katex`) |
| Code highlighting | highlight.js (server-side) |
| Emoji | markdown-it-emoji + twemoji |
| Browser runtime | Marp CLI's `bespoke` template: keyboard nav, fragmented lists, transitions via View Transitions API, presenter view, fullscreen, on-screen controls |
| Export targets | HTML, PDF, PPTX, PNG, JPEG (PDF/PPTX/image via Puppeteer + headless Chromium) |
| Distribution | npm packages, Homebrew (`brew install marp-cli`), Scoop (`scoop install marp`), Docker (`marpteam/marp-cli`), standalone binary |
| License | MIT |

## Authoring format

A minimal Marp deck:

```markdown
---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #fff
backgroundImage: url('hero.svg')
---

![bg left:40% 80%](marp.svg)

# **Marp**

Markdown Presentation Ecosystem

https://marp.app/

---

<!-- _paginate: false -->

# How to write slides

Split pages by horizontal ruler (`---`). It's very simple!
```

This exact example is in `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/pages/index.tsx` (lines 10–44) — it's the landing-page demo that the Next.js site server-renders by calling `@marp-team/marp-core` directly.

### Directive forms

Documented in `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/directives.md`.

- **YAML front-matter** — first block of the file, between two `---` rulers. Equivalent to placing the same keys in an HTML comment on the first slide.
- **HTML comment** — `<!-- key: value -->` anywhere; affects that slide and (for local directives) subsequent slides.

### Directive scoping

Three behaviors apply to directives:

- **Global** (e.g. `theme`, `style`, `headingDivider`, `size`, `math`, `title`, `author`, `description`, `keywords`, `url`, `image`, `marp`) — apply deck-wide; if redefined, the *last* value wins.
- **Local, inherited** (e.g. `paginate`, `header`, `footer`, `class`, `backgroundColor`, `backgroundImage`, `color`) — apply to the slide where they are defined **and all subsequent slides** until overridden.
- **Local, scoped** ("spot" directives) — same name prefixed with `_` (e.g. `_paginate: false`, `_class: lead`, `_color: blue`). Apply **only** to the slide where they appear; subsequent slides inherit the previous unscoped value.

This three-mode model is one of Marp's most distinctive design choices and is worth copying.

## Features (comprehensive catalog)

Citations point to the file in `website/docs/` that documents the feature; engine ownership (Marpit / Marp Core / Marp CLI) is noted because each feature is implemented in only one layer.

### Slide splitting

- **Horizontal-rule split** — `---`, `___`, `***`, `- - -` all break to a new slide. Source of truth: Marpit. Docs: `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/how-to-write-slides.md` lines 14–42.
- **Heading divider** — `headingDivider: 2` (or any level 1–6, or an array of levels like `[1, 3]`) auto-splits a slide before every heading at the configured level *and all higher levels* (or only the listed levels if given an array). Useful for turning prose articles into slides. Source of truth: Marpit. Docs: `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/heading-divider.md`.

### Directives (global)

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/directives.md` lines 52–67.

| Directive | Purpose |
| --- | --- |
| `marp: true` | Required by Marp for VS Code to treat the file as a Marp deck |
| `theme` | Selects a built-in or registered theme by name |
| `style` | Inline CSS string appended to the theme |
| `headingDivider` | See above |
| `size` | Theme-defined slide size preset (e.g. `16:9`, `4:3`) |
| `math` | `mathjax` (default in Core v3+) or `katex` |
| `title`, `author`, `description`, `keywords`, `url`, `image` | HTML metadata / OpenGraph |

### Directives (local, inherited or scoped via `_` prefix)

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/directives.md` lines 73–84.

| Directive | Purpose |
| --- | --- |
| `paginate` | Show page number on this slide and onward |
| `header`, `footer` | Slide-level header/footer content (supports inline Markdown) |
| `class` | HTML `class` attribute on the slide's `<section>` |
| `backgroundColor`, `backgroundImage`, `backgroundPosition`, `backgroundRepeat`, `backgroundSize`, `color` | Inline CSS shortcuts |
| `transition` (Marp CLI bespoke only) | Slide-transition effect name + optional duration, e.g. `cover 1s` |

### Themes

- Marp Core ships **three built-in themes**: `default`, `gaia`, `uncover`. Source: `https://github.com/marp-team/marp-core/tree/main/themes`. Mentioned at `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/components/top/Features.tsx` lines 142–177.
- The `default` theme is based on [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) so authors get a familiar Markdown look.
- Themes are **plain CSS files**. There is no proprietary theming DSL.
- Theme authors register a theme by name via `/* @theme name */` in a CSS comment; users opt in with the `theme:` global directive.
- Marp Core's themes are customizable via **CSS variables** (Marp Core v2 added this to `gaia` and `uncover`; v3 extended it to `default`). Theme switching can be done with `_class:` local directive (e.g. `_class: invert`, `_class: lead`).
- Inline tweaks: a `<style>` element inside the Markdown, or the `style:` global directive, or `<style scoped>` to scope rules to the current slide's `<section>`. Sourced from Marpit theme docs (engine docs in `marpit.marp.app`, not this repo).
- The website's `theme.md` page is currently a stub: `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/theme.md`.

### Math typesetting

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/math-typesetting.md`.

- Inline: `$ax^2+bc+c$`. Block: `$$ … $$`.
- **MathJax is the default in Marp Core v3+**. KaTeX is opt-in via `math: katex`.
- KaTeX gotcha: `\def` is local to the math block; use `\gdef` for persistence.
- KaTeX requires fetching web fonts from jsDelivr at render time — fails offline.
- mhchem (chemistry) extension requires CLI-side configuration.
- Owned by Marp Core.

### Code highlighting

- Syntax highlighting via **highlight.js**, applied server-side during render.
- Documented inline in `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/how-to-write-slides.md` line 55.
- Owned by Marp Core.

### Emoji

- GitHub-style shortcodes `:smile:` via `markdown-it-emoji`, rendered with twemoji images.
- Owned by Marp Core. Mentioned in `how-to-write-slides.md` line 53.

### Fragmented lists (builds)

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/fragmented-list.md`.

- A bullet list using `*` markers (instead of `-` or `+`) **or** an ordered list using `1)` markers (instead of `1.`) is treated as a fragmented list.
- The Markdown parser merely annotates the list; **the build animation is only realized by Marp CLI's `bespoke` HTML template**. PDF and PPTX exports render fragmented lists as static lists.
- Owned by Marpit (the annotation), realized by Marp CLI (the animation).

### Fitting header (auto-scaled headings)

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/fitting-header.md`.

- Place `<!-- fit -->` inside a heading: `# <!-- fit --> Big Words` — the heading scales to fill one line.
- Marp Core v3 reimplemented auto-scaling as **Web Components** for better CSS-selector compatibility (per release notes in `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/blog/202205-ecosystem-update.md` lines 70–76).
- Owned by Marp Core.

### Auto-scaling

- Built-in `<marp-auto-scaling>` web component (or equivalent) automatically shrinks math blocks, large code blocks, and fitting headers to fit slide width/height. Mentioned in `Features.tsx` line 127 and the v3 blog post.
- Owned by Marp Core.

### Image syntax (Marpit extended)

The website docs page is a stub (`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/image-syntax.md`), but Marpit defines a rich image-syntax extension:

- `![w:300 h:200](url)` — resize.
- `![bg](url)` — use the image as the slide background.
- `![bg left](url)` / `![bg right:40%](url)` — split-background, side panel.
- `![bg cover](url)` / `![bg fit](url)` — fit modes.
- Stackable: multiple `bg` images on one slide auto-tile.
- Filters as keywords: `![blur](url)`, `![sepia](url)`, etc.
- Owned by Marpit. Full reference: `https://marpit.marp.app/image-syntax`.

### Scoped style

- `<style scoped>` inside a slide scopes the CSS to that slide's `<section>`.
- Owned by Marpit. Referenced in `directives.md` line 249.

### Background colors / images via directives

Local directives `backgroundColor`, `backgroundImage`, `backgroundPosition`, `backgroundRepeat`, `backgroundSize`, plus the `![bg](url)` image syntax. Both routes work; the directives are simpler for one-off slides, the image syntax composes better with split layouts.

### Multi-column / multi-region layouts

- Marpit's split-background image syntax (`![bg left:40%]`) gives a left/right text/image split.
- For arbitrary multi-column content, themes typically use CSS grid/flexbox; there is no first-class "two-column" directive.
- Marp Core's `gaia` theme has class-based layout presets (`_class: lead`, `_class: invert`).

### Headers and footers

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/directives.md` lines 282–388.

- `header:` and `footer:` local directives accept inline Markdown (bold, italic, links, inline images).
- Inherited; reset with empty string `header: ''`.

### Pagination

`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/guide/directives.md` lines 192–279.

- `paginate: true` shows page numbers from the current slide onward.
- Common pattern: set `paginate: true` in the front matter and `_paginate: false` (scoped) to suppress on the title slide.

### Slide transitions

Documented in detail in `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/blog/how-to-make-custom-transition.md` and `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/blog/202205-ecosystem-update.md` (lines 156–322).

- **33 built-in named transitions** (`fade`, `cover`, `slide-up`, `zoom`, `gate`, `triangle`, etc.).
- Activated via `transition: <name>` global directive or `<!-- transition: <name> [duration] -->` local directive. Default duration 0.5s.
- Implemented in the browser via the **View Transitions API** (Chrome 110+). PDF/PPTX exports get static slides.
- **Custom transitions** are declared as standard CSS `@keyframes` with conventional names:
  - Simple: `@keyframes marp-transition-<name>` — incoming animation is auto-reversed from the outgoing.
  - Split: `@keyframes marp-outgoing-transition-<name>` + `@keyframes marp-incoming-transition-<name>`.
  - Backward (when navigating back): prefix with `backward-`.
  - Control direction at runtime via the `--marp-transition-direction` CSS variable (`1` forward, `-1` backward).
  - Override default duration by setting `--marp-transition-duration` on the first keyframe.
- **Morphing animations** (Keynote Magic Move / PowerPoint Morph equivalent) come for free via `view-transition-name: <id>` on any element shared between slides.
- Owned by Marp CLI's `bespoke` template (not the engine).

### Export formats (Marp CLI)

From `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/components/top/Features.tsx` lines 181–203 and the install/CLI references:

- **HTML** — standalone deck, includes the `bespoke` runtime (keyboard nav, transitions, fragmented lists, presenter view).
- **PDF** — `--pdf`. Driven by Puppeteer → headless Chromium.
- **PPTX** — `--pptx`. Each slide becomes an image inside a PowerPoint file (so layout is faithful but text isn't editable in PPT).
- **PNG / JPEG** — `--images png`, single-slide PNG/JPEG export.
- **Server / watch mode** — `--server`, `--watch`, `--preview` for live development; `--preview` opens a Chromium preview window.
- Configurable via `marp.config.js` (or `.json`/`.yaml`): set engine options, KaTeX config, theme set, custom HTML template.

### Plugin / extension model

- Marpit exposes a markdown-it-compatible plugin interface; users can register markdown-it plugins to extend syntax.
- Marp CLI accepts a config file that injects a custom engine (subclass Marpit) and additional themes.
- The `directives` system is itself implemented as a Marpit plugin; new directives can be registered programmatically.

### VS Code extension features

From `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/blog/marp-for-vs-code-v1.md` and `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/introduction/install.md`:

- Live Markdown-preview pane shows the deck as slides.
- **IntelliSense for directives** — auto-completion, syntax highlighting, hover help, diagnostics (e.g. "unknown theme name").
- Export commands for PDF/PPTX/HTML/PNG/JPEG.
- Custom theme CSS via `markdown.marp.themes` setting.
- Toggle Marp via toolbar button (adds `marp: true` to front-matter).
- Supports VS Code **Workspace Trust** — restricted features (export, custom themes, HTML) require a trusted workspace.
- Supports **virtual workspaces** (e.g. GitHub Codespaces, Remote Repositories) by internally serving virtual files over HTTP during export.

## Theming

Theming is plain CSS, with three layers of override:

1. **Theme file** — a CSS file with `/* @theme name */` comment, registered via the CLI's `--theme` flag (or `themeSet.add()` in JS).
2. **`style:` global directive** — a multi-line CSS string in the front-matter, appended to the theme.
3. **Inline `<style>` / `<style scoped>`** — declared inside the Markdown body.

Selectors target the slide `<section>` and its descendants. The full HTML structure is documented in Marpit's theme-CSS docs (`https://marpit.marp.app/theme-css`), not in this repo, but the gist:

```html
<section>
  <!-- slide content -->
  <header>…</header>
  <footer>…</footer>
</section>
```

Marp Core themes expose CSS variables for color customization. From the v3 release notes (`/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/blog/202205-ecosystem-update.md` line 84–86): "Allow color customization through CSS variables (See theme docs)". The actual variable names live in `github.com/marp-team/marp-core/tree/main/themes`.

Theme switching mid-deck is done with `_class: invert` (or any class the theme defines).

## Notable libraries & dependencies

From `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/package.json`:

The **website** uses Next.js 13, React 18, Tailwind CSS, Swiper (carousels), Primer Octicons. The Markdown pipeline is **unified + remark-parse + remark-gfm + remark-slug** plus two custom transformers in `website/utils/markdown/parse/`. Importantly the website declares `@marp-team/marp-core` as a **devDependency** — it server-side-renders the demo decks at build time, then renders the HTML/CSS string into a Shadow DOM on the client (see `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/components/Marp.tsx`).

The Shadow DOM is the only piece of the website that is structurally interesting for our purposes — it isolates Marp slide CSS from the host page's Tailwind CSS. The runtime activation of Marp Core's interactive features (auto-scaling, etc.) is just `require('@marp-team/marp-core/browser').browser(root)`.

The **engine** dependencies are not visible in this repo. From the docs they include:

- `markdown-it` (CommonMark parser core)
- `markdown-it-emoji`
- `highlight.js`
- `mathjax-full` and/or `katex`
- `postcss` (theme processing)
- `puppeteer-core` (CLI, for PDF/PPTX/image export)
- `chrome-launcher` (CLI, finding Chrome)
- `yargs` (CLI)
- `bespoke.js` (the `bespoke` template's slide-control library)

If we want to study the actual engine code we should clone `marp-team/marpit` and `marp-team/marp-core` separately.

## Code patterns worth studying

This repo doesn't contain the engine, so most lessons here come from the docs. A few executable patterns are present:

- **Build-time Markdown rendering + Shadow-DOM mount** — `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/components/Marp.tsx` (lines 36–86). The pattern is: call `marp.render(md, { htmlAsArray: true })` server-side, return `{ html, css, fonts }` to the client, then attach a Shadow Root and inject the HTML + a `<style>` block on first paint. Strips `@font-face` rules out of the CSS up front and re-injects them at the document level so fonts actually load (Shadow DOM can't reach document fonts otherwise).
- **Code-fence as live demo** — `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/utils/markdown/parse/marp-code-block.ts`. A remark transformer that walks `code` nodes, finds the ones with `lang` ending in `:marp` (e.g. ` ```markdown:marp `), and pre-renders them with `generateRenderedMarp`. This lets the docs show every code example as both source and rendered preview without manual duplication. We should steal this pattern for our docs.
- **Manifest-driven docs nav** — `/Users/jluterek/code/jluterek/slides/reference-applications/marp/website/docs/manifest.yaml` is the single source of truth for sidebar order/titles; the Next.js page loads it via yaml-loader. Simpler than frontmatter ordering.

Architectural patterns from the docs (engine source not in this repo):

- **One slide per `<section>`** — Marpit's core abstraction. The whole deck is one HTML document, and `<section>` is the unit of CSS scoping. This means a theme is just CSS targeting `section`, `section > h1`, `section.invert`, etc. No virtual DOM, no per-slide component model. This is the most copyable idea for our framework — it composes naturally with regular web tooling.
- **Directives parsed as YAML inside HTML comments** — `<!-- key: value -->` is parsed with `js-yaml` (per Marpit). Front-matter is the equivalent. The `_` prefix means "scoped". This is a tiny, language-agnostic syntax that we should consider adopting verbatim for compatibility.
- **Theme CSS as the only customization layer** — there is no JSX, no template language, no widget API. If you want a layout, you write CSS. The cost is that authoring a complex theme requires real CSS expertise; the benefit is portability and zero lock-in.
- **CLI export via Chromium** — the engine emits an HTML document; the CLI launches Puppeteer, navigates to it, and uses `page.pdf()` / `page.screenshot()` to produce PDF/PNG. PPTX is built by embedding the per-slide screenshots into a `.pptx` zip. The lesson: **don't reimplement layout for each export format**; emit HTML and let Chromium do the rendering for every target.

## Strengths to learn from

- **Markdown-first, plain-CSS theming.** Everything is grep-able, diff-able, and editable in any text editor. No proprietary file format.
- **The directive-scope model.** Global / local-inherited / local-scoped (via `_` prefix) is a compact, learnable rule that covers nearly every real-world need. Worth lifting wholesale.
- **One HTML document = the whole deck.** Easy to host, easy to share, easy to print. The "one `<section>` per slide" convention is a small idea with big consequences.
- **Pluggable engine (Marpit).** Markdown-it ecosystem compatibility means a huge surface of community plugins works out of the box.
- **Multi-format export from a single source.** HTML, PDF, PPTX, PNG, JPEG — all from the same Markdown via Chromium. We should target this from day one.
- **View Transitions API for slide transitions.** Marp CLI's `bespoke` template is one of the cleanest demonstrations of using the browser's native View Transitions API for declarative, CSS-only effects (including Magic Move via `view-transition-name`). Read `how-to-make-custom-transition.md` end-to-end.
- **CSS variables for theme customization** instead of pre-processor variables. Means users can override at any layer (inline, slide-local, deck-global) without rebuilding.
- **Live-rendered code examples in docs.** The `markdown:marp` fence trick keeps documentation honest.

## Weaknesses / pain points

- **Static rendering only — no element-level animations or interactivity.** No fragment ordering beyond the simple "fragmented list" syntax; no per-bullet timing; no rich appear/disappear effects on arbitrary elements. (Slide transitions exist, but element-internal animation does not.) This is the single biggest gap vs Keynote/PowerPoint.
- **No presenter mode in the engine.** Marp CLI's `bespoke` template has a minimal presenter view, but it's far from Keynote's. Speaker notes exist but are limited.
- **PPTX export is image-based.** Slides become images embedded in a `.pptx` — faithful pixel rendering but no editable text once in PowerPoint.
- **Puppeteer/Chromium dependency** for PDF/PPTX/image is heavy (200+ MB) and brittle (Chrome version mismatches, missing fonts, sandbox issues in CI).
- **KaTeX requires online fonts** by default — fails offline. MathJax is now the default for that reason.
- **Most HTML is sanitized away** by default. Embedding rich web components requires opting into raw HTML and disabling sanitization, which then opens an XSS hole if you accept untrusted Markdown.
- **No standardized layout primitives** beyond CSS. Multi-column, split layouts, grids — all DIY in theme CSS. There is no `<columns>` directive.
- **Single maintainer.** The README/blog repeatedly note this; release cadence is good but bus factor is one.
- **Many docs pages in this repo are stubs** (`theme.md`, `marp-cli.md`, `marp-for-vs-code.md`, `image-syntax.md`, `whats-marp.md`, `install.md` all literally say "This is a stub page!"). Real reference info is scattered across `marpit.marp.app` and the various GitHub READMEs.
- **No first-class component model.** Authors can't define reusable slide layouts beyond CSS classes plus the `_class:` directive. There's no "template inheritance" or "include another slide" feature.
- **No native MCP / programmatic editing surface.** All authoring is text + CLI; nothing structured for tooling on top.

## Relevance to our project

Marp is the single most important reference for what we're building. The core authoring model (Markdown + YAML front-matter + HTML-comment directives + plain-CSS themes + horizontal-rule slide breaks) is so widely deployed and so light on lock-in that **we should support reading and rendering Marp-compatible Markdown verbatim**, with as few semantic differences as possible. That gives us instant compatibility with the existing community theme library, the VS Code extension's IntelliSense, and the `awesome-marp` ecosystem of examples and templates. We should also lift directly: the directive scoping rules (global / local-inherited / local-scoped via `_` prefix), the "one `<section>` per slide" rendering model, the View Transitions API approach to slide transitions, and the "render to one HTML document, export via Chromium" CLI pipeline. Where we differ from Marp is in two specific areas worth being explicit about up front: (1) we are web-native and Astro-based, so we can offer per-element animations, real component composition, and richer interactive content that Marp deliberately omits; (2) we have an MCP server, so authoring can be driven programmatically — Marp has no equivalent surface, and this is our biggest leverage point. Treat Marp as the lower bound of compatibility and the upper bound of "minimalism is a feature".
