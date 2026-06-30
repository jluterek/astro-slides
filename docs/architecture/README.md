# Architecture specifications

Living design specs for the internal contracts that span multiple phases. Each file here is the **canonical** definition of one cross-cutting structure. Phases create or extend these specs as they execute.

Unlike ADRs (which capture *decisions* and their rationale), these specs capture *interfaces* — the concrete shapes of types, schemas, file layouts, and APIs. Specs evolve; ADRs are immutable once accepted.

## Why this directory exists

Several artifacts only make sense if every package agrees on them:

- the **slide AST** (parser produces it; runtime, exporters, MCP server all consume it)
- the **frontmatter schema** (parser validates; runtime reads; editors get IntelliSense)
- the **theme tokens** (theme authors set them; layouts consume them; exporters translate them)
- the **CLI command surface** (CLI dispatches; integrations register; docs describe)
- the **MCP tool surface** (server exposes; clients call; types generate schemas)

Without a single source of truth, drift is inevitable. These specs are that source.

## Specs

| File | Owner phase | Purpose |
| --- | --- | --- |
| [`ast.md`](./ast.md) | Phase 02 | Slide AST shape: `Deck`, `Slide`, `Frontmatter`, `ClickStep`, etc. |
| [`frontmatter.md`](./frontmatter.md) | Phase 02 | Full frontmatter field reference (headmatter + per-slide). |
| [`theme-tokens.md`](./theme-tokens.md) | Phase 05 | The CSS custom-property contract. |
| [`layout-primitives.md`](./layout-primitives.md) | Phase 05 | `Stack`, `Grid`, `Wrap`, `FlexBlock`, `FitText` props. |
| [`cli.md`](./cli.md) | Phase 03 onwards | CLI subcommand surface, flags, in-TTY shortcuts. |
| [`mcp-tools.md`](./mcp-tools.md) | Phase 14 | Full MCP tool surface, transport, auth model. |
| [`sync-state.md`](./sync-state.md) | Phase 10 | `sharedState` shape and sync protocol. |
| [`directory-conventions.md`](./directory-conventions.md) | Phase 01 | Where things live: themes, drawings, exports, generated artifacts. |

A spec file gets created the first time its content matters. Each spec includes:

- **Status** — `draft`, `stable`, `frozen`. Frozen specs can't change without an ADR.
- **Scope** — what's in, what's out.
- **The actual contract** — types, schemas, file layouts.
- **Open questions** — things still TBD.
- **Change history** — append-only log of revisions with phase references.

When a phase extends a spec, the phase's *Outcome* section in the phase README cites the spec update.
