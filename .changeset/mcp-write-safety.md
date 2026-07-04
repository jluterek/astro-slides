---
"@astro-slides/mcp-server": patch
---

Two write-safety fixes for the MCP tool surface. (1) Write tools slice a deck file's literal slide blocks, but read tools expand `src:` imports — on decks where an importer block fans out into several slides, the two numberings diverge and a read-then-write sequence would silently edit the wrong slide. Writes on such decks are now refused with an error explaining the mismatch. (2) Export tools' `output` argument could overwrite arbitrary project files, including deck sources (`export_pdf` with `output: "slides.mdx"` wrote PDF bytes over the deck). Outputs must now match the format's extension, and `export_md` refuses to target another deck's source file.
