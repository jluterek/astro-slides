---
"@astro-slides/core": minor
"@astro-slides/client": minor
---

Read mode (#45): the annotated-presentation format as a first-class output. A reserved `::read::` slot holds per-slide companion prose — sources, the spoken argument, detail that would crowd a slide — rendered **only** on the new prerendered `/read/<deck>` route: every slide as a static theme-styled block (all click steps revealed, scaled to a readable article column, phone-friendly) with its prose flowing beneath, per-slide anchors (`#slide-N`) for deep links, and Present/Print header links. Excluded from deck, presenter, print, PPTX, and image outputs; speaker notes unchanged and private; read-slot clicks never widen a slide's step count. Discoverable from the `?` help overlay ("Open reading view") and the multi-deck dashboard; respects the embedding `prefix`.
