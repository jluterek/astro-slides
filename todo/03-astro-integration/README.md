---
title: Phase 03 — Astro integration
status: pending
started:
ended:
---

## Goal

Wire the parser into Astro. Define the Astro integration (`AstroIntegration`) that registers Vite plugins, content collections, virtual modules, and route generation so that a deck is just a content collection of `.mdx`/`.md` files and per-slide URLs exist out of the box. Also scaffold the `astro-slides` CLI with `dev`, `build`, `export` (stubs) and the in-TTY shortcut handler.

## Exit criteria

- [ ] `@astro-slides/core` exports an `astroSlides()` integration that users `add` to their `astro.config.mjs`.
- [ ] User-declared content collection at `src/content.config.ts` (we provide a Zod schema shim; per-collection remark plugins are **not** supported in Astro 5+, so we register plugins globally).
- [ ] Each slide gets a route at `/<deck>/<slide-no>` and a deep link supporting `?step=N` query.
- [ ] Virtual modules expose: `@astro-slides/slides`, `@astro-slides/layouts`, `@astro-slides/configs`, `@astro-slides/titles`.
- [ ] Hot reload of `.mdx`/`.md` is granular via `chokidar` v5 watcher + custom HMR events.
- [ ] `<ClientRouter />` (from `astro:transitions`) enabled on slide routes.
- [ ] CLI scaffold via `citty`: `astro-slides dev [entry]` and stubs for `build` and `export`. TTY shortcuts (`r/o/e/q/c/m/?`) wired via `node:readline` keypress events.
- [ ] A demo project under `examples/minimal/` boots with `astro-slides dev` and renders the first slide (text-only, no styling).

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

_Fill in when the phase closes._
