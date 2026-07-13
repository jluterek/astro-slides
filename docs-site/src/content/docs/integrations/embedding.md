---
title: Embedding in an existing Astro site
description: Host decks under a sub-path of your own site, next to your blog and homepage.
---

astro-slides can be the whole app — or a section of a site you already have. This page
covers the embedding shape: namespacing decks under a sub-path, keeping your homepage,
and coexisting with the host site's own integrations.

## Namespacing decks under a sub-path

By default the integration injects its routes at the top level (`/[deck]/[slide]`,
`/presenter/…`, `/print/…`, and a `/` redirect/dashboard). Inside an existing site,
give it a `prefix` instead:

```js
// astro.config.mjs of your existing site
import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [astroSlides({ prefix: "/slides" })],
});
```

Every route moves under the prefix — including the deck dashboard, which now lives at
`/slides/` instead of claiming `/`:

| Route | Without prefix | With `prefix: "/slides"` |
| --- | --- | --- |
| Deck viewer | `/[deck]/[slide]` | `/slides/[deck]/[slide]` |
| Presenter | `/presenter/[deck]/[slide]` | `/slides/presenter/[deck]/[slide]` |
| Print / PDF source | `/print/[deck]` | `/slides/print/[deck]` |
| Redirect / dashboard | `/` | `/slides/` |

Everything downstream understands the prefix: in-deck navigation, the `P`
presenter-launch shortcut, dashboard links, and `astro-slides export` (which
auto-detects the prefix in the built output). The prefix composes with a site-wide
Astro `base` — `base: "/me"` plus `prefix: "/slides"` serves decks at
`/me/slides/<deck>/<n>`.

Multiple decks nest naturally: `content/decks/intro/` and `content/decks/deep-dive/`
become `/slides/intro/…` and `/slides/deep-dive/…`.

## Keeping your homepage (and your 404)

With a `prefix`, the integration never touches `/` — your `src/pages/index.astro`
wins without contest. If you want no dashboard at all (decks shared by URL only):

```js
astroSlides({ prefix: "/slides", injectRoot: false })
```

When embedding, the integration also skips its static-host fallback (copying
`index.html` → `404.html`), so your site's own 404 page is preserved.

## Coexisting with another JSX framework

astro-slides brings `@astrojs/react` for its presenter and code-animation islands. If
your site uses another JSX framework (Solid, Preact…), two renderers would otherwise
both claim `.jsx`/`.tsx` files. Scope astro-slides' React to its own components:

```js
import solid from "@astrojs/solid-js";

export default defineConfig({
  integrations: [
    astroSlides({ prefix: "/slides", scopedReact: true }),
    solid({ include: ["src/**"] }), // your framework keeps your files
  ],
});
```

With `scopedReact: true`, astro-slides' React renderer only processes files inside the
`@astro-slides` packages. Two consequences to know:

- Give your own renderer an `include` too (as above) so neither renderer is ambiguous.
- Your **own** React components imported into a deck will no longer be claimed by
  astro-slides' renderer — if you need custom React islands inside slides, either stay
  unscoped or add your own `react({ include })` covering those files.

## Coexisting with an existing `@astrojs/mdx`

astro-slides registers its own `mdx()` configured with the deck remark pipeline
(clicks, math, diagrams, code). If your site already calls `mdx()` for a blog:

- **Keep a single `@astrojs/mdx` version** across the project (astro-slides pins
  `^4.3.0`); a lockfile with two majors is the main hazard.
- Astro warns about the duplicate integration name but keeps both entries. Your
  `mdx()` (with your remark/rehype plugins) applies to the content collections you
  render with it; deck files are compiled through astro-slides' own emitted MDX
  pipeline and do not pick up your blog's remark plugins — nor vice versa.
- Order your `mdx()` **after** `astroSlides()` in the integrations array so your
  configuration is the later registration for your own content.

If you hit an interaction these notes don't cover, please open an issue — this
embedding path is actively supported.

## Source

- `packages/core/src/integration.ts` — `AstroSlidesOptions.prefix` / `injectRoot` / `scopedReact`
- `packages/core/src/routes/index.astro` — prefix-aware dashboard links
- `packages/client/src/runtime.ts` — prefix-aware presenter launch
- `packages/cli/src/main.ts` — `discoverRoutePrefix` (export auto-detection)
- `examples/embedded-site/` — a runnable host-site example
