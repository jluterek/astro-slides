# @astro-slides/core

## 0.3.0

### Minor Changes

- [#46](https://github.com/jluterek/astro-slides/pull/46) [`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421) Thanks [@jluterek](https://github.com/jluterek)! - Read mode ([#45](https://github.com/jluterek/astro-slides/issues/45)): the annotated-presentation format as a first-class output. A reserved `::read::` slot holds per-slide companion prose — sources, the spoken argument, detail that would crowd a slide — rendered **only** on the new prerendered `/read/<deck>` route: every slide as a static theme-styled block (all click steps revealed, scaled to a readable article column, phone-friendly) with its prose flowing beneath, per-slide anchors (`#slide-N`) for deep links, and Present/Print header links. Excluded from deck, presenter, print, PPTX, and image outputs; speaker notes unchanged and private; read-slot clicks never widen a slide's step count. Discoverable from the `?` help overlay ("Open reading view") and the multi-deck dashboard; respects the embedding `prefix`.

### Patch Changes

- Updated dependencies [[`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421)]:
  - @astro-slides/client@0.3.0
  - @astro-slides/types@0.3.0
  - @astro-slides/parser@0.3.0

## 0.2.0

### Minor Changes

- [#44](https://github.com/jluterek/astro-slides/pull/44) [`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318) Thanks [@jluterek](https://github.com/jluterek)! - Audience engagement (Phase 19): live polls, moderated Q&A, and emoji reactions. Declare a `<Poll id question options>` in MDX and the results tally live on the slide as the audience votes from their phones — one revisable vote per device, closable by the presenter, persisted across refreshes like drawings. Spectators join via the new `/audience` page (printed as a QR beside the remote QR under `dev --remote`), scoped server-side to vote/ask/react — audience connections can never navigate or draw. Questions land in a presenter-view moderation panel (show/dismiss; a shown question banners on the deck), and reactions float over the slides with a sprite cap. Also fixes a latent Phase 11 bug: the gateway's WebSocket handler corrupted Vite's HMR socket, reload-looping every page under `dev --remote`.

- [#42](https://github.com/jluterek/astro-slides/pull/42) [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f) Thanks [@jluterek](https://github.com/jluterek)! - Embedding into an existing Astro site is now first-class ([#39](https://github.com/jluterek/astro-slides/issues/39), [#40](https://github.com/jluterek/astro-slides/issues/40), [#41](https://github.com/jluterek/astro-slides/issues/41)). `astroSlides({ prefix: "/slides" })` namespaces every injected route — deck viewer, presenter, print, and the redirect/dashboard (which moves to `<prefix>/`) — so decks live inside a host site without claiming its top-level namespace; navigation, the presenter-launch shortcut, dashboard links, and `astro-slides export` all understand the prefix (export auto-detects it in the built output). `injectRoot: false` skips the root route entirely for hosts that own their homepage, and the 404.html static-host fallback no longer runs (or clobbers the host's 404) when embedding. `scopedReact: true` confines the bundled React renderer to astro-slides' own islands so a host's Solid/Preact/Vue-JSX renderer keeps `.jsx`/`.tsx` for its files. A new docs page ("Embedding in an existing Astro site") plus the runnable `examples/embedded-site` cover the setup, including `@astrojs/mdx` coexistence.

### Patch Changes

- Updated dependencies [[`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318), [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f)]:
  - @astro-slides/client@0.2.0
  - @astro-slides/types@0.2.0
  - @astro-slides/parser@0.2.0

## 0.1.2

### Patch Changes

- [#35](https://github.com/jluterek/astro-slides/pull/35) [`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b) Thanks [@jluterek](https://github.com/jluterek)! - Dashboard links now target each deck's actual first built slide instead of a hardcoded `/1` — a deck whose first slide is `hide: true` starts at slide 2, so Open/Present links 404'd (the single-deck redirect already handled this). The `?` help overlay now documents the `L` (laser pointer) and `D` (drawing) shortcuts, which were bound but unlisted.

- [#33](https://github.com/jluterek/astro-slides/pull/33) [`52228dc`](https://github.com/jluterek/astro-slides/commit/52228dcef52f2bfc0e0c5333523627a17d74e786) Thanks [@jluterek](https://github.com/jluterek)! - PPTX/export fidelity: theme colors, backgrounds, blank slides, and a working `--dark`. The DOM walker's color normalization read canvas `fillStyle` back as a string, which modern Chromium serializes as `oklch()` — so every theme color was silently dropped from PPTX exports; it now reads a 1×1 `getImageData` pixel (always sRGB). Slide backgrounds fall back to the deck's theme background instead of exporting on PowerPoint's default white. Slides whose content maps to no editable block (pure visual composition) are auto-rasterized instead of exporting blank. And the `--dark` flag now actually works: the deck/print routes honor `ASTRO_SLIDES_COLOR_SCHEME`, forcing the scheme over the deck's `colorSchema` and the OS default.

- [#30](https://github.com/jluterek/astro-slides/pull/30) [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856) Thanks [@jluterek](https://github.com/jluterek)! - Fix the print route (PDF export) dropping the theme background and client-rendered islands. `.as-print`/`.as-print-slide` hardcoded/omitted backgrounds, so a dark deck exported to PDF on paper-white pages — they now paint `var(--slide-bg)`. The print route ran no client scripts, so Magic Move blocks shipped as empty boxes and Mermaid diagrams as a stuck "Rendering diagram…" fallback — it now statically renders each Magic Move island at its final step (print reveals all click state) and mounts Mermaid diagrams. Mermaid islands also declare `data-waitfor=".as-mermaid svg"` so PDF/PNG exports wait for the async render instead of racing it.

- Updated dependencies [[`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b), [`3eccfba`](https://github.com/jluterek/astro-slides/commit/3eccfbae08e27dd3744615638923ead981fae7c3), [`88d13b8`](https://github.com/jluterek/astro-slides/commit/88d13b855c624e137659f6b7d27000703f9f7fb5), [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856), [`5e3f061`](https://github.com/jluterek/astro-slides/commit/5e3f06177ca64649264f7526f9aeefe8c08e2f6c)]:
  - @astro-slides/client@0.1.2
  - @astro-slides/types@0.1.2
  - @astro-slides/parser@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [[`8e0bd28`](https://github.com/jluterek/astro-slides/commit/8e0bd286d7b9f77d8561691179a3e69bb0fbc304)]:
  - @astro-slides/client@0.1.1
  - @astro-slides/types@0.1.1
  - @astro-slides/parser@0.1.1
