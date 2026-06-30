# Layout primitives

- **Status:** stub (designed in Phase 05)
- **Owner phase:** Phase 05

The small set of layout primitives that compose into built-in layouts and that authors use inside slides.

## Primitives

| Component | Purpose | Maps to |
| --- | --- | --- |
| `<Stack>` | Vertical flexbox stack | reveal.js `r-stack` / `r-vstack` |
| `<HStack>` | Horizontal flexbox stack | reveal.js `r-hstack` |
| `<Grid>` | CSS Grid wrapper with declarative columns/rows | Slidev's grid usage |
| `<Wrap>` | Centered max-width content wrap | WebSlides `.wrap` |
| `<FlexBlock>` | Equal-height, auto-wrap cells (features/metrics/clients/steps variants) | WebSlides `.flexblock` |
| `<FitText>` | Auto-fit-text to container | reveal.js `r-fit-text` (via `fitty`) |
| `<Morph>` | Marks an element as paired across slides | View Transitions `view-transition-name` (Phase 07) |
| `<Notes>` | Marker for speaker notes inside MDX | (MDX-deck-style marker, lifted to side channel) |
| `<Click>` / `<After>` / `<Clicks>` | Click step primitives | Phase 06 |
| `<RenderWhen>` | Conditional render by mode (slide / presenter / print) | Slidev's `RenderWhen` |

## Sketch (lands in Phase 05)

```tsx
// <FlexBlock>
type FlexBlockVariant = "features" | "metrics" | "clients" | "steps";
type FlexBlockProps = {
  variant?: FlexBlockVariant;
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  children: ReactNode;
};

// <FitText>
type FitTextProps = {
  min?: number;   // min font-size in px
  max?: number;   // max font-size in px
  children: ReactNode;
};

// <Morph>
type MorphProps = {
  id: string;           // pairs with same id on next/prev slide
  children: ReactNode;
};
```

## Authoring example

```mdx
---
layout: default
---

# Features

<FlexBlock variant="features" columns={3}>
  <div>
    <h3>Markdown-first</h3>
    <p>Author with the web.</p>
  </div>
  <div>
    <h3>AI-native</h3>
    <p>Drive with an MCP server.</p>
  </div>
  <div>
    <h3>Beautiful by default</h3>
    <p>Cosmic theme out of the box.</p>
  </div>
</FlexBlock>
```

## Open questions

- Should `<Click>` wrap its children (Slidev's `v-click` directive is on the element itself; we're making it a component since we're React/MDX)?
- Do we ship a `<Magic>` shorthand alias for `<Morph>` since it'll be very visible?
- How does `<FlexBlock variant="metrics">` look — a heading + big number per cell?

## Change history

- 2026-06-30 — stub (Phase 01 prep). Full props + implementations in Phase 05.
