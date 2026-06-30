# Architecture decision records (ADRs)

One file per cross-cutting decision that future work will need to honor.

File naming: `NNNN-kebab-case-title.md`, four-digit zero-padded, **never renumbered**. Even if an ADR is superseded, its number stays.

Suggested minimum sections (Michael Nygard's format):

- **Status** — `proposed`, `accepted`, `superseded by NNNN`, `deprecated`
- **Context** — what forced this decision
- **Decision** — what we chose
- **Consequences** — what this implies, good and bad

When an ADR is superseded, mark its status (`superseded by NNNN-...`) but leave the original file in place. The new ADR gets a fresh number and references the old.

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](./0001-astro-as-host-framework.md) | Astro as the host framework | accepted |
| [0002](./0002-mdx-primary-marp-slidev-compatible.md) | MDX as primary author format, Marp/Slidev-compatible | accepted |
| [0003](./0003-typescript-strict-end-to-end.md) | TypeScript strict, end to end | accepted |
| [0004](./0004-pnpm-workspaces.md) | pnpm workspaces for the monorepo | accepted |
| [0005](./0005-themes-as-folders.md) | Themes are folders, not npm packages | accepted |
| [0006](./0006-view-transitions-with-flip-fallback.md) | View Transitions API for slide morphs, FLIP fallback | accepted |
| [0007](./0007-pptxgenjs-for-editable-pptx.md) | PptxGenJS for editable PPTX export | accepted |
| [0008](./0008-parse-time-click-resolution.md) | Click steps resolved at parse time, not mount time | accepted |
| [0009](./0009-mcp-server-first-class.md) | Ship an MCP server, not just a skill bundle | accepted |
| [0010](./0010-broadcastchannel-with-websocket-fallback.md) | BroadcastChannel for same-origin sync, WebSocket for remote | accepted |
| [0011](./0011-shiki-and-magic-move-for-code.md) | Shiki and Magic Move for code rendering | accepted |
