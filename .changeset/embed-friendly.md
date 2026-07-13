---
"@astro-slides/core": minor
"@astro-slides/cli": minor
"@astro-slides/client": minor
---

Embedding into an existing Astro site is now first-class (#39, #40, #41). `astroSlides({ prefix: "/slides" })` namespaces every injected route — deck viewer, presenter, print, and the redirect/dashboard (which moves to `<prefix>/`) — so decks live inside a host site without claiming its top-level namespace; navigation, the presenter-launch shortcut, dashboard links, and `astro-slides export` all understand the prefix (export auto-detects it in the built output). `injectRoot: false` skips the root route entirely for hosts that own their homepage, and the 404.html static-host fallback no longer runs (or clobbers the host's 404) when embedding. `scopedReact: true` confines the bundled React renderer to astro-slides' own islands so a host's Solid/Preact/Vue-JSX renderer keeps `.jsx`/`.tsx` for its files. A new docs page ("Embedding in an existing Astro site") plus the runnable `examples/embedded-site` cover the setup, including `@astrojs/mdx` coexistence.
