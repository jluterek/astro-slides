# blog-post-embed

A short, self-contained astro-slides deck designed to be embedded **inline in a
blog post** via an `<iframe>`.

## Build it

```bash
astro build
```

This produces a static site under `dist/`. Each slide has its own URL.

## Embed it

Point an `<iframe>` at the deck's slide URL and append `?embed=1`. Embed mode
adds an `.as-embed` class that hides the presentation chrome (help overlay,
status bar, drawing tools) while keeping the slide navigable — see
[the export/web docs](../../docs-site/src/content/docs/export/web.md#embed-mode).

```html
<iframe
  src="/blog-post-embed/1?embed=1"
  width="100%"
  height="450"
  style="border: 0; aspect-ratio: 16 / 9;"
  title="What is a View Transition?"
  loading="lazy"
></iframe>
```

Readers step through the deck inline with the arrow keys, without leaving your
post.

## Ship it offline

`astro-slides export --format html` zips the built site into a single
self-contained bundle you can host anywhere — no server required.
