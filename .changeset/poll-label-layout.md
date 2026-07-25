---
"@astro-slides/client": patch
---

Poll layout at deck scale (#72): natural-language option labels no longer wrap into a narrow multi-line column. The `<Poll>` block takes an explicit width (`--as-poll-max-width`, default 1100px — centered layouts used to shrink-wrap it to ~485px), and the label column sizes to the widest label up to a cap (`--as-poll-label-width`, default 55%) with all bars aligned via subgrid. The `/audience` phone page keeps its compact layout.
