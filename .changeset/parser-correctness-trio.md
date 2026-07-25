---
"@astro-slides/parser": patch
"@astro-slides/core": patch
---

Three parser-correctness fixes from real-deck authoring (#59, #55, #52). Slot extraction now tracks fence character AND length per CommonMark, so a `::read::` marker after a 4-backtick Magic Move block lands in the read slot instead of rendering as literal slide content. All mid-slide HTML comments are stripped (fence-aware) at emit — MDX rejects them, so one misplaced comment used to 500 every deck route with an error pointing at an emitted temp file; comments are now inert anywhere while trailing speaker notes work exactly as before, including in the natural position before `::read::`. And the `---` frontmatter disambiguation requires a frontmatter-shaped `key:` first line, so a slide whose body accidentally parses as a YAML mapping (headings read as YAML comments; an `alt="text: with colon"` reads as a key) can no longer be silently swallowed as the next slide's frontmatter.
