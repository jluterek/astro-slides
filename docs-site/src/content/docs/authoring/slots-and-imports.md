---
title: Slots, snippets, and imports
description: Multi-slot layout sugar (::name::), code snippet imports (<<<), and slide imports (src:).
---

Three pieces of authoring sugar let you fill multi-region layouts, pull code straight out
of real source files, and compose a deck from many Markdown files. All three are resolved
by the parser before your slide is compiled.

## Slot sugar: `::name::`

Some layouts have more than one content region — `two-cols` has a left and a right
column, for example. You target the named regions with a `::name::` marker on its own
line. Everything before the first marker is the layout's **default** slot; each marker
starts a new named slot:

```md
---
layout: two-cols
---

Left column content.

- point A
- point B

::right::

Right column content.

- point C
- point D
```

Here the text before `::right::` fills the default (left) slot, and everything after it
fills the `right` slot.

:::note
Slot markers are **fence-aware**: a `::name::` inside a fenced code block is left
untouched, so you can show slot syntax in a code sample without triggering it.
:::

You can define as many named regions as a layout exposes — each `::name::` opens the
region called `name`:

```md
---
layout: three-cols
---

First column (default slot).

::middle::

Middle column.

::right::

Right column.
```

## Code snippet imports: `<<<`

Instead of copy-pasting code into a fence (and letting it drift out of sync), import it
from a real file with `<<<` on its own line. The parser replaces the line with a fenced
code block containing the file's contents, inferring the language from the extension:

```md
<<< @/snippets/greet.ts
```

`@/` and a leading `/` resolve from the **project root**; any other specifier resolves
relative to the current slide file.

### Importing a region

Append `#region-name` to pull just a named region out of the file. Mark the region in the
source with `#region name` / `#endregion name` comments:

```ts
// greet.ts
export interface Greeting {
  name: string;
}

// #region greet
export function greet({ name }: Greeting): string {
  return `Hello, ${name}!`;
}
// #endregion greet
```

```md
<<< @/snippets/greet.ts#greet
```

Only the lines between the markers are imported, and they're dedented for you.

### Forwarding fence metadata

Anything after the specifier is forwarded to the generated fence as its info string —
useful for a language override, a `title`, or line highlights. This is exactly the syntax
used in the minimal example deck:

```md
<<< @/snippets/greet.ts#greet {ts} {1}
```

That produces a `ts` fence with `{1}` (highlight line 1) metadata, so downstream code
rendering (highlighting, line focus, twoslash) treats it like a hand-written block.

## Slide imports: `src:`

To compose a deck from multiple files, give a slide a `src:` frontmatter field. The
referenced Markdown/MDX file is split into slides and spliced in at that position:

```md
---
src: ./chapters/intro.md
---
```

The imported file can contain many slides (its own `---` separators) — all of them are
flattened into the parent deck in order. Path resolution is the same as snippets: `@/`
and `/` are root-relative, everything else is relative to the importing file.

### Overriding the first imported slide

Any *other* frontmatter you place alongside `src:` merges onto the **first** imported
slide, letting you tweak it without editing the source file:

```md
---
src: ./chapters/intro.md
layout: cover
class: brand-dark
---
```

Here `intro.md`'s first slide inherits `layout: cover` and `class: brand-dark`; the
importer's values win on conflict.

:::caution
Imports can nest, but cycles are rejected and there's a maximum import depth — a file that
(directly or indirectly) imports itself raises a "circular `src:` import" error.
:::

## Source

- `packages/parser/src/slots.ts` — the `::name::` slot parser (default + named, fence-aware).
- `packages/parser/src/snippets.ts` — `<<<` snippet imports, `#region`/`#endregion`
  slicing, dedent, and fence-meta forwarding.
- `packages/parser/src/imports.ts` — `src:` slide imports, flattening, importer-frontmatter
  merge, cycle/depth guards.
- `packages/parser/src/paths.ts` — `@/` and `/` root-relative specifier resolution.
- `docs/built/02-parser.md` — where slot/snippet/import expansion sits in the pipeline.
- `examples/minimal/slides.md`, `examples/minimal/snippets/greet.ts` — a working
  `::right::`, `<<<`, and `#region` example.
