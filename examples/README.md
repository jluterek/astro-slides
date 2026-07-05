# Examples

Runnable astro-slides decks. Each is a self-contained Astro project — run any of them with
`pnpm --filter @astro-slides/example-<name> dev` (or `astro-slides dev` from its directory) and
export with `astro-slides export --format pdf|png|pptx|html`.

| Example | What it shows |
| --- | --- |
| [`minimal`](./minimal/) | The smallest deck — boots with `astro-slides dev`. Exercises every built-in layout. |
| [`blog-post-embed`](./blog-post-embed/) | A short explainer sized to embed in a blog post via `?embed=1`. |
| [`conference-talk`](./conference-talk/) | A full-length talk: sections, reveals, code, quote/fact/statement, speaker notes. |
| [`technical-tutorial`](./technical-tutorial/) | Code-heavy: Shiki highlights, Magic Move, a two-column walkthrough, a Mermaid diagram. |
| [`marketing-pitch`](./marketing-pitch/) | Landing-page quality on the Cosmic theme: FlexBlock feature/metric grids. |
| [`audience-engagement`](./audience-engagement/) | Live polls, moderated Q&A, and emoji reactions — run with `astro-slides dev --remote` and join from a phone via the Audience QR. |
| [`morph-reel`](./morph-reel/) | The showcase: twelve dots that never leave the stage — they fly between formations (cluster → ring → line → bar chart → arrow → a frame around self-refactoring code → constellation → wordmark), each keeping its identity via a `data-morph` id so the View Transitions API glides them to their new spots. Staggered so the swarm settles as a wave. Pure "magic move" motion, no dissolve. Present it in Chrome/Safari for the full effect. |
