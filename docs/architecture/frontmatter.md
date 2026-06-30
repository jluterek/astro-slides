# Frontmatter schema

- **Status:** stable (finalized in Phase 02)
- **Owner phase:** Phase 02
- **Source of truth:** `packages/types/src/frontmatter.ts` (Zod v4)

The complete YAML frontmatter reference for both headmatter (first frontmatter block, deck-level) and per-slide frontmatter. The tables below are documentation; the authoritative schema is the Zod source, from which TS types (`z.infer`) and the editor JSON Schema (`z.toJSONSchema()`) are both derived. Objects are **loose** — unknown keys (layout-specific fields, unmodeled Marp/Slidev fields) pass through rather than being stripped, per ADR-0002.

## Headmatter (deck-level — first frontmatter block)

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | string | `""` | Deck title for `<title>`, exports, MCP responses. |
| `theme` | string | `"starter"` | Theme to apply. Resolved against folder layering (per ADR-0005). |
| `class` | string | `""` | Default CSS class applied to every slide. |
| `aspectRatio` | `"16:9" \| "4:3" \| "1:1" \| string` | `"16:9"` | Slide aspect ratio. |
| `canvasWidth` | number | `1920` | Pixel width of the slide canvas. |
| `colorSchema` | `"auto" \| "light" \| "dark" \| "all"` | `"auto"` | Forces a color scheme. `"all"` ships both. |
| `transition` | string \| object | `"fade"` | Default slide-level transition. |
| `fonts` | `FontOptions` | — | Font stack overrides. |
| `seoMeta` | `SeoMeta` | — | Open Graph + Twitter card metadata. |
| `drawings` | `DrawingsOptions` | `{ persist: false }` | Drauu drawing layer options. |
| `record` | `"dev" \| "prod" \| false` | `false` | Whether the recording UI is enabled. |
| `presenter` | boolean | `true` | Whether `/presenter` is reachable. |
| `routerMode` | `"history" \| "hash"` | `"history"` | URL routing strategy. |
| `duration` | string | — | Talk duration (`"30min"`, `"1:05"`). Drives the presenter timer. |
| `addons` | string[] | `[]` | Addon names or paths (per ADR-0005-style folder addons). |
| `mdc` | boolean | `false` | Enable MDC directive syntax in MDX. |
| `monaco` | `"dev" \| "prod" \| false` | `false` | Enable Monaco code blocks (opt-in addon). |

## Per-slide frontmatter

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `layout` | string | `"default"` (or `"cover"` for slide 0) | Layout name to wrap the slide body. |
| `class` | string | `""` | CSS class applied to this slide. |
| `transition` | string \| object | inherited | Per-slide transition override. |
| `clicks` | number | computed | Override the parse-time-computed total click count. |
| `clicksStart` | number | `0` | Starting click index for relative `+1` resolution. |
| `level` | number | computed | Section nesting level (for TOC). |
| `hide` | boolean | `false` | Skip this slide in render and export. |
| `hideInToc` | boolean | `false` | Show in deck but skip in `<Toc>` lists. |
| `src` | string | — | Import another markdown file as this slide's source. |
| `routeAlias` | string | — | URL fragment override for this slide. |
| `zoom` | number | `1` | Zoom multiplier for the slide content. |
| `preload` | boolean | `false` | Force eager-load of iframes/media. |
| `exportAs` | `"editable" \| "image"` | `"editable"` | PPTX export fidelity opt-in. |
| `background` | string | — | Shorthand for `data-background-color`/`-image`. |
| `dragPos` | object | — | Persisted positions for `<VDrag>` elements. |
| `clickAnimation` | string | inherited | Default animation class for click steps. |

## Layout-specific frontmatter

Layouts may accept additional fields. These are documented per layout in Phase 05 and merged into the per-slide frontmatter via the layout component's props.

Example for `two-cols`:
```yaml
---
layout: two-cols
leftClass: pr-4
rightClass: pl-4
---
```

## Compatibility

- **Marp:** `marp: true` is accepted in headmatter and selects the Marp-flavor parsing path (Phase 15). Marp's `paginate`, `theme`, `header`, `footer`, `style`, `class`, `backgroundColor`, `backgroundImage`, `_class:`, `_color:` etc. are honored.
- **Slidev:** all of Slidev's documented frontmatter fields (above) are honored. Slidev-specific extras (e.g., `info` for footer brand) gracefully ignored.

## Validation

The Zod schemas in `packages/types/src/frontmatter.ts` are canonical. From them:

- **TS types** are inferred via `z.infer` (`Headmatter`, `Frontmatter`).
- **The editor JSON Schema** is generated via Zod 4's built-in `z.toJSONSchema()`
  (`pnpm gen:schemas`) and published at
  `@astro-slides/types/schemas/frontmatter.json` (`$defs.headmatter`,
  `$defs.frontmatter`). Editors auto-load it via a `$schema` key or the (post-v1)
  VS Code extension.

The parser runs raw YAML through `HeadmatterSchema.parse` (deck-level) and
`FrontmatterSchema.parse` (per-slide), which applies the defaults documented above.
The first frontmatter block doubles as both headmatter and slide 1's frontmatter — it
is run through both schemas.

## Change history

- 2026-06-30 — finalized in Phase 02. Canonical Zod source in `packages/types/src/frontmatter.ts`; JSON Schema via `z.toJSONSchema()`.
