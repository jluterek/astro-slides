# @astro-slides/cli

## 0.1.2

### Patch Changes

- [#29](https://github.com/jluterek/astro-slides/pull/29) [`3eccfba`](https://github.com/jluterek/astro-slides/commit/3eccfbae08e27dd3744615638923ead981fae7c3) Thanks [@jluterek](https://github.com/jluterek)! - Fix two `export` corruption bugs. (1) The export preview server bound its default port with SO_REUSEPORT, so if `astro-slides dev` was already running the OS silently load-balanced requests between the two servers and the export screenshotted the dev server — dev toolbar and all. The export now reserves a genuinely free port. (2) PNG export (and PPTX rasterized-slide/code screenshots) capture `?embed=1` pages, where the deck background is intentionally transparent — dark decks exported on white. The exporter now restores the theme background unless `--omit-background` asks for transparency.

- [#33](https://github.com/jluterek/astro-slides/pull/33) [`52228dc`](https://github.com/jluterek/astro-slides/commit/52228dcef52f2bfc0e0c5333523627a17d74e786) Thanks [@jluterek](https://github.com/jluterek)! - PPTX/export fidelity: theme colors, backgrounds, blank slides, and a working `--dark`. The DOM walker's color normalization read canvas `fillStyle` back as a string, which modern Chromium serializes as `oklch()` — so every theme color was silently dropped from PPTX exports; it now reads a 1×1 `getImageData` pixel (always sRGB). Slide backgrounds fall back to the deck's theme background instead of exporting on PowerPoint's default white. Slides whose content maps to no editable block (pure visual composition) are auto-rasterized instead of exporting blank. And the `--dark` flag now actually works: the deck/print routes honor `ASTRO_SLIDES_COLOR_SCHEME`, forcing the scheme over the deck's `colorSchema` and the OS default.

- Updated dependencies [[`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b), [`eaca6cc`](https://github.com/jluterek/astro-slides/commit/eaca6cc7026673114182439eecd726d61b689c5a), [`b292d48`](https://github.com/jluterek/astro-slides/commit/b292d4853244b1712150f1324d48a444c36c1895), [`52228dc`](https://github.com/jluterek/astro-slides/commit/52228dcef52f2bfc0e0c5333523627a17d74e786), [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856)]:
  - @astro-slides/core@0.1.2
  - @astro-slides/mcp-server@0.1.2
  - @astro-slides/parser@0.1.2

## 0.1.1

### Patch Changes

- [#24](https://github.com/jluterek/astro-slides/pull/24) [`6f0fbd1`](https://github.com/jluterek/astro-slides/commit/6f0fbd1425c6cdf077c1a36e60a7545f0d7f8340) Thanks [@jluterek](https://github.com/jluterek)! - Report the real package version in the `astro-slides` CLI banner and the MCP server handshake. Both were hardcoded to `0.0.0`; they now read from `package.json` at runtime (working in type-stripped, compiled, and bundled contexts) so the advertised version tracks the published one and can't drift again.

- Updated dependencies [[`6f0fbd1`](https://github.com/jluterek/astro-slides/commit/6f0fbd1425c6cdf077c1a36e60a7545f0d7f8340)]:
  - @astro-slides/mcp-server@0.1.1
  - @astro-slides/core@0.1.1
  - @astro-slides/parser@0.1.1
