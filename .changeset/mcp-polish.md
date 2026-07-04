---
"@astro-slides/mcp-server": patch
---

MCP tool-surface polish: read-tool out-of-range errors now include the deck's slide count (parity with write errors); `goto_slide`/`next_slide`/`set_step` clamp the slide number to the deck's real range instead of driving the presentation past the last slide; edited/inserted blocks preserve CRLF line endings in CRLF decks; and merging a frontmatter key with an explicit `null` now removes it — previously keys could never be unset over MCP. Plugin/marketplace manifest versions synced.
