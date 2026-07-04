---
"@astro-slides/cli": patch
"@astro-slides/core": patch
---

PPTX/export fidelity: theme colors, backgrounds, blank slides, and a working `--dark`. The DOM walker's color normalization read canvas `fillStyle` back as a string, which modern Chromium serializes as `oklch()` — so every theme color was silently dropped from PPTX exports; it now reads a 1×1 `getImageData` pixel (always sRGB). Slide backgrounds fall back to the deck's theme background instead of exporting on PowerPoint's default white. Slides whose content maps to no editable block (pure visual composition) are auto-rasterized instead of exporting blank. And the `--dark` flag now actually works: the deck/print routes honor `ASTRO_SLIDES_COLOR_SCHEME`, forcing the scheme over the deck's `colorSchema` and the OS default.
