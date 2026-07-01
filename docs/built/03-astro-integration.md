---
phase: 03-astro-integration
status: distilled
distilled: 2026-06-30
---

# Phase 03 — Astro integration

Where astro-slides goes from library to framework. Wires the parser into Astro so a
project of `.md`/`.mdx` decks yields per-slide URLs, and scaffolds the `astro-slides`
CLI. Archived task notes: `todo/archive/03-astro-integration/`.

## What shipped

**`@astro-slides/core`**
- `integration.ts` — `astroSlides()` `AstroIntegration`. In `astro:config:setup` it adds
  the Vite plugin and `injectRoute`s a prerendered `/[deck]/[slide]`.
- `vite-plugin.ts` — serves the deck manifest as virtual modules
  (`@astro-slides/{slides,configs,layouts,titles}`); watches deck sources and reloads.
- `deck-loader.ts` — discovers (`slides.{mdx,md}` at root, `content/decks/*/`) and parses
  decks (feeding the parser a Node fs so `src:`/snippet imports resolve).
- `render.ts` — `unified` (remark-parse → gfm → remark-rehype → rehype-stringify)
  markdown→HTML.
- `virtual.ts` — `SlideRecord` + module-source generators.
- `content.ts` — `deckCollectionSchema` for a typed Astro content collection.
- `routes/slide.astro` — the injected page: `getStaticPaths` over the slides manifest,
  renders the body via `set:html` with `<ClientRouter />`.

**`@astro-slides/cli`** — `main.ts` (self-contained citty command tree + `node:readline`
TTY shortcuts), `bin/astro-slides.mjs` (calls `runMain`, runs TS source via Node
type-stripping). `dev`/`build` use Astro's programmatic API; `export`/`mcp-server` stub.

**`examples/minimal`** — `astro.config.mjs`, `slides.md`, `src/content.config.ts`.

81 unit tests + a verified `astro build`.

## How to navigate the result

- `packages/core/src/integration.ts` — the entry Astro calls.
- `packages/core/src/vite-plugin.ts` — virtual-module resolve/load + HMR.
- `packages/core/src/routes/slide.astro` — how a slide becomes a page.
- `packages/cli/src/main.ts` + `bin/astro-slides.mjs` — the CLI.
- `examples/minimal/` — the smallest working deck.

## Key decisions

- **Markdown→HTML render, not per-slide MDX compilation.** The reliable, Astro-native
  path for the text-only bar (injectRoute + getStaticPaths + virtual modules + set:html),
  avoiding the fragile "compile a virtual `.mdx` module" route. Full MDX/JSX-island
  rendering is Phase 04; the virtual-module seam makes it a drop-in.
- **Full-reload HMR** via Vite's watcher (invalidate virtual modules → `full-reload`).
  Granular per-slide swap is coupled to the runtime (Phase 04).
- **CLI from TS source** (Node 24 type-stripping): `main.ts` is self-contained (no
  relative imports, which Node wouldn't resolve as `.js`→`.ts`); the `.mjs` bin imports
  it with a literal `.ts` specifier and calls `runMain`. No build step.
- **No `chokidar` dependency** — Vite's built-in watcher (itself chokidar) is idiomatic
  inside a plugin. The locked "chokidar v5" note predates this and v5 doesn't exist yet.
- **`.astro` excluded from Biome** — Biome doesn't parse `.astro` templates, so it
  false-positives template-referenced identifiers as unused imports/vars.

## What surprised us

- **A custom Astro integration + injected route + virtual modules booted cleanly on the
  first real `astro build`** — the delicate part (making Astro compile split slides) was
  sidestepped by rendering HTML ourselves and using `set:html`.
- **Astro accepted our Zod v4 schema** in a content collection (Standard Schema compat),
  so the `deckCollectionSchema` helper works despite Astro bundling its own zod.
- **Node's TS type-stripping needs literal `.ts` import specifiers at runtime**, the
  opposite of what tsc/Vite want (`.js`) — forcing the CLI's runnable entry to be
  import-free of relative modules.

## Loose ends

- **Per-slide MDX/JSX-island compilation** (components in slides) → Phase 04.
- **Granular HMR** (swap one slide without full reload) → Phase 04.
- **`?step=N`** is accepted by the route but read by the runtime → Phase 04.
- **Layouts virtual module** currently exports referenced layout *names*; real layout
  components → Phase 05.
- **`astro-slides dev` programmatic path** is wired but only smoke-tested via `--help` +
  the export stub; a live dev-server e2e comes with Playwright in Phase 04.
- **CLI has no build (`tsup`) yet** — runs from source; packaging for publish → Phase 18.

## Stats

Two packages (~700 LoC) + example; 6 new test files / 19 new tests (81 total). Example
`astro build` → 3 prerendered routes. CI green on PR #3.

---

**Workflow:** Created at phase close, before `todo/03-astro-integration/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
