# @astro-slides/cli

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @astro-slides/core@0.3.1
  - @astro-slides/parser@0.3.1
  - @astro-slides/mcp-server@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [[`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421)]:
  - @astro-slides/core@0.3.0
  - @astro-slides/parser@0.3.0
  - @astro-slides/mcp-server@0.3.0

## 0.2.0

### Minor Changes

- [#44](https://github.com/jluterek/astro-slides/pull/44) [`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318) Thanks [@jluterek](https://github.com/jluterek)! - Audience engagement (Phase 19): live polls, moderated Q&A, and emoji reactions. Declare a `<Poll id question options>` in MDX and the results tally live on the slide as the audience votes from their phones — one revisable vote per device, closable by the presenter, persisted across refreshes like drawings. Spectators join via the new `/audience` page (printed as a QR beside the remote QR under `dev --remote`), scoped server-side to vote/ask/react — audience connections can never navigate or draw. Questions land in a presenter-view moderation panel (show/dismiss; a shown question banners on the deck), and reactions float over the slides with a sprite cap. Also fixes a latent Phase 11 bug: the gateway's WebSocket handler corrupted Vite's HMR socket, reload-looping every page under `dev --remote`.

- [#42](https://github.com/jluterek/astro-slides/pull/42) [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f) Thanks [@jluterek](https://github.com/jluterek)! - Embedding into an existing Astro site is now first-class ([#39](https://github.com/jluterek/astro-slides/issues/39), [#40](https://github.com/jluterek/astro-slides/issues/40), [#41](https://github.com/jluterek/astro-slides/issues/41)). `astroSlides({ prefix: "/slides" })` namespaces every injected route — deck viewer, presenter, print, and the redirect/dashboard (which moves to `<prefix>/`) — so decks live inside a host site without claiming its top-level namespace; navigation, the presenter-launch shortcut, dashboard links, and `astro-slides export` all understand the prefix (export auto-detects it in the built output). `injectRoot: false` skips the root route entirely for hosts that own their homepage, and the 404.html static-host fallback no longer runs (or clobbers the host's 404) when embedding. `scopedReact: true` confines the bundled React renderer to astro-slides' own islands so a host's Solid/Preact/Vue-JSX renderer keeps `.jsx`/`.tsx` for its files. A new docs page ("Embedding in an existing Astro site") plus the runnable `examples/embedded-site` cover the setup, including `@astrojs/mdx` coexistence.

### Patch Changes

- Updated dependencies [[`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318), [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f)]:
  - @astro-slides/core@0.2.0
  - @astro-slides/parser@0.2.0
  - @astro-slides/mcp-server@0.2.0

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
