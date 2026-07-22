# @astro-slides/mcp-server

## 0.3.0

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.3.0
  - @astro-slides/parser@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.2.0
  - @astro-slides/parser@0.2.0

## 0.1.2

### Patch Changes

- [#37](https://github.com/jluterek/astro-slides/pull/37) [`eaca6cc`](https://github.com/jluterek/astro-slides/commit/eaca6cc7026673114182439eecd726d61b689c5a) Thanks [@jluterek](https://github.com/jluterek)! - MCP tool-surface polish: read-tool out-of-range errors now include the deck's slide count (parity with write errors); `goto_slide`/`next_slide`/`set_step` clamp the slide number to the deck's real range instead of driving the presentation past the last slide; edited/inserted blocks preserve CRLF line endings in CRLF decks; and merging a frontmatter key with an explicit `null` now removes it — previously keys could never be unset over MCP. Plugin/marketplace manifest versions synced.

- [#34](https://github.com/jluterek/astro-slides/pull/34) [`b292d48`](https://github.com/jluterek/astro-slides/commit/b292d4853244b1712150f1324d48a444c36c1895) Thanks [@jluterek](https://github.com/jluterek)! - Two write-safety fixes for the MCP tool surface. (1) Write tools slice a deck file's literal slide blocks, but read tools expand `src:` imports — on decks where an importer block fans out into several slides, the two numberings diverge and a read-then-write sequence would silently edit the wrong slide. Writes on such decks are now refused with an error explaining the mismatch. (2) Export tools' `output` argument could overwrite arbitrary project files, including deck sources (`export_pdf` with `output: "slides.mdx"` wrote PDF bytes over the deck). Outputs must now match the format's extension, and `export_md` refuses to target another deck's source file.

- Updated dependencies []:
  - @astro-slides/types@0.1.2
  - @astro-slides/parser@0.1.2

## 0.1.1

### Patch Changes

- [#24](https://github.com/jluterek/astro-slides/pull/24) [`6f0fbd1`](https://github.com/jluterek/astro-slides/commit/6f0fbd1425c6cdf077c1a36e60a7545f0d7f8340) Thanks [@jluterek](https://github.com/jluterek)! - Report the real package version in the `astro-slides` CLI banner and the MCP server handshake. Both were hardcoded to `0.0.0`; they now read from `package.json` at runtime (working in type-stripped, compiled, and bundled contexts) so the advertised version tracks the published one and can't drift again.

- Updated dependencies []:
  - @astro-slides/types@0.1.1
  - @astro-slides/parser@0.1.1
