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
| [`morph-reel`](./morph-reel/) | The showcase: one element morphs through orb → number → chart → live code → cards → wordmark, driven entirely by a shared `data-morph` id and the View Transitions API. Present it in Chrome/Safari for the full effect. |
