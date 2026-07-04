---
"@astro-slides/client": patch
---

Fix Magic Move blocks rendering as an empty box until the last click. Three compounding issues: the island's `data-click` (step accounting only) matched the generic click-reveal hide, so the whole block sat at `opacity: 0` until its final step; the `@shikijs/magic-move` stylesheet was never imported, so whitespace tokens collapsed (`const total` → `consttotal`); and the vanilla mount never added `shiki-magic-move-container` (the framework wrappers stamp it in their templates), which carries the `white-space: pre` rule. Magic Move now shows its first step immediately with correct spacing. The e2e now asserts computed opacity and whitespace — `toBeVisible()` ignores opacity, which is how this slipped through.
