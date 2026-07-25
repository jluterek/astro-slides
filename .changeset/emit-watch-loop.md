---
"@astro-slides/core": patch
---

Fix the dev-server reload feedback loop (#61). The per-slide MDX emitter rm-rf'd and rewrote its entire output on every re-parse; the emitted `.mdx` files live inside the watched project root, so the dev watcher treated our own output as deck edits — an infinite full-reload loop with a browser attached, ENOTEMPTY 500s from concurrent rm-rf races, and React invalid-hook errors during the storm. Four defenses, any of which breaks the loop: emission is now byte-stable (a file is written only when its content differs; strays removed individually; steady state produces zero filesystem events), the change handler ignores the emit dir, the integration tells the watcher to ignore `.astro-slides/` entirely, and emitted slide modules are invalidated explicitly on real deck edits so the ignore can't serve stale transforms.
