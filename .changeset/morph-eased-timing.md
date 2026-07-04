---
"@astro-slides/client": patch
---

Give View-Transitions `<Morph>` object continuity an eased ~440ms timing. The browser default (~250ms, near-linear) made morphs snap — noticeably so for elements travelling a long way — and diverged from the FLIP fallback, which already used an eased ~400ms. The runtime now flags `<html data-as-morphing="vt">` for the morph's duration and `transitions.css` scopes the `::view-transition-group` timing to it, so both morph paths feel the same. Collapses to instant under `prefers-reduced-motion`.
