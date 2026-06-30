# Directory conventions

- **Status:** stable
- **Owner phase:** Phase 01

The canonical map of where things live in this repo and in user projects.

## In this monorepo

```
astro-slides/
├── packages/
│   ├── cli/                          # @astro-slides/cli (bin: astro-slides)
│   ├── core/                         # @astro-slides/core — Astro integration + Vite plugins
│   │   └── src/themes/starter/       # fallback theme bundled with core
│   ├── client/                       # @astro-slides/client — runtime UI
│   ├── parser/                       # @astro-slides/parser — MDX/MD → AST
│   ├── types/                        # @astro-slides/types — shared types
│   └── mcp-server/                   # @astro-slides/mcp-server — MCP tools
├── themes/                           # first-party folder themes (per ADR-0005)
│   └── cosmic/                       # flagship theme (Phase 16)
├── examples/                         # end-to-end example decks
│   ├── minimal/
│   ├── blog-post-embed/
│   ├── conference-talk/
│   ├── technical-tutorial/
│   └── marketing-pitch/
├── docs/                             # project documentation
│   ├── architecture/                 # cross-cutting specs (this directory)
│   ├── built/                        # one summary per completed phase
│   ├── decisions/                    # ADRs
│   └── reference-applications/       # prior-art research
├── docs-site/                        # Starlight docs site (Phase 17)
├── todo/                             # ways of working — active phases
├── skills/                           # AI skill bundle (Phase 14)
│   └── astro-slides/
├── reference-applications/           # gitignored: upstream clones
├── .claude/                          # Claude Code config
├── .github/workflows/                # CI
├── CLAUDE.md
├── readme.md
├── LICENSE
└── pnpm-workspace.yaml
```

## In a user's deck project

```
<user-deck>/
├── slides.mdx                        # primary deck source (or content/decks/<name>/slides.mdx)
├── astro.config.mjs                  # imports and configures @astro-slides/core
├── src/content.config.ts             # declares the `decks` collection (per Astro 5+)
├── package.json
├── public/                           # static assets
├── components/                       # user components, auto-imported
├── layouts/                          # user-shadowed layouts (override built-ins)
├── theme/                            # user theme folder (optional — per ADR-0005)
├── snippets/                         # source files referenced by `<<< @/snippets/...`
└── .astro-slides/
    └── drawings/<deck>/<slide-no>-<step-no>.svg   # drauu drawings; gitignore recommended
```

## Generated / build outputs (gitignored)

| Path | Owner | Lifetime |
| --- | --- | --- |
| `.astro/` | Astro | Per build |
| `node_modules/` | pnpm | Per install |
| `dist/` | Astro build | Per build |
| `<cwd>/exports/` (configurable) | `astro-slides export` | Persistent |
| `<deck>/.astro-slides/drawings/` | drauu / user | Persistent (user decides whether to commit) |

## Naming conventions

- **Package names:** `@astro-slides/<lowercase>`. CLI bin is the unscoped `astro-slides`.
- **Theme folders:** `kebab-case`.
- **Layout filenames:** `kebab-case.astro` (matches the `layout:` frontmatter value).
- **Component filenames:** `PascalCase.{tsx,astro,vue}` for components.
- **MDX slide files:** `slides.mdx` for single-deck projects; `content/decks/<name>/slides.mdx` for multi-deck.

## Change history

- 2026-06-30 — initial spec (Phase 01 prep).
