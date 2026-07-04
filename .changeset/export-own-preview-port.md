---
"@astro-slides/cli": patch
---

Fix two `export` corruption bugs. (1) The export preview server bound its default port with SO_REUSEPORT, so if `astro-slides dev` was already running the OS silently load-balanced requests between the two servers and the export screenshotted the dev server — dev toolbar and all. The export now reserves a genuinely free port. (2) PNG export (and PPTX rasterized-slide/code screenshots) capture `?embed=1` pages, where the deck background is intentionally transparent — dark decks exported on white. The exporter now restores the theme background unless `--omit-background` asks for transparency.
