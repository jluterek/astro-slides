---
title: Code
description: Syntax highlighting, Magic Move, and Twoslash.
---

Code blocks are highlighted with [Shiki](https://shiki.style) at **build time**. There is
no highlighter in the runtime bundle: your fences are tokenized during the build and shipped
as ready-to-paint HTML. Each block carries both a light and a dark theme (`light-plus` /
`dark-plus`, the VS Code defaults), switched purely in CSS by color scheme — so code looks
the same as it does in your editor, in either mode, with no flash.

## Basic highlighting

Write a normal fenced code block with a language tag:

````md
```ts
const greeting: string = "hello";
console.log(greeting);
```
````

The language is whatever Shiki knows (`ts`, `tsx`, `js`, `python`, `rust`, `go`, `bash`,
`json`, `css`, `html`, `sql`, …). Unknown languages fall back to plain text.

:::note
Astro's built-in highlighter is disabled — astro-slides owns highlighting end to end so it
can preserve the fence's meta string (line ranges, flags, titles) that Astro would otherwise
drop.
:::

## Fence meta

Everything after the language tag is the fence **meta**. It controls line highlighting,
click steps, and chrome. All of these are optional and can be combined.

| Meta | Effect |
| --- | --- |
| `{1,3-5}` | Statically highlight lines 1, 3, 4, 5. |
| `{1\|2-3\|all}` | Click steps — reveal-highlight per click (see below). |
| `twoslash` | Twoslash type hovers (TypeScript). |
| `lineNumbers` (or `line-numbers`) | Show line numbers. |
| `title="demo.ts"` | Caption above the block. |
| `maxHeight="12em"` (or `max-height=`) | Scrollable block with a max height. |

A block using several at once:

````md
```ts {2} lineNumbers title="server.ts" maxHeight="16em"
import { serve } from "./serve";
serve({ port: 3000 });
```
````

### Static line highlighting

A comma/range list inside `{…}` highlights those lines for the whole block. Ranges are
inclusive:

````md
```ts {1,3-5}
const a = 1;      // highlighted
const b = 2;
const c = 3;      // highlighted
const d = 4;      // highlighted
const e = 5;      // highlighted
```
````

### Click-stepped line highlighting

When the `{…}` group contains `|`, each segment becomes a **click step**. Highlighted lines
reveal cumulatively as you advance clicks — driven by the same
[click model](/interactivity/click-model/) as `<Click>` in prose. `all` highlights the whole
block for that step.

````md
```ts {1|2-3|all}
setup();          // step 1
doWork();         // step 2
doWork();         // step 2
cleanup();        // step 3 (all)
```
````

This block consumes three clicks. Code steps are numbered *after* any prose and math clicks
on the slide, so they interleave correctly with the rest of the deck.

:::note
Stepped highlighting is a cumulative reveal: earlier steps' lines stay highlighted as you
advance. There's no "spotlight only the current step" mode yet.
:::

## Twoslash type hovers

Add the `twoslash` flag to a TypeScript block to get editor-grade hover popovers showing
inferred types, powered by [`@shikijs/twoslash`](https://twoslash.netlify.app). The Twoslash
transformer is loaded lazily — only blocks that ask for it pay the cost.

````md
```ts twoslash
const user = { id: 1, name: "Ada" };
//    ^? hover to see the inferred type
```
````

:::tip
Twoslash type-checks against a real TypeScript project context, so it's best for
developer-focused decks where you want the inferred types to be exactly right.
:::

## Magic Move — animated code diffs

**Magic Move** morphs one code snippet into the next across clicks: identically-shaped tokens
FLIP-animate to their new position, new tokens fade in, removed ones fade out. It's the one
code feature that hydrates on the client; everything else is static HTML + CSS.

Author it as a **`magic-move` block** whose body contains the animation steps as ordinary
inner fences. Because the block nests code fences, wrap it in a **four-backtick outer fence**
so the inner triple-backtick steps are treated as content:

`````md
````md magic-move
```ts
function greet() {
  return "hi";
}
```
```ts
function greet(name: string) {
  return `hi ${name}`;
}
```
```ts
const greet = (name: string) =>
  `hi ${name}!`;
```
````
`````

Each inner fence is one step. **N steps consume N−1 clicks** — the first step shows on
entry, and each click animates to the next. The language of the first step drives
tokenization for the whole sequence.

:::note
`magic-move` (or the shorthand `magic`) is the meta on the outer `md` fence. All the token
tweening happens against the deck's Shiki theme, resolved at build time.
:::

## External snippet imports

Instead of pasting code inline, you can pull a snippet straight from a file on disk with a
`<<<` line. It's replaced at build time with a fenced block (then highlighted like any other),
and the referenced file is watched for HMR.

````md
<<< @/snippets/server.ts
````

- `@/` resolves from the **project root**; absolute and root-relative bare paths also work.
- Append `#region-name` to import just a named region (delimited by `#region name` …
  `#endregion` comments, in any comment style — `//`, `/* */`, `#`, `<!-- -->`). The region
  is dedented automatically.
- A **leading `{lang}`** in the meta overrides the language inferred from the file extension;
  any remaining meta (line ranges, flags) applies as usual.

````md
<<< @/snippets/server.ts#handler {ts} {1,3}
````

Here `#handler` selects the region, `{ts}` sets the language, and `{1,3}` highlights lines 1
and 3 of the extracted snippet.

:::tip
Snippet imports are covered alongside the other import forms on the
[Slots & imports](/authoring/slots-and-imports/) page.
:::

## Source

- `packages/core/src/code/remark-code.ts` — pipeline entry: fence → `<CodeBlock>` / Magic Move.
- `packages/core/src/code/meta.ts` — fence-meta grammar (`{…}`, flags, `title=`, `maxHeight=`).
- `packages/core/src/code/snippets.ts` — `<<<` imports and region extraction.
- `packages/core/src/code/magic-move.ts` — build-time Magic Move tokenization.
- `packages/core/src/code/transformers.ts` — static / click-stepped line transformers.
- `packages/client/components/CodeBlock.astro` — title, line numbers, max-height, copy button.
- `packages/client/components/ShikiMagicMove.astro` — the hydrated Magic Move island.
- `packages/client/src/code/magic-move.ts` — runtime renderer, driven by the click model.
- `packages/client/src/styles/code.css` — dual-theme switching and chrome.
- `docs/decisions/0011-shiki-and-magic-move-for-code.md` — the highlighting/animation ADR.
- `docs/built/08-code-rendering.md` — phase write-up.
