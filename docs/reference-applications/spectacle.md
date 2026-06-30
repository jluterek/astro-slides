# Spectacle

## Summary

Spectacle is a React-based presentation library originally built by Formidable Labs (now stewarded by Nearform). It is the dominant React-first slide framework: decks are authored as JSX trees, MDX modules, or pure Markdown, and rendered to the DOM through React + `styled-components` + `styled-system`. The implementation is a pnpm monorepo at `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle` containing three publishable packages: `spectacle` (the runtime, version `10.2.3` as of this snapshot), `spectacle-mdx-loader` (a webpack MDX-to-slides loader), and `create-spectacle` (a project scaffolder). Status is "Active" per `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/README.md` (line 32–34); the `CHANGELOG.md` shows ongoing patch/minor releases through React 19 compatibility (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/CHANGELOG.md`).

The interesting bits architecturally are: (1) a portal-based slide collection model that lets users freely nest `<Slide>` components, (2) a global step counter built by walking DOM placeholders rather than by registering with a context, (3) presenter mode that drives a second deck via `BroadcastChannel` and `window.history`, and (4) a print/PDF mode that re-renders every slide flowed vertically with CSS `@page`. The core engine is small — `packages/spectacle/src` is roughly 30 components plus 12 hooks.

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | JSX/TSX components (primary), MDX (via `@mdx-js/react` or `spectacle-mdx-loader`), Markdown (via built-in `MarkdownSlide` / `MarkdownSlideSet`) |
| Runtime stack | React 18+, `styled-components` v5, `styled-system` v5 |
| Rendering approach | Client-side DOM via React. All slides are rendered into a single portal container; one slide visible at a time, animated with `react-spring`. |
| Bundle/build | Library shipped via `tsup` (`packages/spectacle/tsup.config.ts`). Apps integrate via webpack or Vite; one-page builds via `htm`. |
| Navigation state | URL query string (`?slideIndex=N&stepIndex=M`) + `history` package + `BroadcastChannel` for presenter sync |
| Keyboard shortcuts | `mousetrap` + `kbar` command palette |
| Code highlighting | `react-syntax-highlighter` (Prism) |
| Status | Active maintenance; React 19 compatibility shipped in 10.2.2 |
| License | MIT |

## Architecture

A Spectacle app's entry point renders a single `<Deck>` whose children are `<Slide>` components (or fragments, sub-components, or MDX-generated slides). The flow is:

1. The default export `Deck` (re-exported from `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/deck/index.tsx`) wraps the entire presentation in a `<CommandBar>` (kbar `KBarProvider`) and a mode dispatcher.

   ```tsx
   // packages/spectacle/src/components/deck/index.tsx
   const SpectacleDeck = (props: DeckProps): JSX.Element => {
     const { toggleMode, getCurrentMode } = useModes();
     // mousetrap bindings for mod+shift+p/o/r/e ...
     return (
       <CommandBar>
         <View getCurrentMode={getCurrentMode} toggleMode={toggleMode} {...props} />
       </CommandBar>
     );
   };
   ```

2. `View` switches between `DefaultDeck`, `PresenterMode`, `PrintMode`, `ExportMode` (= PrintMode + default theme), and `OverviewMode` (= DefaultDeck with `overviewMode` prop), based on `useModes()` which reads `?presenterMode=true`, `?printMode=true`, etc. from the URL (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-modes.ts`).

3. `DefaultDeck` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/deck/default-deck.tsx`) adds `BroadcastChannel` audience sync — it listens for `SYNC` messages from a presenter window and forwards them into `deck.current.skipTo(...)`. It also wires up swipe gestures (`react-swipeable`).

4. The actual workhorse is `DeckInternal` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/deck/deck.tsx`). It:
   - Creates a `useDeckState` reducer holding `{ activeView, pendingView, navigationDirection }`.
   - Calls `useCollectSlides()` which exposes a "placeholder container" ref. Children render into it but only as invisible placeholder `<div>`s — the real slide content is portaled elsewhere (see step 6).
   - Computes a `fitAspectRatioStyle` via `useAspectRatioFitting`, which scales the slide container to the native `theme.size.width x theme.size.height` (default `1366x768`).
   - Registers `mousetrap` left/right bindings and `kbar` actions for the command palette.
   - Sets up `useLocationSync` for two-way URL sync.
   - Provides `DeckContext` to all descendants.

5. Each `<Slide>` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/slide/slide.tsx`) renders TWO trees:
   - A *placeholder* with `className="spectacle-v7-slide"` and `data-slide-id` that stays at its natural position in the React tree.
   - The actual slide content, which is rendered via `ReactDOM.createPortal` into the deck's `slidePortalNode`.

   ```tsx
   // packages/spectacle/src/components/slide/slide.tsx (excerpt)
   return (
     <>
       {placeholder}
       <SlideContext.Provider value={{ ... }}>
         {slidePortalNode &&
           ReactDOM.createPortal(
             <AnimatedDiv ...>
               <SlideContainer ...>{children}</SlideContainer>
             </AnimatedDiv>,
             slidePortalNode
           )}
       </SlideContext.Provider>
     </>
   );
   ```

6. After the initial render, `useCollectSlides` reads the placeholder container with `getElementsByClassName('spectacle-v7-slide')` and extracts the ordered list of `slideId`s from `data-slide-id`. This is how Spectacle determines slide order without forcing users to put `<Slide>` as a direct child of `<Deck>`.

7. Stepping inside a slide works the same way: `<Appear>`, `<Stepper>`, `<CodePane>`, and anything else calling `useSteps()` render a hidden placeholder with `data-step-id`, `data-step-count`, `data-priority`. The slide collects them via DOM walk and assigns absolute step thresholds (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-steps.tsx`).

8. Slide transitions are animated by `react-spring`: every slide is mounted at once; the active one has its `enter` style applied, others get `from` (upcoming) or `leave` (passed). `display: none` is toggled to avoid layout cost.

9. Presenter window (`PresenterMode`) opens a *second* `DeckInternal` (the "preview deck") that runs one slide ahead, plus a `Notes` portal node where each slide's `<Notes>` is portaled into. Two browser tabs sync state over `BroadcastChannel` named `'spectacle_presenter_bus'` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-broadcast-channel.ts`).

10. Print mode renders the deck with `printMode=true`, which short-circuits the active-slide selection in `<Slide>` so *every* slide renders inline (not portal-positioned), each followed by a CSS `break-after: page` from `deck-styles.ts` `printFrameStyle`.

## Authoring format

### JSX (primary)

From `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/examples/typescript/index.tsx`:

```tsx
const Presentation = () => (
  <Deck theme={theme} template={<DefaultTemplate />}>
    <Slide>
      <FlexBox height="100%">
        <SpectacleLogo size={500} />
      </FlexBox>
      <Notes>Spectacle supports notes per slide.</Notes>
    </Slide>
    <Slide
      transition={{
        from:  { transform: 'scale(0.5) rotate(45deg)', opacity: 0 },
        enter: { transform: 'scale(1) rotate(0)',       opacity: 1 },
        leave: { transform: 'scale(0.2) rotate(315deg)', opacity: 0 }
      }}
      backgroundColor="tertiary"
      backgroundImage="url(...)"
      backgroundOpacity={0.5}
    >
      <Heading>Custom Backgrounds</Heading>
      <UnorderedList>
        <Appear><ListItem><CodeSpan>backgroundColor</CodeSpan></ListItem></Appear>
      </UnorderedList>
    </Slide>
  </Deck>
);
```

Key points:

- Slides can be wrapped in helper components (`SlideFragments` in `examples/js/index.js`) — slide collection walks the DOM placeholders, not React.Children, so any nesting works.
- `theme` and `template` are deck-level; `transition`, `backgroundColor`, etc. are per-slide overrides.
- Children inside a `<Slide>` are arbitrary React. `<Notes>` portals out to presenter mode automatically.

### Markdown via `MarkdownSlideSet`

From `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/examples/md/slides.md`:

```md
---
# Spectacle Presentation (MD)
- one
- two

--- { "layout" : "columns" }

::section
# Left column
::section
## Right column

--- { "layout" : "center" }
![datboi](https://...gif)
```

The `---` delimiter splits slides; a trailing JSON object after `---` configures the slide (e.g. `{ "layout": "columns" }` maps to a flex row layout, `"center"` to centered). See `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/utils/separate-sections-from-json.ts` and `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/markdown/markdown-layout-containers.tsx`.

Entry point (`examples/md/index.js`):

```tsx
import mdContent from './slides.md';
const Presentation = () => (
  <Deck theme={theme} template={template}>
    <MarkdownSlideSet>{mdContent}</MarkdownSlideSet>
  </Deck>
);
```

The markdown string itself is pipelined through `remark-parse` → custom directive plugins → `remark-rehype` → `rehype-react`, producing React elements that map onto Spectacle's typography components via `mdxComponentMap` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/utils/mdx-component-mapper.tsx`):

```ts
const mdxComponentMap: MarkdownComponentMap = {
  p: Text,
  h1: (props) => <Heading {...props} fontSize="h1" />,
  h2: (props) => <Heading {...props} fontSize="h2" />,
  // ...
  ul: UnorderedList, ol: OrderedList, li: ListItem,
  img: Image, a: Link, table: Table, tr: TableRow, td: TableCell
};
```

### MDX

The MDX example (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/examples/mdx/index.js`) compiles `slides.mdx` through `spectacle-mdx-loader` (a webpack loader at `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle-mdx-loader/src/index.js`) which splits the MDX file on `\n---\n` into an array of MDX components plus a parallel `notes` array. The user then wires them into slides manually:

```tsx
import slides, { notes } from './slides.mdx';
<MDXProvider components={mdxComponentMap}>
  <Deck theme={theme} template={template}>
    {slides.map((MDXSlide, i) => (
      <Slide key={`slide-${i}`}>
        <MDXSlide />
        <Notes><{notes[i]} /></Notes>
      </Slide>
    ))}
  </Deck>
</MDXProvider>
```

The loader's helpers extract `Notes:` blocks line-prefixed with `Notes: ` and wrap each slide's compiled MDX component (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle-mdx-loader/src/helpers.js`).

## Component API

All exports live in `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/index.ts`.

### Core deck/slide

- **`<Deck>`** — `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/deck/index.tsx` (mode dispatcher) and `.../deck/deck.tsx` (engine). Props (`DeckProps`):
  - `theme?: SpectacleThemeOverrides & MarkdownThemeOverrides & BackdropOverrides`
  - `template?: TemplateFn | ReactNode`
  - `transition?: SlideTransition` — default deck-wide spring transition
  - `autoPlay?: boolean`, `autoPlayLoop?: boolean`, `autoPlayInterval?: number`
  - `printScale?: number` (default `1.0`), `overviewScale?: number` (default `0.25`)
  - `backgroundImage?: string`
  - `suppressBackdropFallback?: boolean` (deprecated)
  - Imperative ref methods: `initializeTo`, `skipTo`, `stepForward`, `stepBackward`, `advanceSlide`, `regressSlide`, `numberOfSlides`, `activeView`.

- **`<Slide>`** — `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/slide/slide.tsx`. Props:
  - `id?: SlideId` (else `useId()`)
  - `backgroundColor?` (default `"tertiary"` theme color)
  - `backgroundImage?`, `backgroundOpacity?`, `backgroundPosition?`, `backgroundRepeat?`, `backgroundSize?`
  - `padding?` (default `2` — i.e. theme `space[2]`)
  - `textColor?` (default `"primary"`)
  - `template?` — per-slide template override
  - `transition?: SlideTransition` — overrides deck transition
  - `className?`

### Stepping primitives

- **`<Appear>`** — single-step reveal. Wraps `useSteps(1)`. Props: `id`, `priority`, `tagName`, `activeStyle` (default `{ opacity: 1 }`), `inactiveStyle` (default `{ opacity: 0 }`). File: `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/appear.tsx`.
- **`<Stepper>`** — multi-step value sequencer. Calls `useSteps(values.length)`. Provides render-prop API: `(value, step, isActive) => ReactNode`. Same file.
- **`useSteps(numSteps, { id?, priority? })`** — exposed hook for custom stepping (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-steps.tsx`).

### Typography (`packages/spectacle/src/components/typography.tsx`)

All are `styled-system` styled `div`/`a`/`ul`/etc. with default props pulled from `theme.colors`/`theme.fonts`/`theme.fontSizes`:

- `<Text>` — body text. Default `color: primary, fontFamily: text, fontSize: text`.
- `<Heading>` — default `color: secondary, fontFamily: header, fontSize: h1, fontWeight: bold, textAlign: center`.
- `<Link>` — anchor, default `color: quaternary, textDecoration: underline`.
- `<Quote>` — italic block with left border in `theme.colors.secondary`.
- `<OrderedList>`, `<UnorderedList>`, `<ListItem>`.
- `<CodeSpan>` — inline monospace.
- `<FitText>` — text that scales to fit container width via `use-resize-observer`.

### Layout primitives (`packages/spectacle/src/components/layout-primitives.ts`)

- `<Box>` — `compose(layout, space, position, color, border)`
- `<FlexBox>` — `<Box>` + `flexbox`, default `display: flex; align-items: center; justify-content: center`
- `<Grid>` — `compose(layout, grid, position)`, default `display: grid`

All accept `styled-system` props (`width="50%"`, `padding={2}`, `gridTemplateColumns="1fr 1fr"`, `flexDirection="column"`, etc.).

### Code

- **`<CodePane>`** — `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/code-pane.tsx`. Renders fenced source via `react-syntax-highlighter` (Prism). Props:
  - `children: string` — the source
  - `language: string`
  - `theme?: Record<string, CSSProperties>` — Prism theme object, default `codePaneThemes.vsDark`
  - `highlightRanges?: Array<number | number[]>` — each entry is one *step* in the slide; the matching lines become opacity 1, others opacity 0.5
  - `showLineNumbers?: boolean` (default `true`)
  - `stepIndex?` — manual priority into the step sequence
- **`codePaneThemes`** — re-export of all Prism themes plus `vsDark`.

### Markdown / MDX helpers

- `<Markdown>` — markdown block inside a slide.
- `<MarkdownSlide>` — full-slide markdown; reads `slideConfig.layout` for `columns`/`center` templates.
- `<MarkdownSlideSet>` — splits a markdown blob into slides on `---` (see `separateSectionsFromJson`).
- `<MarkdownPreHelper>` — HOC that distinguishes inline `<code>` from fenced `<pre><code>`.
- `mdxComponentMap` — default tag-to-component map.

### Tables (`packages/spectacle/src/components/table.tsx`)

`<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>` — all styled-system themed.

### Templates & overlays

- `<DefaultTemplate color?>` — bottom bar with `<FullScreen>` left, `<AnimatedProgress>` right. (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/default-template.tsx`)
- `<FullScreen size? color?>` — toggles browser fullscreen via `useToggleFullScreen`.
- `<Progress size? color?>` — slide dots (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/progress.tsx`).
- `<AnimatedProgress size? color? pacmanColor?>` — dots + animated Pac-Man indicator (`.../animated-progress.tsx`).
- `<SpectacleLogo size?>` — brand logo.
- `<Notes>` — presenter-only notes; portals into the presenter window's note column.

### Slide-layout templates

`SlideLayout` default export (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/slide-layout.tsx`) bundles named layouts: `Full`, `Center`, `TwoColumn`, `List`, `Section`, `BigFact`, `Quote`, `Statement`, `Code`, `MultiCodeLayout`, `HorizontalImage`, `VerticalImage`, `ThreeUpImage`, `FullBleedImage`. Each is a `<Slide>` pre-arranged with `FlexBox`/`Grid`. Useful pattern to mirror — instead of forcing one global layout system, ship a menu of named compositions.

### Images

`<Image>` and `<FullSizeImage>` from `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/image.ts` — `styled.img` with `compose(layout, position)`.

### Misc

- `<CommandBar>` — wraps the deck in `kbar`'s `KBarProvider`. Keyboard `cmd+k` opens it. (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/command-bar/index.tsx`)
- `useMousetrap(map, deps)` — bind keyboard shortcuts (`packages/spectacle/src/hooks/use-mousetrap.ts`).

## Features (comprehensive catalog)

### Authoring formats
- **JSX/TSX** — the primary path, supports arbitrary React composition.
- **Markdown** — first-class through `MarkdownSlide` / `MarkdownSlideSet`. Supports `Notes:` lines, JSON config after `---`, and a `::section` columns directive.
- **MDX** — via `spectacle-mdx-loader` (webpack) or any MDX runtime that splits on `---`.
- **One-page htm** — a single HTML file with `htm`-tagged template literals for zero-build presentations (template referenced in `docs/index.mdx`).

### Layout
- `FlexBox` / `Grid` / `Box` via `styled-system`. Props like `gridTemplateColumns="repeat(2, 1fr)"`, `padding={2}` (theme-indexed), `position="absolute"`.
- Aspect-ratio fitting: the deck always renders at `theme.size.width x theme.size.height` (default 1366×768) and scales to fill the viewport. See `useAspectRatioFitting`.
- Per-slide `padding`, `backgroundColor`, `backgroundImage`, `backgroundOpacity`.

### Theming
- Single `theme` prop on `<Deck>`. Merged with `defaultTheme` via `mergeTheme` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/theme/index.ts`):

  ```ts
  // packages/spectacle/src/theme/default-theme.ts
  const defaultTheme = {
    size: { width: 1366, height: 768, maxCodePaneHeight: 200 },
    colors: { primary: '#ebe5da', secondary: '#fc6986', tertiary: '#1e2852',
              quaternary: '#ffc951', quinary: '#8bddfd' },
    fonts:  { header: '"Helvetica Neue",...', text: '...', monospace: '...' },
    fontSizes: { h1: '72px', h2: '64px', h3: '56px', text: '44px', monospace: '20px' },
    space: [16, 24, 32]
  };
  ```

- Passed to `ThemeProvider` from `styled-components`; all themed props (`backgroundColor="primary"`) resolve through `styled-system` lookups.
- Print mode automatically swaps in a monotone palette (`packages/spectacle/src/theme/print-theme.ts`).
- Backdrop is themable via `theme.Backdrop` (custom element type) and `theme.backdropStyle`.
- Custom MDX component map via `theme.markdownComponentMap`.

### Animations & transitions
- **Slide-level**: `transition: { from, enter, leave }` of `CSSObject`s, animated by `react-spring`. Default is `slideTransition` (translateX). `fadeTransition` is built-in (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/transitions/index.ts`).
- **Element-level**: `<Appear>` and `<Stepper>` use `useSpring` to interpolate between `activeStyle`/`inactiveStyle`.
- **Code highlight stepping**: `highlightRanges` on `<CodePane>` auto-creates one step per range.

### Code blocks
- `react-syntax-highlighter` (Prism). All Prism themes re-exported as `codePaneThemes`.
- Auto-dedent via `indentNormalizer` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/utils/indent-normalizer.ts` — clever string trick that normalizes to smallest leading whitespace).
- Per-step line highlighting with scroll-into-view.

### Presenter mode
- Activated via `cmd/ctrl+shift+p` or `?presenterMode=true`. File: `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/presenter-mode/index.tsx`.
- Side-by-side layout: left column is logo + timer + notes; right column is the current slide DeckInternal on top, a *preview* DeckInternal (sized small, `useAnimations={false}`) one slide ahead below.
- Sync is via `useBroadcastChannel('spectacle_presenter_bus', ...)`. On any `SYNC` from another tab the deck calls `skipTo()`. On initial mount the audience window posts `SYNC_REQUEST` and the presenter responds with current state. URL also stays in sync via `useLocationSync`.
- Timer component (`.../timer.tsx`) uses `useTimer` (1-second interval). Buttons to start/pause/reset are registered into the kbar command palette.

### Notes
- `<Notes>` is a `createPortal` into the presenter window's `notePortalNode` (a styled `Text` div, set via `ref={setNotePortalNode}`).
- Only renders when `isSlideActive` is true.

### Printing / export
- `printMode=true` swaps backdrop to white and renders all slides inline, each with `break-after: page`.
- `<PrintStyle pageSize="${width}px ${height}px">` injects `@page { size: ... }` CSS via `createGlobalStyle`. (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/components/print-mode/index.tsx`)
- `exportMode` is identical but keeps the user theme instead of the print monochrome theme, for "Save as PDF" from Chrome.
- Triggered by URL params `?printMode=true`, `?exportMode=true`, or keyboard `cmd+shift+r` / `cmd+shift+e`.

### Routing / URL state
- `useLocationSync` wraps the `history` package (`createBrowserHistory`) for two-way sync.
- Mapping functions in `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/location-map-fns/query-string.ts` serialize `{ slideIndex, stepIndex }` to `?slideIndex=N&stepIndex=M`. `stepIndex=final` is special.
- A custom location-map-fn could swap in hash-based routing without touching the deck.

### Backdrop / overview mode
- Overview mode (`cmd+shift+o`): every slide is rendered tiled at `overviewScale` (default 0.25). Clicking a slide jumps to it (`onSlideClick` → `toggleMode` back to default with `senderSlideIndex`). Tab/shift-Tab cycles; Enter selects. See `deck-styles.ts` `overviewFrameStyle`/`overviewWrapperStyle`.

### Auto-play
- `autoPlay` + `autoPlayInterval` from `useAutoPlay` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/utils/use-auto-play.ts`). `autoPlayLoop` wraps back to slide 0.

### Mobile / swipe
- `react-swipeable` on each slide → `onMobileSlide` → `stepForward`/`regressSlide` (`DefaultDeck`).

### Command palette
- `kbar` + `useRegisterActions` everywhere. Default actions registered in `command-bar-actions.tsx`; per-feature actions registered locally (Timer, Deck navigation, etc.).

## Notable libraries & dependencies

From `/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/package.json`:

| Dep | Purpose |
| --- | --- |
| `react`, `react-dom` | Peer deps, ≥18 |
| `styled-components` ^5 | All styling primitives |
| `styled-system` 5.1.5 | Prop-to-CSS mapping for `Box`/`FlexBox`/typography |
| `react-spring` ^9 | Spring animations for slide transitions and `<Appear>`/`<Stepper>` |
| `react-syntax-highlighter` ^15 | Prism-based code highlighting in `<CodePane>` |
| `react-swipeable` ^7 | Touch swipe navigation |
| `broadcast-channel` ^4 | Cross-tab presenter sync (polyfill for native `BroadcastChannel`) |
| `history` ^5 | URL state for slide/step index |
| `query-string` ^7 | Parse/stringify query params |
| `mousetrap` ^1 | Keyboard shortcut binding |
| `kbar` 0.1.0-beta.40 | Command palette UI |
| `merge-anything`, `lodash.clonedeep` | Deep state merging in the reducer |
| `react-fast-compare` | Cheap deep equality for location sync |
| `react-is` | Detect MDX/element types in the markdown helper |
| `use-resize-observer` ^9 | Drives `useAspectRatioFitting` and `<FitText>` |
| `unified`, `remark-parse`, `remark-rehype`, `rehype-react`, `rehype-raw`, `mdast-builder`, `mdast-zone`, `unist-util-visit` | Markdown → React pipeline |

Build: `tsup` for the library; consumer apps use webpack (existing examples) or Vite (recommended in newer scaffolds).

## Code patterns worth studying

### Slide collection via DOM placeholders

This is the most distinctive pattern. Rather than `React.Children.toArray` (which can't see slides nested inside arbitrary subcomponents like `<SlideFragments>`), Spectacle renders an invisible placeholder for each slide:

```tsx
// packages/spectacle/src/hooks/use-slides.tsx
export const PLACEHOLDER_CLASS_NAME = 'spectacle-v7-slide';

export function useCollectSlides() {
  const [slideIds, setSlideIds] = useState<SlideId[]>([]);
  // ...
  useEffect(() => {
    if (!slideContainer) return;
    const slides = slideContainer.getElementsByClassName(PLACEHOLDER_CLASS_NAME);
    const nextSlideIds: SlideId[] = [];
    for (const placeholderNode of slides) {
      const { slideId } = placeholderNode.dataset;
      if (slideId !== undefined) nextSlideIds.push(slideId);
    }
    setSlideIds(nextSlideIds);
  }, [slideContainer]);
}
```

The deck renders `<div ref={setPlaceholderContainer} style={{ display: 'none' }}>{children}</div>` — so children mount but are invisible, allowing each `<Slide>` to register itself by DOM presence. The actual slide JSX then portals out to `slidePortalNode`.

Trade-off: requires a second render pass before any slide is visible (note `initialized` flag), and forces all slide DOM to live as portal siblings rather than tree descendants.

### Step counter via DOM placeholders

Identical pattern for steps. Every `useSteps` call renders a hidden `<div data-step-id data-step-count data-priority>`; `useCollectSteps` does `getElementsByClassName('step-placeholder')`, sorts by priority, and computes activation thresholds:

```tsx
// packages/spectacle/src/hooks/use-steps.tsx
const [thresholds, numSteps] = [...placeholderNodes]
  .map((node, index) => ({
    id: node.dataset.stepId,
    count: Number(node.dataset.stepCount) || 1,
    priority: Number(node.dataset.priority) || index
  }))
  .sort(sortByKeyComparator('priority'))
  .reduce((memo, el) => {
    const [thresholds, nextThreshold] = memo;
    thresholds[el.id] = nextThreshold;
    return [thresholds, nextThreshold + el.count];
  }, [{}, 1]);
```

The threshold becomes the absolute step index at which that participant first becomes active.

### Reducer-driven deck state with pending/active split

`useDeckState` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-deck-state.ts`) holds both `pendingView` and `activeView`. Navigation actions only mutate `pendingView`; the active slide is expected to `commitTransition()` (or `cancelTransition()`) once it has decided whether to accept the new view. This lets a slide block invalid transitions (e.g. stepping past the last step) and convert them to `advanceSlide` instead. Sentinel `GOTO_FINAL_STEP = null` is used when navigating *into* an unknown slide; the receiving slide replaces it with its real `finalStepIndex`.

### Broadcast channel sync for presenter mode

```ts
// packages/spectacle/src/hooks/use-broadcast-channel.ts
const BroadcastChannel = safeWindow.BroadcastChannel || BroadcastChannelPolyfill;
// ...
channel.current = new BroadcastChannel(channelName);
```

Falls back to the `broadcast-channel` polyfill on browsers without native support. `DefaultDeck` listens for `SYNC` and calls `skipTo`; `PresenterMode` broadcasts `SYNC` on every `onActiveStateChange`. On mount, the audience side posts `SYNC_REQUEST`, the presenter responds with its current view. No `window.open` magic — the user manually opens a second tab; the channel name is the same so they auto-connect.

### Aspect-ratio fitting

`useAspectRatioFitting` measures the container with `useResizeObserver`, computes a scale factor, and applies a `transform: scale(...)` to fit a fixed `targetWidth x targetHeight` slide into any viewport without changing the slide's authored coordinate system.

### Theme system

Just a deep merge of nested objects, then handed to styled-components' `ThemeProvider`. Components consume tokens via `styled-system` props:

```tsx
// packages/spectacle/src/components/typography.tsx
const Text = styled.div.attrs<CommonTypographyProps>((props) => ({
  color: 'primary', fontFamily: 'text', fontSize: 'text', ...props
}))<CommonTypographyProps>(compose(color, typography, space));
```

`styled-system`'s `compose(color, typography, space)` parses props (`color="primary"`) into theme lookups (`theme.colors.primary`).

### Print mode

```tsx
// packages/spectacle/src/components/print-mode/index.tsx
const PrintStyle = createGlobalStyle<PrintStyleProps>`
  @media print {
    body, html { margin: 0; }
    @page { size: ${({ pageSize }) => pageSize}; }
    ${AnimatedDiv} { @page { margin: 0; } }
  }
`;
```

Page size defaults to the theme's native slide size in pixels (Chrome respects CSS custom page sizes; other browsers fall back). Combined with `printFrameStyle`'s `break-after: page`, this yields one PDF page per slide.

### Markdown pipeline

```tsx
// packages/spectacle/src/components/markdown/markdown.tsx
const compiler = unified()
  .use(remark2rehype, { allowDangerousHtml: true })
  .use(remarkRaw)
  .use(rehype2react, {
    createElement,
    components: componentMapWithPassedThroughProps
  });
```

Presenter notes are split out by a custom `remarkRehype` plugin (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/utils/remark-rehype-presenter-notes.ts`) and compiled with a *different* compiler whose `Fragment` is the `Notes` portal component:

```tsx
const notesCompiler = unified()
  .use(remark2rehype, { allowDangerousHtml: true })
  .use(remarkRaw)
  .use(rehype2react, { createElement, Fragment: Notes });
```

This is a slick way to redirect a subset of a compiled tree to a different portal.

### URL state mapping

`useLocationSync` is parameterized by `mapLocationToState` and `mapStateToLocation`. The default uses `?slideIndex=N&stepIndex=M` but you can swap implementations:

```ts
// packages/spectacle/src/location-map-fns/query-string.ts
export function mapStateToLocation(state: SlideState) {
  const query: ParsedQuery = {};
  if (typeof slideIndex !== 'number') return query;
  query.slideIndex = String(slideIndex);
  if (typeof stepIndex === 'number') query.stepIndex = String(stepIndex);
  else if (stepIndex === GOTO_FINAL_STEP) query.stepIndex = 'final';
  return { search: '?' + stringifyQS(query) };
}
```

### Mode switching via URL search params

`useModes` (`/Users/jluterek/code/jluterek/slides/reference-applications/spectacle/packages/spectacle/src/hooks/use-modes.ts`) reads `?presenterMode=true` etc., and `toggleMode` *sets* `window.location.search` (causing a full reload). It's deliberately simple — different modes are entirely different React trees, so a reload is acceptable.

## Strengths to learn from

- **Format pluralism.** JSX, Markdown, MDX, and zero-build htm all share the same runtime. The Markdown pipeline reuses Spectacle's themed typography components by mapping HTML tags to them.
- **DOM-walk slide and step collection.** Frees users from `React.Children` constraints. Any nesting works (`<SlideFragments>`, conditional rendering, MDX-generated). This is genuinely clever.
- **Reducer with pending/active split.** Lets components veto or rewrite transitions instead of doing it imperatively.
- **`react-spring` for both slide transitions and `<Appear>`.** Single animation primitive.
- **Presenter mode via `BroadcastChannel`.** No websocket, no server, no `window.open` — just open a second tab.
- **Template / DefaultTemplate pattern.** Decouples overlay UI (progress, fullscreen button) from slide content, with `slideNumber`/`numberOfSlides` injection.
- **Modes are URL-driven.** `?presenterMode=true` is a permalink; no in-app state for which "view" you're in.
- **Customizable backdrop via `theme.Backdrop`.** Easy way for users to add global effects.
- **`SlideLayout.*` catalog.** Ship named compositions (BigFact, TwoColumn, Quote, MultiCodeLayout) rather than expecting users to compose them from scratch.
- **`indentNormalizer` + `<CodePane>` dedent.** Multi-line strings in JSX *just work*.
- **Notes-via-portal.** Smart: `<Notes>` looks like a child of the slide but renders elsewhere.
- **`kbar` command palette + `mousetrap` keybinds.** Discoverable + scriptable.

## Weaknesses / pain points

- **Two-pass initialization.** Because slide IDs are collected from the DOM after mount, the first render shows nothing (`initialized` is false). Worth tolerating, but it complicates SSR; Spectacle is effectively a CSR library.
- **No SSR support out of the box.** Browser globals (`window`, `BroadcastChannel`, `document.fullscreenElement`) are referenced directly in many places. The docs even tell Next.js users to wrap in a client component.
- **`styled-components` v5 lock-in.** v5 is in maintenance mode; v6 has breaking changes. `styled-system` is essentially unmaintained. Both choices are aging.
- **Portal-everything makes scoped CSS harder.** Slide DOM lives as a sibling of the deck wrapper. Targeting "the active slide's children" with CSS requires going through React state, not the cascade.
- **Markdown layout is a tiny DSL.** Only `columns` and `center` layouts via `--- { "layout": ... }`. No first-class background images, no slide-id, no per-slide transition from inside markdown.
- **MDX integration is awkward.** Two different paths (webpack loader vs `@mdx-js/react` MDXProvider). Users must manually map MDX components to Slides and Notes. No HMR-friendly "one MDX file = one deck" out of the box.
- **`pendingView` reducer logic in `<Slide>` is dense.** Three `useEffect` blocks negotiating step boundaries; easy to break.
- **Mode switch reloads the page** (`window.location.search = ...`). Acceptable but jarring; loses runtime state.
- **No built-in speaker-screen layout customization** — the layout columns and notes styling are hardcoded.
- **No animation library beyond `react-spring`.** Custom transitions are just CSS objects — no GSAP, no scroll-driven, no FLIP.
- **No image optimization, no asset pipeline** — purely user-provided URLs.
- **No collaborative authoring, no live sync to other viewers** beyond same-origin tabs.

## Relevance to our project

Highly relevant — Spectacle is the closest existing implementation to what we are building, and we are also React/JSX-friendly via Astro islands. The patterns to **copy**: (1) DOM-placeholder slide collection so authors can nest slides through arbitrary components and MDX, (2) the pending/active reducer split so transitions can be vetoed by destination components, (3) `BroadcastChannel`-based presenter sync — the simplest viable cross-tab sync we will find, (4) the `<Notes>`-portals-into-another-tree pattern, (5) `?slideIndex=...&stepIndex=...` deep links via a swappable location-mapper, and (6) the `SlideLayout.*` catalog of named compositions rather than expecting users to recompose flex/grid themselves. The patterns to **beat**: (1) ship with SSR/Astro-static-output as a first-class path so first paint shows slide content without a JS round-trip, (2) replace `styled-components`+`styled-system` with Astro's CSS or vanilla-extract/Tailwind to drop two aging deps, (3) give markdown/MDX a richer per-slide config (transitions, backgrounds, layouts, IDs) instead of `--- { "layout": ... }` only, (4) avoid the page-reload mode switch by making presenter/print/overview pure React routes, and (5) integrate the MCP server so an LLM can drive `skipTo`/`stepForward`/`stepBackward` over the same broadcast bus that powers presenter mode. The step-counter DOM walk is borderline — it works, but with Astro components rendered at build time we have an opportunity to do step assignment statically at compile time instead.
