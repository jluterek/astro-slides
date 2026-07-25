---
"@astro-slides/cli": minor
---

`export` gains `--deck <name>` (#56): scope PDF/PNG/PPTX exports to one deck instead of applying `--range` to every deck in the project. An unknown deck name errors with the list of available decks, and range entries beyond a deck's slide count now log a per-deck "skipped: out of range" note instead of silently exporting nothing.
