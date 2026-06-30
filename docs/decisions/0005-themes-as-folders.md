# 0005. Themes are folders, not npm packages

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Theme distribution models in the reference field:

- **npm package with engine version** (Slidev) — themes are versioned packages with a `slidev` engine constraint. Tweaking a theme requires `slidev theme eject` which forks the package into the user project. High friction for the common "change one color" use case.
- **Single CSS file** (Marp, reveal.js) — minimal but no layouts or components, only styles.
- **JS theme object** (Spectacle via styled-system; MDX Deck via Theme UI) — locked into a styling library that ages with the ecosystem.
- **Folder of files** (no major prior art) — themes as directories of layouts/components/styles, dropped into the user project, resolved by filesystem layering.

Authors overwhelmingly want to customize themes. The "eject to fork" pattern punishes that by removing future upstream updates.

## Decision

A theme is a folder, not a package. Layout:

```
themes/cosmic/
  layouts/         — Astro components matching built-in layout names
  components/      — theme-specific components, auto-imported
  styles/          — CSS, with custom properties for tokens
  theme.config.ts  — optional declarative config (default fonts, color scheme)
  README.md
```

Resolution order: `[built-in, theme, addons, user]` for layouts and components. Later roots silently override earlier ones (same pattern as Slidev's filesystem layering, minus the npm-package requirement).

A theme can be:
- Bundled with astro-slides (e.g., `themes/cosmic/`).
- A directory in a user project (e.g., `<project>/theme/`).
- A git submodule or cloned folder from anywhere.

All theme values flow through **CSS custom properties** (`--slide-bg`, `--slide-fg`, `--slide-accent`, etc.). Authors can override per-slide via frontmatter or inline style.

## Consequences

- Customization is trivial: clone or copy a theme folder, edit a file, done. No publish, no eject step.
- We can still ship themes as repos / tarballs / git submodules — the consumption model is "drop the folder in", not "install the package".
- Theme contracts are typed (layouts conform to a `LayoutComponent` type), so breaking layout-API changes are caught at build time.
- Trade-off: no automatic version compatibility check. If a theme depends on a layout-API that changes, the author finds out at build time. Mitigated by TypeScript types on the theme contract and stable layout API versioning at major releases.
- Trade-off: discoverability — there's no npm registry to browse for themes. We mitigate by maintaining a curated list in the docs site.
