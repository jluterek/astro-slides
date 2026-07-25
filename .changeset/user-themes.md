---
"@astro-slides/core": minor
---

User themes are now actually loaded (#49): put a stylesheet at `<root>/themes/<name>/theme.css` (tokens scoped under `[data-theme="<name>"]`, like the bundled themes) and select it with `theme: <name>` headmatter. The CSS is imported on the deck, presenter, print, and read routes via a virtual module, bundles into static builds, and hot-reloads in dev — standalone and embedded hosts alike. A `theme:` name that resolves to neither a bundled theme nor a `themes/` folder logs a visible warning instead of silently falling back to starter tokens. The MDX body-import workaround keeps working. `examples/embedded-site` ships a `sphere` user theme as the reference.
