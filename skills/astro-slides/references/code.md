# Code

Fenced code blocks are highlighted at build time with Shiki (dual light/dark themes), and support static and click-stepped line highlighting, external snippet imports, Twoslash type hovers, and Magic Move animated diffs — the runtime only hydrates Magic Move.

## Basic highlighting

Write a normal fenced block with a language. Highlighting runs at build time; no runtime highlighter ships.

````md
```ts
const greeting: string = "hello";
console.log(greeting);
```
````

Themes are dual (`light-plus` / `dark-plus`) and switch by color scheme via CSS variables — nothing to configure per block. Astro's built-in highlighter is disabled; the framework owns highlighting through a remark plugin that replaces each fence with a `<CodeBlock html=…>` element.

## Fence meta options

The info string after the language carries the meta. Supported flags:

- `{1,3-5}` — static line highlight (single lines and ranges).
- `{1|2-3|all}` — click-stepped highlight (see below).
- `twoslash` — enable Twoslash type hovers.
- `lineNumbers` — show line numbers.
- `title=…` — a title in the block chrome.
- `maxHeight=…` — cap height and scroll.

````md
```ts {2,4-5} title=example.ts lineNumbers
const a = 1;
const b = 2; // highlighted
const c = 3;
const d = 4; // highlighted
const e = 5; // highlighted
```
````

## Static line highlighting

`{1,3-5}` marks lines as highlighted (a `.highlighted` class); they render emphasized from first paint. Combine comma-separated single lines with `start-end` ranges.

````md
```py {1,3-5}
import os
x = 1
def f():
    return x
print(f())
```
````

## Click-stepped line highlighting

`{step|step|…}` reveals lines one click at a time. Pipe-separated groups become sequential steps; each group accepts the same single/range syntax, plus `all`.

````md
```ts {1|2-3|all}
const setup = init();      // shown on step 1
const a = setup.a;         // step 2
const b = setup.b;         // step 2
run(a, b);                 // 'all' step
```
````

Code clicks reuse the deck's click model — each stepped line gets a `data-click="N"` attribute and is revealed exactly like any other click step, numbered after any prose clicks on the slide and added to the slide's total click count. The current behavior is cumulative reveal: stepped lines fade in and stay.

## External snippet imports

Pull code from a file instead of inlining it, with the `<<<` directive. The fence-style meta (`{ts}` language, `{1,3}` highlight) follows the path.

````md
<<< @/src/example.ts {ts} {1,3}
````

- `@/` resolves to the **project root**.
- Append `#region` to extract a named region delimited by `#region name` … `#endregion` comments (any comment syntax); the extracted lines are dedented.

````md
<<< @/src/example.ts#setup {ts}
````

In the source file:

```ts
// #region setup
const client = createClient();
client.connect();
// #endregion setup
```

Imported snippets are highlighted by the same pipeline as inline fences, and referenced files are watched — editing the file triggers an HMR reload of the deck.

## Twoslash type hovers

Add the `twoslash` flag to surface TypeScript type information (hover tooltips, inline query results) rendered at build time. It is lazily loaded only for fences that request it and needs a TypeScript project context (a real `tsconfig`).

````md
```ts twoslash
const value = JSON.parse("{}");
//    ^?
```
````

## Magic Move (animated code diffs)

Magic Move morphs one code snippet into the next across click steps — tokens that persist slide/animate, tokens that change fade. It is the one hydrated code island.

Use a **four-backtick** outer fence with the `magic-move` info string, then place ordinary three-backtick fences inside as the successive steps:

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
````
`````

- The inner fences are the animation steps; the four-backtick outer fence keeps the inner ` ``` ` as content rather than terminators.
- **N steps consume N-1 clicks** — each click advances to the next snippet.
- Steps are tokenized and compressed at build time; the runtime decompresses and animates on the present slide, snapping instantly when the slide is off-screen.

## Chrome and behavior notes

- Blocks get a copy button, plus optional `title`, `lineNumbers`, and `maxHeight` scroll from the fence meta.
- Highlighting and click lines are static HTML + CSS; only Magic Move needs JavaScript.
- Dual-theme switching uses CSS variables (no `!important`), so light/dark follows the color scheme automatically.
