# 0011. Shiki and Magic Move for code rendering

- **Status:** accepted
- **Date:** 2026-06-30

## Context

Most decks our audience cares about contain code. The reference field's choices:

- **highlight.js** (reveal.js, Marp) — ubiquitous, large grammar coverage, ~50 KB. Themes are CSS-only. No diff animation.
- **Prism** (Spectacle via `react-syntax-highlighter`) — lighter than highlight.js, JS-based highlighting. No diff animation.
- **Shiki** (Slidev) — uses real TextMate grammars, themes that match VS Code 1:1. Build-time tokenization keeps the runtime small. Plugin ecosystem: `@shikijs/twoslash`, `@shikijs/transformers`, `@shikijs/magic-move`.
- **Shiki Magic Move** (Slidev) — animated diffs between code snippets. Tokens are keyed; identically-keyed tokens FLIP-animate from old position to new position; new tokens fade in, removed ones fade out. The closest thing to "code morph" available.

Shiki + Magic Move is the strongest combination by a wide margin: best fidelity to authoritative themes, best diff UX, smallest runtime footprint (build-time tokenization).

## Decision

- **Syntax highlighting:** Shiki, via `@shikijs/markdown-it` / direct API. Themes mirror VS Code themes. Authors can override per-deck via `setup/shiki.ts`.
- **Twoslash:** optional, opt-in via fence info `{twoslash}`. Adds hover popovers with inferred TypeScript types in code blocks. Powered by `@shikijs/twoslash`.
- **Animated diffs:** `@shikijs/magic-move`. The Vue wrapper is thin; we wrap the headless API in a React/Astro component for our runtime.
- **No Monaco** in the default bundle. Optional addon for runnable / writable code (the `{monaco}` / `{monaco-run}` fence info pattern from Slidev). Most decks don't need it; including it by default bloats the bundle.
- **Line highlighting** uses the standard `{1,3-5}` or click syntax `{1|2-3|all}` parsed at build time, applied at runtime via CSS classes.

External snippet imports (`<<< @/snippets/file.ts#region {twoslash}`) are tokenized at build time alongside inline code.

## Consequences

- Code in decks looks the same as in VS Code. Authors won't have to fight the theme.
- Magic Move gives us a flagship animation feature that competes directly with Keynote-tier code transitions, with build-time cost only.
- The runtime is small — no client-side highlighting, no Monaco unless opted in.
- Twoslash gives developer-focused decks a level of fidelity (inferred types in code samples) no other framework matches.
- Trade-off: Shiki build time grows with the number and size of code blocks. Mitigated by caching keyed by `(code, theme, language)`.
- Trade-off: Magic Move couples to the chosen Shiki theme at build time (the keys depend on tokenization). Changing themes invalidates Magic Move artifacts. Acceptable — theme changes are rare and rebuilds are fast.
- Trade-off: `@shikijs/magic-move` has a Vue wrapper as its first-party UI. We adapt the headless engine to our React/Astro runtime ourselves. Minor cost, well isolated.
