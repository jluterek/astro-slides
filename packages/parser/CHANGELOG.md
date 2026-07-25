# @astro-slides/parser

## 0.5.0

### Patch Changes

- [#65](https://github.com/jluterek/astro-slides/pull/65) [`df69221`](https://github.com/jluterek/astro-slides/commit/df6922139a572d6bfacf15a28b5eaf76df8abc02) Thanks [@jluterek](https://github.com/jluterek)! - Three parser-correctness fixes from real-deck authoring ([#59](https://github.com/jluterek/astro-slides/issues/59), [#55](https://github.com/jluterek/astro-slides/issues/55), [#52](https://github.com/jluterek/astro-slides/issues/52)). Slot extraction now tracks fence character AND length per CommonMark, so a `::read::` marker after a 4-backtick Magic Move block lands in the read slot instead of rendering as literal slide content. All mid-slide HTML comments are stripped (fence-aware) at emit — MDX rejects them, so one misplaced comment used to 500 every deck route with an error pointing at an emitted temp file; comments are now inert anywhere while trailing speaker notes work exactly as before, including in the natural position before `::read::`. And the `---` frontmatter disambiguation requires a frontmatter-shaped `key:` first line, so a slide whose body accidentally parses as a YAML mapping (headings read as YAML comments; an `alt="text: with colon"` reads as a key) can no longer be silently swallowed as the next slide's frontmatter.

- Updated dependencies []:
  - @astro-slides/types@0.5.0

## 0.4.1

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.4.1

## 0.4.0

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.1.1
