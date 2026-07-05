# @astro-slides/core

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
