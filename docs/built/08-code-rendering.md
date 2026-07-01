---
phase: 08-code-rendering
status: distilled
distilled: 2026-07-01
---

# Phase 08 — Code rendering

Shiki-powered syntax highlighting, line highlighting (static + click-stepped), external
snippet imports, Twoslash type hovers, and **Magic Move** animated diffs — all tokenized
at build time (ADR-0011). The runtime ships no highlighter; it only hydrates the one
interactive piece (Magic Move) and drives it off the Phase-06 click model. Archived task
notes: `todo/archive/08-code-rendering/`.

## What shipped

**Shiki foundation** — `packages/core/src/code/`
- `config.ts` — `ResolvedShikiConfig` (dual `light-plus`/`dark-plus` themes + curated base
  langs). `loadShikiSetup(root)` loads a project `setup/shiki.{ts,js,mjs}`; TS is
  esbuild-transformed to an ESM data URL and imported (no separate TS runtime).
- `highlighter.ts` — one cached `createHighlighter` per (themes, langs) config for the
  process; `ensureLang` lazily loads grammars used outside the preload set.

**Highlighting pipeline** — a remark plugin, not rehype
- `remark-code.ts` walks `code` nodes, tokenizes with Shiki, and **replaces each with a
  `<CodeBlock html=…>`** element (the pre-rendered `<pre class="shiki">` string, applied via
  `set:html`). Working at remark level keeps the fence's `lang`+`meta` (remark-rehype drops
  meta), and emitting a component sidesteps MDX's raw-HTML/JSX friction.
- `meta.ts` parses the fence meta: `{1,3-5}` static highlight, `{1|2-3|all}` click steps,
  `twoslash` / `lineNumbers` flags, `title=` / `maxHeight=`.
- `transformers.ts` — Shiki line transformers: `.highlighted` for static lines;
  `data-click="N"` per click-stepped line (wired into the existing reveal contract).
- Astro's built-in highlighter is disabled (`markdown.syntaxHighlight: false`); we own it.

**Dual themes without `!important`** — `codeToHtml(defaultColor: false)` emits only
`--shiki-light` / `--shiki-dark` CSS vars (no inline color), so `code.css` switches themes by
color scheme with plain selectors.

**Click-stepped code** integrates with Phase 06: remark-code runs *after* remark-clicks,
reads the injected `export const totalClicks`, numbers code line-steps after the prose clicks,
and bumps the total. The runtime reveals `data-click` lines exactly like any other click.

**Snippet imports** — `snippets.ts`
- `<<< @/file#region {ts} {1,3}` → a `code` node loaded from disk (then highlighted by
  remark-code). `@/` = project root; `extractRegion` pulls a comment-delimited region
  (`#region name` … `#endregion`, any comment syntax) and dedents it.
- MDX parses `{ts}`/`{1,3}` as JS expressions, so the matcher **reconstructs the raw line**
  from the paragraph's text + `mdxTextExpression` children. Referenced files are reported via
  `onFile` and added to the dev watcher for HMR.

**Twoslash** — opt-in via the `twoslash` fence flag; the transformer is lazily imported only
when a fence needs it (needs a TS project context).

**Magic Move** — the one hydrated island
- `magic-move.ts` (core) parses the inner fences of a ` ````md magic-move ` block, tokenizes
  each step with `@shikijs/magic-move/core` (keyed tokens), and lz-string-compresses the
  `KeyedTokensInfo[]` into a `<ShikiMagicMove>` element. N steps consume N-1 clicks.
- `client/src/code/magic-move.ts` decompresses the payload, mounts the framework-agnostic
  `MagicMoveRenderer`, and renders `clamp(deckStep - base, 0, N-1)` off the deck store —
  animating on the present slide, snapping when off-screen.

**Chrome** — `CodeBlock.astro` (title, line numbers, max-height scroll, copy button) +
`copy.ts` (one delegated clipboard listener per deck).

## How to navigate the result

- `packages/core/src/code/remark-code.ts` — the pipeline entry: fence → `<CodeBlock>` / Magic Move.
- `packages/core/src/code/meta.ts` — fence-meta grammar.
- `packages/core/src/code/snippets.ts` — `<<<` imports + region extraction.
- `packages/core/src/code/magic-move.ts` — build-time tokenization.
- `packages/client/src/code/magic-move.ts` — the runtime renderer, driven by the click model.
- `packages/client/src/styles/code.css` — dual-theme switching, click-line dim, chrome.

## Key decisions

- **Highlight at remark, emit a component** — not a rehype plugin. Preserves `meta`, and
  `<CodeBlock html=…>` + `set:html` avoids MDX trying to parse tokenized HTML as JSX.
- **`defaultColor: false`** for dual themes — CSS-var switching, no `!important` fighting inline
  styles.
- **Lazy (config, highlighter) at first render, not `config:setup`** — the setup loader's
  dynamic imports need the build-phase module runner, which Astro tears down after config load
  (hit as "Vite module runner has been closed").
- **Magic Move is the only client-hydrated code feature** — highlighting and click lines are
  static HTML + CSS; only token-morphing needs JS.
- **Code clicks reuse the click model** — `data-click` lines + `totalClicks` cooperation, so
  no parallel stepping system.

## What surprised us

- **remark-rehype drops the fence `meta` string** — the reason highlighting lives at remark
  level (where `node.meta` still exists) rather than rehype.
- **MDX eats `{…}` in prose** — `<<< f.ts {ts} {1}` arrives as text + `mdxTextExpression`
  nodes, so the snippet matcher had to reconstruct the source line.
- **`lz-string` is CommonJS** — named ESM imports fail under Vite SSR; import the default and
  destructure.
- **The config-load module runner dies before render** — forced the highlighter boot to be
  lazy/cached at first transform.
- **Nested code fences need a longer outer fence** — Magic Move blocks use ` ```` ` (4
  backticks) so the inner ` ``` ` steps are content, not terminators.

## Loose ends

- **Twoslash needs a real `tsconfig`/project** — wired and opt-in, but untested against a live
  TS project in the demo (no type-checked fixture yet).
- **Click-line highlight is cumulative reveal**, not focus-dim-others — stepped lines fade in
  and stay; a "spotlight current step" mode is a later option.
- **Magic Move payloads are theme-coupled** — a theme change reruns tokenization (documented in
  ADR-0011); no cross-theme artifact cache yet.
- **Snippet HMR is full-reload** on a watched file change (mirrors deck-source HMR).
- **`setup/shiki.ts` transformers** are supported but there's no bundled transformer preset.
- **No pixel snapshots** — e2e asserts structure/behavior (highlighted line count, step
  reveal, Magic Move text change), not rendered color.

## Stats

New `packages/core/src/code/` (config, highlighter, meta, transformers, remark-code, snippets,
magic-move) + `client/src/code/` (magic-move renderer, copy) + `CodeBlock.astro` /
`ShikiMagicMove.astro` + `code.css`. Deps: `shiki`, `@shikijs/{rehype,transformers,twoslash,
magic-move}`, `lz-string`, `chokidar`, `esbuild`. 163 unit tests (+24: meta grammar, region
extraction, snippet rewrite, highlighting + click lines + Magic Move token stability, copy
button) + 13 Playwright e2e (+3: highlighted lines, click-stepped reveal, Magic Move step).
Demo grew to 17 slides (syntax highlight, click lines, snippet import, Magic Move).

---

**Workflow:** Created at phase close, before `todo/08-code-rendering/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
