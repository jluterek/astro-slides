---
title: Phase 03 — Astro integration
status: done
started: 2026-06-30
ended: 2026-06-30
---

## Goal

Wire the parser into Astro. Define the Astro integration (`AstroIntegration`) that registers Vite plugins, content collections, virtual modules, and route generation so that a deck is just a content collection of `.mdx`/`.md` files and per-slide URLs exist out of the box. Also scaffold the `astro-slides` CLI with `dev`, `build`, `export` (stubs) and the in-TTY shortcut handler.

## Exit criteria

- [x] `@astro-slides/core` exports an `astroSlides()` integration that users `add` to their `astro.config.mjs`.
- [x] User-declared content collection at `src/content.config.ts` (`deckCollectionSchema` helper; verified the example builds with it). Plugins are registered globally (per-collection unsupported).
- [x] Each slide gets a route at `/<deck>/<slide-no>`. `?step=N` is accepted (a static route); the runtime *reads* the step in Phase 04.
- [x] Virtual modules expose: `@astro-slides/slides`, `@astro-slides/layouts`, `@astro-slides/configs`, `@astro-slides/titles`.
- [~] Hot reload of `.mdx`/`.md` — **full reload** via Vite's watcher on deck-source change (invalidates the virtual modules). Granular per-slide swapping needs the runtime; deferred to Phase 04. See *Outcome*.
- [x] `<ClientRouter />` (from `astro:transitions`) enabled on slide routes — verified in built output.
- [x] CLI scaffold via `citty`: `astro-slides dev [entry]` + `build`, `export`/`mcp-server` stubs. TTY shortcuts (`r/o/e/c/m/q/?`) via `node:readline`.
- [x] A demo under `examples/minimal/` boots and builds — `astro build` emits `/slides/1..3` with rendered content (verified HTML).

## Locked decisions

- **View transitions API:** `<ClientRouter />` from `astro:transitions` (renamed from `<ViewTransitions />` in Astro 5; latter removed in v6).
- **CLI framework:** `citty` (lazy subcommands matter for `dev` vs `build` startup).
- **TTY shortcuts:** `node:readline` keypress events (citty doesn't bind keys).
- **Terminal output:** `picocolors`.
- **File watching:** `chokidar` v5 + `tinyglobby` for globs.
- **Route generation:** `injectRoute` + `astro:routes:resolved` (new in v5) for resolved-route inspection.
- **Content collection schema:** Zod (Astro native). Decks live at `content/decks/<name>/slides.mdx` for multi-deck; single-deck mode accepts `slides.mdx` at project root.
- **Hot reload model:** per-slide module + per-slide frontmatter module (Slidev's pattern) so frontmatter-only edits don't rebuild the SFC.

## Tasks (planned)

- `astroSlides()` integration scaffold (`astro:config:setup` hook)
- Vite plugin: register virtual modules
- Vite plugin: per-slide loader (markdown ID + frontmatter ID, à la Slidev)
- Per-slide route generator using `injectRoute`
- HMR handling: chokidar watch + custom `astro-slides:update-slide` events
- Content collection schema generator (we ship a helper users add to `src/content.config.ts`)
- CLI scaffold (`packages/cli`) with citty
- TTY keypress handler
- Demo project (`examples/minimal/`)
- Integration tests with Astro's test harness

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Integration scaffold + Vite plugin shape | sequential — they reference each other |
| After scaffold | **virtual modules, route generator, HMR handler, CLI scaffold** — four parallel agents possible |
| After all | Demo project, integration tests |

## Dependencies

- Phase 01 (foundation)
- Phase 02 (parser — the AST it produces is what we serve from virtual modules)

## Risks

- **`astro:routes:resolved` is new in v5.** If we're pinned to an older Astro, fallback to inspecting at `astro:build:done`.
- **Per-collection remark plugins not supported.** Locked. Document the workaround (global plugins, behavior keyed off file path).
- **Vite plugin ordering** can cause subtle HMR issues. Reference Slidev's `vite/loaders.ts` for the patterns.

## Notes

This is where the project goes from "library" to "framework". The integration boundary is delicate — we want to be a good citizen of Astro's lifecycle.

Reference: `docs/reference-applications/slidev.md` § *Architecture* and *Code patterns worth studying* / *Slide route generation (Vite plugin pattern)*.

`astro-slides export` is a stub here (real implementation in Phase 12). Same for `astro-slides mcp-server` (Phase 14). The CLI scaffold registers the commands but they error with "not implemented" until their phases.

## Outcome

All exit criteria met (one partial); CI green on PR #3. Distilled to
[`docs/built/03-astro-integration.md`](../../docs/built/03-astro-integration.md).

**Shipped:** `@astro-slides/core` (integration + virtual-modules Vite plugin + md→html
render + injected route + content-collection helper) and `@astro-slides/cli` (citty CLI
+ TTY shortcuts, runnable from TS source). `examples/minimal` boots and builds.

**Verified for real:** `astro build` of the example emits `/slides/1..3` with rendered
`<h1>`/lists, `data-layout` resolved (`cover`/`default`/`center`), notes stripped, and
ClientRouter/view-transition markup present. Plus 81 unit tests and CLI `--help`.

**Key decisions / deviations (see built doc):**
- **Rendering is markdown→HTML** (unified) for the text-only bar, not per-slide MDX
  compilation. The virtual-module seam keeps full MDX/JSX-island rendering a drop-in for
  Phase 04. Answered honestly rather than shipping risky virtual-MDX code.
- **HMR is full-reload**, not granular per-slide. Granular swapping is coupled to the
  runtime state machine (Phase 04); the invalidation seam is in place.
- **CLI runs from TS source** via Node 24 type-stripping (self-contained `main.ts`, bin
  calls `runMain`) — no build step needed. `dev`/`build` use Astro's programmatic API.
- **`chokidar` not added** — used Vite's built-in watcher (which is chokidar) inside the
  plugin, the idiomatic approach. The locked "chokidar v5" note predates this; v5 also
  doesn't exist yet (current is v4).
- **`.astro` excluded from Biome** — Biome doesn't parse `.astro` templates, so it
  flags template-referenced identifiers as unused.
