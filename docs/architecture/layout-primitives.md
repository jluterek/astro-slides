# Layout primitives

- **Status:** stable
- **Owner phase:** Phase 05

The small set of composition primitives used inside built-in layouts and (once MDX-component authoring lands) inside slides. Primitives are thin `.astro` wrappers in `packages/client/components/`; their prop→DOM logic lives in `packages/client/src/primitives.ts` (`cssVars`, `flexBlockClass`) and their styling in `src/styles/primitives.css`.

## Primitives

| Component | Purpose | Emits |
| --- | --- | --- |
| `<Stack>` | Vertical flex stack | `.p-stack` + `--p-gap/align/justify` |
| `<HStack>` | Horizontal flex stack | `.p-hstack` + `--p-gap/align/justify` |
| `<Grid>` | CSS Grid wrapper | `.p-grid` + `--p-cols/gap` |
| `<Wrap>` | Centered max-width wrap | `.p-wrap` + `--p-max` |
| `<FlexBlock>` | Equal-height auto-wrap cells | `.p-flexblock.variant-*` + `--p-cols/gap` |
| `<FitText>` | Auto-fit text to width (fitty) | `.p-fittext[data-min/max]` + island script |
| `<Morph>` | Element paired across slides | `[data-morph]` + `view-transition-name` (inert until Phase 07) |
| `<RenderWhen>` | Conditional by mode | `.p-renderwhen[data-when]` (hidden unless deck `data-mode` matches) |

`<Notes>`, `<Click>`/`<After>`/`<Clicks>` are click/notes primitives owned by Phase 06.

## Props

```ts
// Stack / HStack
{ gap?: string; align?: string; justify?: string; class?: string }
// Grid
{ cols?: string; gap?: string; class?: string }         // cols = grid-template-columns value
// Wrap
{ max?: string; class?: string }
// FlexBlock
{ variant?: "features" | "metrics" | "clients" | "steps"; columns?: number; gap?: string; class?: string }
// FitText
{ min?: number; max?: number; class?: string }          // px bounds for fitty
// Morph
{ id: string; as?: string; class?: string }             // id pairs across slides
// RenderWhen
{ when?: "slide" | "presenter" | "print"; class?: string }
```

`cssVars({ gap, align })` builds the `--p-*` style string (skips empty values); `flexBlockClass(variant)` composes `p-flexblock variant-<variant>`. Both are unit-tested.

## Built-in layouts (21)

Layouts are thin `.astro` structural wrappers in `packages/client/layouts/`; all visual structure lives in `src/styles/layouts.css` (token-driven) so they stay consistent. Each receives `LayoutProps` (`packages/client/src/layout-types.ts`):

```ts
interface LayoutProps {
  no: number; title: string | null; layout: string;
  html: string;                         // rendered default-slot HTML
  slots: Record<string, string>;        // rendered HTML per named slot
  frontmatter: Record<string, unknown>; // for image/url/etc.
}
```

Names: `cover`, `default`, `center`, `intro`, `section`, `quote`, `fact`, `statement`, `two-cols`, `two-cols-header`, `image-left`, `image-right`, `image`, `iframe`, `iframe-left`, `iframe-right`, `end`, `full`, `none`, `404`, `error`.

**Slot conventions:** content layouts use `html` (the default slot). `two-cols` = `default` (left) + `right`. `two-cols-header` = `default` (header) + `left` + `right`. `image*`/`iframe*` take the media URL from frontmatter (`image` / `url`) and content from `default`.

**Resolution:** `@astro-slides/layouts` (a virtual module) resolves layout name → component across layers — user `layouts/` > theme > built-in — so a user's `cover.astro` overrides the built-in. See `packages/core/src/layout-resolver.ts`.

## Authoring example (once MDX-component rendering lands)

```mdx
---
layout: default
---
# Features

<FlexBlock variant="features" columns={3}>
  <div><h3>Markdown-first</h3><p>Author with the web.</p></div>
  <div><h3>AI-native</h3><p>Drive with an MCP server.</p></div>
  <div><h3>Beautiful by default</h3><p>Cosmic theme out of the box.</p></div>
</FlexBlock>
```

> **Note:** slide bodies currently render Markdown → HTML (no MDX component evaluation), so primitives are consumed by *layouts* today. Author-facing primitive/icon usage inside slides unlocks when MDX compilation lands (tracked as a pre-Phase-06 gap).

## Change history

- 2026-06-30 — **stable.** Primitives + 21 layouts + resolver shipped (Phase 05). Superseded the Phase 01 stub.
