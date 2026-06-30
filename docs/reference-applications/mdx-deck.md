# MDX Deck

## Summary

MDX Deck is a React-based presentation framework authored by Brent Jackson (jxnblk) that pioneered the "MDX-as-slide-deck" model — write a single `.mdx` file, separate slides with `---`, run a CLI, get an interactive presentation in the browser. It originated the pattern that Slidev, Spectacle's MDX support, and others later adopted. The runtime is React + MDX + Gatsby, with Theme UI + Emotion handling styling.

The project is effectively **dormant**. The last meaningful release is **v4.1.1 (2020-03-12)** per `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/CHANGELOG.md` (line ~3) and `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/lerna.json`. Every commit after that point through August 2021 is a dependabot security bump (`tar`, `socket.io-parser`, `devcert`, `hosted-git-info`, etc.) — no feature work, no bug fixes, no real maintenance. The architecture also reflects a 2019–2020 React ecosystem: Gatsby 2, MDX 1, React 16, Theme UI 0.3, class-context-and-hooks hybrid.

## Monorepo layout

Top-level config: `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/package.json` (yarn workspaces over `packages/*`, `templates/*`, `examples/*`, `docs`) and `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/lerna.json` (`version: 4.1.1`).

| Package | Path | Purpose |
| --- | --- | --- |
| `mdx-deck` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/mdx-deck/` | Public entry point. Ships the `mdx-deck` CLI (`cli.js`) which shells out to `gatsby develop`/`gatsby build`. Re-exports `@mdx-deck/themes` and `@mdx-deck/gatsby-plugin`. |
| `@mdx-deck/gatsby-plugin` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/` | The actual runtime used by the CLI. Compiles MDX, registers a single Gatsby page, wraps it in an `MDXProvider`, runs the slide splitter, keyboard handling, modes, storage sync. |
| `gatsby-theme-mdx-deck` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-theme/` | Alternative, heavier runtime aimed at people who want to embed mdx-deck inside an existing Gatsby site. Adds Reach Router routes per slide, multi-deck support, GraphQL `Deck` node type, component shadowing. |
| `@mdx-deck/themes` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/` | Plain JS theme objects (`future`, `dark`, `swiss`, `comic`, `book`, `script`, `poppins`, `lobster`, `code`, `notes`, `condensed`, `yellow`, `big`, `highlight`, `prism`). |
| `create-deck` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/create-deck/` | `npm init deck my-presentation` scaffolder. Uses `initit` to copy `templates/basic`. |
| `starter` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/starter/` | Pre-wired Gatsby site that uses `gatsby-theme-mdx-deck` and reads `decks/*.mdx`. |
| `website-pdf` | `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/website-pdf/` | Standalone Puppeteer CLI used to render the `/print` route of a running deck to PDF. |

## At a glance

| Aspect | Value |
| --- | --- |
| Authoring format | MDX (`.mdx`) — markdown + JSX + ES `import`/`export` |
| Runtime stack | React 16 + `@mdx-js/mdx` + `@mdx-js/react` + Gatsby 2 + Theme UI 0.3 + Emotion 10 |
| Bundler | Webpack (via Gatsby), `@mdx-js/loader` for `.mdx` |
| Rendering approach | Client-side React DOM, with Gatsby pre-rendering the first slide to static HTML |
| Routing | URL hash (`/#3`) in the gatsby-plugin runtime; Reach Router (`/3`) in the gatsby-theme runtime |
| Styling | Theme UI `sx` prop on Emotion |
| Status | Dormant. Last feature release v4.1.1 on 2020-03-12; only dependabot bumps after that. |
| Last commit | 2021-08-03 (`tar` security bump) |

## Architecture

The "happy path" — `mdx-deck deck.mdx` — uses the `gatsby-plugin` runtime, not the `gatsby-theme`. The flow:

1. **CLI launches Gatsby.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/mdx-deck/cli.js` parses flags with `meow`, sets `process.env.__SRC__ = path.resolve(filename)`, then `execa`s `gatsby develop` (or `build`) with `cwd: __dirname`. The package's own `gatsby-config.js` is the Gatsby site config.
2. **Gatsby config wires the plugin.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/mdx-deck/gatsby-config.js` loads `@mdx-deck/gatsby-plugin` with `{ path: src, dirname }`, plus `gatsby-source-filesystem` (for static assets next to the deck) and `gatsby-plugin-compile-es6-packages` (so the workspace's ES module sources get transpiled).
3. **Gatsby compiles `.mdx`.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/gatsby-node.js` adds a webpack rule mapping `/\.mdx$/` to `@mdx-js/loader` with remark plugins `remark-images`, `remark-unwrap-images`, `remark-emoji`. `exports.resolvableExtensions` adds `.mdx`. `exports.createPages` creates a single page at `/` with `matchPath: '/*'` (catch-all), `component: source` — i.e. the user's `.mdx` file *is* the page component.
4. **Page wrapper installs MDX provider.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/index.js` exports `wrapPageElement` which wraps every page in an `MDXProvider`. The provider's `components` map injects `Notes`, `Head`, `Header`, `Footer`, `Steps`, `Appear`, `Image`, `Split`, `Horizontal`, `Invert`, `Color`, `FullScreenCode`, `StepList`, `SplitRight` — *and crucially* `wrapper: Deck` (`./deck`). The MDX `wrapper` is what receives the entire compiled MDX tree as `children`.
5. **`Deck` splits the MDX children into slides.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/deck.js` calls `split(props)` from `split-slides.js`, which walks `React.Children.toArray(props.children)`, looking at each child's `mdxType` / `originalType` props.
6. **Slide split rule.** Any child whose `mdxType === 'hr'` (i.e. a markdown `---`) becomes a split point. Children of `<Notes>`, `<Head>`, `<Header>`, `<Footer>` are pulled *out* of the linear slide stream and attached as side-channel data (`slides.head`, `slides.header`, `slides.footer`, and per-slide `slide.notes`).
7. **Index and mode state live in `Deck`.** Slide index is decoded from `props.location.hash` (`/#3` → 3). Mode is one of `default | presenter | overview | grid | print`. `Keyboard` and `Storage` are mounted as invisible components that just install effects. `Context.Provider` exposes `{ slides, index, setIndex, mode, setMode, next, previous, step, setStep, steps, setSteps, notes, header, footer }` to descendants.
8. **`Container` picks a view.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/container.js` switches on `context.mode` and renders `Main`, `Presenter`, `Overview`, `Grid`, or `Print` — each implemented in that one file.

The `gatsby-theme` (separate package) does the same thing structurally but with two real differences: it uses Reach Router so each slide gets a real route (`/0`, `/1`, ...) instead of a hash, and it supports multiple `.mdx` files in a `decks/` directory (each becomes a `Deck` GraphQL node, see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-theme/gatsby-node.js`).

## Authoring format

A deck is a single `.mdx` file. Example, `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/examples/basic/deck.mdx`:

```mdx

# Hello!

---

This is MDX Deck
```

The empty newlines around `---` are mandatory — MDX's remark parser only treats it as a `thematicBreak` (the `mdxType === 'hr'` token the splitter looks for) when surrounded by blank lines. Without them it's parsed as a Setext-style heading. This footgun is documented in `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/MIGRATION.md` (lines 42–63).

More realistic example, `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/examples/header-footer/deck.mdx`:

```mdx
<Header>

# Header

</Header>

<Footer>

[@jxnblk](https://twitter.com/jxnblk)

</Footer>

# Hello!

---

This deck has a header and footer
```

Themes are picked up via `export const theme = ...` from the MDX file (see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/docs/theming.md`):

```mdx
import { themes } from 'mdx-deck'

export const theme = themes.dark

# Dark Theme
```

The `<Steps>` component animates list children in one at a time (`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/examples/steps/deck.mdx`):

```mdx
<Steps>

- One
- Two
- Three

</Steps>
```

## Features (catalog)

- **MDX slides separated by `---`.** Splitter at `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/split-slides.js`.
- **`import`/`export` inside the deck.** Any ES `import` in the `.mdx` file is honored by `@mdx-js/loader`. `export const theme = ...` is read by `Deck` via `props.theme` (see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/deck.js` line 99).
- **Built-in themes.** Exported from `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/index.js`: `default` (`base.js`), `dark`, `future`, `condensed`, `yellow`, `swiss`, `poppins`, `book`, `script`, `comic`, `notes`, `code`, `lobster`, `highlight` / `syntaxHighlighter`, `prism` / `syntaxHighlighterPrism`. Note: `base.js` is literally `export default {}` (kept for backwards-compat).
- **Theme UI–style theme objects.** Each theme file is a Theme UI config — `fonts`, `colors`, `text`, `styles`. Example: `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/future.js`.
- **Syntax highlighting via swap-in theme.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/syntax-highlighter.js` defines `theme.components.code` to wrap fenced code in `react-syntax-highlighter`. Not enabled by default — has to be merged into the theme.
- **`<Notes>`** speaker notes per slide. Component is a no-op (`createComponent('notes')` in `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/components.js` line 6–11) — it just tags itself with `__mdxDeck_notes = true` so the splitter can pull its children out.
- **`<Head>`** for `<title>`, OG tags, etc. Same no-op pattern; the splitter collects all `<Head>` children and renders them inside a `react-helmet` `<Helmet>` in `Deck` (`deck.js` line 105).
- **`<Header>` / `<Footer>`** persistent across all slides. Same no-op pattern.
- **`<Steps>` / `<Appear>` / `<StepList>`** stepwise reveal within a slide. Implemented via the `useSteps` hook (`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/use-steps.js`).
- **Layouts.** Any imported component wrapped around slide content acts as a per-slide layout. See `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/docs/layouts.md`. Built-in layouts: `Invert`, `Split`, `SplitRight`, `Horizontal`, `FullScreenCode`, `Image`, `Color` — all in `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/components.js`.
- **Presenter mode (Opt+P).** Two-pane view: current slide on the left, next-slide preview + speaker notes + clock + timer + "open in new window" link on the right. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/container.js` lines 49–129.
- **Overview mode (Opt+O).** Vertical scrolling list of all slides on the left, current slide on the right. `container.js` lines 131–198.
- **Grid mode (Opt+G).** 4-column tiled grid of all slides. `container.js` lines 200–251.
- **Print mode (`/print` route).** Renders every slide stacked vertically for printing or `website-pdf` PDF export. `container.js` lines 253–265; auto-activated when `props.location.pathname === '/print'` (`deck.js` line 48).
- **URL hash deep links.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/deck.js` reads `props.location.hash` on mount and calls `props.navigate('/#' + index, { replace: true })` on every index change (lines 36–45).
- **Cross-window sync via `localStorage`.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/storage.js` listens to the `storage` event when the window is blurred and writes when it's focused — so the presenter window drives, the audience window follows.
- **Keyboard nav.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/keyboard.js`: arrows, page-up/page-down, space, shift+space, Opt+P/O/G, esc.
- **PDF export.** Via `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/website-pdf/index.js`: `puppeteer.launch()` → `page.goto(url)` → `page.pdf({...})`. The `/print` route is what gets captured.
- **`useDeck()` and `useSteps()` hooks** for users building custom slide components. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/context.js`, `.../use-steps.js`.
- **CLI scaffolding.** `npm init deck my-presentation` via `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/create-deck/cli.js` (downloads `jxnblk/mdx-deck/templates/basic`).
- **Static asset directory.** `static/` next to `deck.mdx` is symlinked into the Gatsby site at build time (`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/gatsby-node.js` lines 10–24).

## Component & theme API

**Components exported from `mdx-deck`** (via `@mdx-deck/gatsby-plugin`, source `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/components.js`):

| Component | What it does |
| --- | --- |
| `Head` | Marker component; its children get hoisted into `react-helmet`'s `<Helmet>`. Used for `<title>`, meta tags, etc. |
| `Notes` | Marker component; children become per-slide speaker notes shown only in presenter mode. |
| `Header` | Marker component; children render as a persistent header on every slide. |
| `Footer` | Same as `Header`, bottom of slide. |
| `Steps` | Reveal children one at a time using arrow keys. Dispatches between `Appear` (no list) and `StepList` (wraps a `<ul>`/`<ol>`). |
| `Appear` | Reveal children one at a time. |
| `StepList` | `Steps` for list items — preserves the `<ul>`/`<ol>` parent. |
| `Image` | CSS `background-image` full-bleed image (not an `<img>`). |
| `Color` | Flex-centered full-bleed box with `color` and `bg` props. |
| `Invert` | `<Color color='background' bg='text' />`. |
| `Split` | 50/50 horizontal split — first child left, rest right. |
| `SplitRight` | `Split reverse`. |
| `Horizontal` | Equal-width columns side-by-side. |
| `FullScreenCode` | `<pre>` that fills the slide; targets prism styles. |

**Hooks:**

- `useDeck()` — `React.useContext(Context)`. Returns `{ slides, index, setIndex, mode, setMode, length, slide, step, steps, setStep, setSteps, direction, notes, header, footer, next, previous, toggleMode }`. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/context.js`.
- `useSteps(length)` — registers `length` steps with the deck and returns the current step index. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/use-steps.js`.

**Theme contract** (`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/theme.js` is the base, merged with the user's exported `theme` via `theme-ui`'s `merge`):

```js
{
  colors: { text, background, primary, backdrop, ... },
  fonts: { body, heading, monospace },
  fontWeights: { body, heading },
  lineHeights: { body, heading },
  text: { heading: { ... } },
  styles: {
    root, img, h1..h6, code, pre,
    Slide,   // styles for the slide wrapper
    Header,  // styles for the persistent header
    Footer,  // styles for the persistent footer
  },
  components: { code, pre, ... }, // optional MDX component overrides
  googleFont: 'https://...',      // optional Google Fonts URL, auto-injected
}
```

Themes can also expose `components` to override how MDX renders specific markdown elements (this is how syntax highlighting is injected, see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/syntax-highlighter.js`).

**Theme merge.** `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/deck.js` line 99: `const theme = merge(baseTheme, props.theme || {})`, using Theme UI's `merge`. Note in v4 *functional themes* and *arrays of themes* (`export const themes = [...]`) were removed — composition must now happen in a separate JS file.

## Notable libraries & dependencies

From `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/package.json`:

- `@mdx-js/loader` ^1.5.3 — webpack loader for `.mdx` → React components.
- `@mdx-js/mdx` ^1.5.3 — MDX compiler.
- `@mdx-js/react` ^1.x — provides `MDXProvider` (transitive, used in `src/index.js`).
- `theme-ui` ^0.3.0-alpha.6 — `ThemeProvider`, `jsx` pragma, `Box`, `Flex`, `merge`.
- `gatsby-plugin-react-helmet` + `react-helmet` — document `<head>` management.
- `remark-emoji`, `remark-images`, `remark-unwrap-images` — markdown AST transforms applied during MDX compile.
- `hhmmss` — formats seconds as `hh:mm:ss` for the presenter timer.
- `gatsby-page-utils` — only used for `createPath`/`validatePath` imports (not actually called).

From `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/mdx-deck/package.json`:

- `gatsby` ^2.13.24 — the dev server / static build / webpack orchestration.
- `meow` ^6.0.0 — CLI arg parsing.
- `execa` ^4.0.0 — spawn `gatsby develop`.
- `chalk`, `fs-extra`, `initit`.

From `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/themes/package.json`: `react-syntax-highlighter` ^12, `lodash.merge`.

From `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/website-pdf/`: `puppeteer`, `mkdirp`.

From `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-theme/package.json` (the alternative runtime): `@reach/router`, `gatsby-plugin-mdx`, `gatsby-plugin-emotion`, `gatsby-plugin-theme-ui`, `react-swipeable`, `lodash.merge`, `lodash.get`.

## Code patterns worth studying

### MDX → slide split (the load-bearing trick)

This is the heart of MDX Deck — and the cleanest example of the pattern. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/split-slides.js`:

```js
import React from 'react'

export default props => {
  const arr = React.Children.toArray(props.children)
  const splits = []
  const slides = []
  slides.head = { props: {}, children: [] }
  const notes = {}

  arr.forEach((child, i) => {
    const { originalType, mdxType, parentName, children, ...childProps } = child.props

    // get notes
    if (originalType.__mdxDeck_notes || mdxType === 'Notes') {
      notes[splits.length] = children
    } else if (originalType.__mdxDeck_header || mdxType === 'Header') {
      slides.header = children
    } else if (originalType.__mdxDeck_footer || mdxType === 'Footer') {
      slides.footer = children
    } else if (originalType.__mdxDeck_head || mdxType === 'Head') {
      slides.head.children.push(children)
      Object.assign(slides.head.props, childProps)
    }
    if (mdxType === 'hr') {
      splits.push(i)
    }
  })

  let previousSplit = 0
  splits.forEach((split, i) => {
    const children = [...arr.slice(previousSplit, split)]
    if (notes[i]) children.notes = notes[i]
    slides.push(children)
    previousSplit = split + 1
  })
  const last = [...arr.slice(previousSplit)]
  if (notes[slides.length]) last.notes = notes[slides.length]
  slides.push(last)
  // ...
  return slides
}
```

Key insights:

- The MDX compiler hands every rendered element a `props.mdxType` (`'h1'`, `'p'`, `'hr'`, `'Notes'`, ...) and `props.originalType` (the actual component constructor). The splitter introspects these without unmounting anything.
- Slide breaks are *markdown* `---` (compiled to `mdxType === 'hr'`). They are detected at the level of `React.Children.toArray(props.children)` — there is no string-level pre-processing of the MDX source.
- Side-channel components (`Notes`, `Head`, `Header`, `Footer`) are detected two ways: by an explicit static marker (`originalType.__mdxDeck_notes`) and by name (`mdxType === 'Notes'`). The marker is the canonical path — see how the components are built in `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/components.js` lines 6–16:

```js
const createComponent = key => {
  const Component = () => false
  Component.__mdxDeck = true
  Component[`__mdxDeck_${key}`] = true
  return Component
}

export const Notes  = createComponent('notes')
export const Head   = createComponent('head')
export const Header = createComponent('header')
export const Footer = createComponent('footer')
```

These components render nothing (`() => false`). They exist purely as syntactic carriers for children that the splitter later extracts. This is a really elegant trick — the *same MDX tree* both compiles cleanly through MDX and carries metadata for the slide engine.

- Per-slide notes are attached as `slides[i].notes` (a property on the array of children, not part of the React tree). That's a slightly cursed but compact way to associate side data without restructuring.

### Slide registration / numbering

There's no registration; numbering is positional. The splitter returns an array; `Deck` stores `index` as React state and derives `slide = slides[index]`. Index ↔ URL hash is round-tripped in two effects in `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/deck.js`:

```js
const getIndex = props => {
  if (!props.location) return 0
  const n = Number(props.location.hash.replace(/^#/, ''))
  return n
}
// ...
React.useEffect(() => {
  if (props.location.pathname === '/print') return
  props.navigate('/#' + index, { replace: true })
}, [index])
```

The `gatsby-theme` runtime uses real Reach Router routes per slide (`/0`, `/1`, ...) instead, so deep-linking and back/forward buttons work better — see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-theme/src/components/deck.js` lines 131–143 which create one `<Slide path="..." />` per slide inside a `<Router>`.

### Speaker view sync (`localStorage` + `storage` event)

`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/storage.js`:

```js
const keys = { slide: 'mdx-deck-slide', step: 'mdx-deck-step' }

export const useStorage = () => {
  const context = useDeck()
  const [focused, setFocused] = React.useState(false)

  const handleStorageChange = e => {
    const n = parseInt(e.newValue, 10)
    if (isNaN(n)) return
    switch (e.key) {
      case keys.slide: context.setIndex(n); break
      case keys.step:  context.setStep(n);  break
    }
  }

  React.useEffect(() => { setFocused(document.hasFocus()) }, [])

  React.useEffect(() => {
    if (!focused) window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur',  handleBlur)
    return () => {
      if (!focused) window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur',  handleBlur)
    }
  }, [focused])

  React.useEffect(() => {
    if (!focused) return
    localStorage.setItem(keys.slide, context.index)
  }, [focused, context.index])
}
```

Notes on the design:

- **Only the focused window writes**, only the blurred window listens. This neatly avoids feedback loops.
- The `storage` event only fires across *other* tabs/windows, not the writer — that's a browser-given guarantee, but the focus check makes the intent explicit.
- The presenter-mode "open in new window" link is just `<a href='/' target='_blank'>` (see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/container.js` line 107). No `postMessage`, no `BroadcastChannel`, no socket — just localStorage. Simple and works across browser tabs but not across machines.

### Theme contract (Theme UI + Emotion `sx`)

Every component uses the Theme UI `jsx` pragma:

```js
/** @jsx jsx */
import { jsx } from 'theme-ui'
```

And applies styles via the `sx` prop, e.g. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/slide.js`:

```js
<div
  {...props}
  sx={{
    boxSizing: 'border-box',
    color: 'text', bg: 'background',
    variant: 'styles.Slide',
    width, height, zoom,
  }}>
```

`variant: 'styles.Slide'` is the extension hook — theme authors set `theme.styles.Slide = {...}` to customize the slide wrapper. Same pattern for `Header` and `Footer`. This is a clean and ergonomic theming layer but it ties the runtime to Theme UI 0.3 specifically (which itself is now deprecated upstream).

### Print mode

`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/container.js` lines 253–265:

```js
const Print = props => {
  return (
    <React.Fragment>
      {props.slides.map((slide, i) => (
        <Main key={i} preview>
          <Slide>{slide}</Slide>
        </Main>
      ))}
    </React.Fragment>
  )
}
```

And the trigger, `deck.js` lines 47–55:

```js
React.useEffect(() => {
  if (props.location.pathname === '/print') {
    setMode(modes.print)
  }
  // ...
}, [])
```

So `/print` just renders every slide stacked vertically with no router; `website-pdf` (`packages/website-pdf/index.js`) drives Puppeteer at that route and calls `page.pdf({...})`. The PDF pipeline is entirely "render a page, screenshot it".

### Provider component pattern (deprecated in v4)

In v3 and earlier, themes could expose a `Provider` component that wrapped the deck — used for global state, theme switchers, etc. The example at `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/examples/themes/theme.js` still shows the pattern: a `Provider` exporting via `theme = { Provider }` that uses `useState` for the active theme name and renders nested `ThemeProvider` + `MDXProvider`. v4 removed this — `Header`/`Footer` are now the recommended way to inject persistent UI (see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/MIGRATION.md` line 7). The shift from a flexible "give me the root" extension point to two named slots is interesting: more constrained, but easier to reason about and easier for the splitter to handle.

### Useless tests

`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/cypress/integration/hello.js` contains only three trivial tests on the docs deck. Real coverage is in Jest unit tests under `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/test/` (deck.js, components.js, clock.js) which simulate keyboard events and assert on rendered content — a useful pattern for testing key handling without a real browser.

## Strengths to learn from

- **The MDX → slide pipeline is genuinely elegant.** Treating the `MDXProvider`'s `wrapper` component as the splitter is exactly the right insertion point — you get the entire compiled tree as React children, no extra parsing. `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/split-slides.js` is 64 lines and does the whole job.
- **No-op marker components** (`createComponent('notes')` returning `() => false` with static `__mdxDeck_notes = true`) are a beautiful way to let authors write semantically meaningful tags that the engine extracts as metadata. This is *much* nicer than YAML frontmatter blocks for per-slide data.
- **Side-channel hoisting** (`<Head>` → React Helmet, `<Header>`/`<Footer>` → persistent UI, `<Notes>` → speaker-mode panel) keeps the author's MDX flat — they don't have to wrap each slide in `<Slide><Layout><Content>…`.
- **`localStorage`-driven multi-window sync** with a focus check is the simplest possible multi-screen presenter solution.
- **Modes as enum + switch on a single state** (`default | presenter | overview | grid | print`) — all five views live in one file (`container.js`) and share the same underlying `Context`. Easy to extend.
- **Theme contract piggybacked on Theme UI.** Reusing an existing styling system meant authors got a documented, full-featured theming API for free.
- **CLI-as-shell-around-Gatsby.** The `mdx-deck` CLI is ~100 lines because it doesn't reinvent the build pipeline. `process.env.__SRC__ = path.resolve(filename)` to thread the user's deck into the bundler is a neat hack.
- **`/print` route + Puppeteer** is the right separation: build a "stack every slide" view and let an external tool snapshot it. Avoids embedding a PDF engine.

## Weaknesses / pain points

- **Hard Gatsby dependency.** The runtime is structurally coupled to Gatsby 2 — plugin lifecycle hooks (`onCreateWebpackConfig`, `createPages`, `wrapPageElement`), Gatsby's webpack, `gatsby develop`/`gatsby build` shell-outs. Gatsby 2 is end-of-life. Gatsby itself has effectively been abandoned post-acquisition. Updating MDX Deck means rewriting against a different bundler.
- **MDX 1.x.** MDX 2/3 changed the AST significantly. `child.props.mdxType` and `props.originalType` are MDX-1-specific shapes. Porting the splitter to MDX 3 means re-reading the new MDX AST conventions.
- **React 16.** `React.useState`/`useEffect` are fine, but the rest of the dep tree expects React 16-era APIs.
- **Theme UI 0.3** (literally `theme-ui ^0.3.0-alpha.6`). Pinned to a pre-1.0 alpha; current Theme UI is a different shape.
- **Two competing runtimes** (`@mdx-deck/gatsby-plugin` and `gatsby-theme-mdx-deck`) with subtle behavior differences (hash routing vs. real routes, single-deck vs. multi-deck, different `split-slides.js` implementations). This is confusing — `gatsby-theme/src/split-slides.js` is a strictly less capable variant of the plugin version.
- **No TypeScript.** Pure JS, no `.d.ts` shipped. Authoring extensions is type-blind.
- **Empty newlines around `---` are mandatory** but easy to forget — this is a markdown spec consequence the framework can't fix at the splitter level.
- **Hash-based routing in the main runtime.** `/#3` does not produce real browser history entries, breaks middleware, can't be linked into specific slides cleanly from external apps.
- **Splitter walks `React.Children` at render time.** Every render re-walks the entire tree to recompute slides. For a small deck (typical case) it's fine; for a 200-slide deck it's wasteful.
- **No live-reload of MDX content shown in changelog as a bug fixed/recurring.** The CLI does `gatsby clean` on every start (`cli.js` line 65).
- **Presenter sync is single-machine only.** `localStorage` `storage` events don't cross devices — a real "I'm presenting on one laptop, my notes are on my phone" workflow doesn't exist.
- **Dormant.** Last feature work over five years ago. Open issues / PRs would be unanswered.
- **Documentation is split** between the README symlink, `/docs/`, `MIGRATION.md`, and per-package READMEs, with some pages already containing commented-out stale sections (see `/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/docs/components.md` lines 88–133 which document `<Image>` and `<Embed>` inside an HTML comment).
- **Marker-component pattern doesn't compose well.** What does it mean to put `<Notes>` inside a layout component? The splitter only sees top-level children of the MDX root, so anything nested inside a layout slips through.

## Relevance to our project

The MDX-as-deck pipeline is directly relevant to us — we're planning MDX-driven authoring on Astro, and `split-slides.js` plus the no-op marker component pattern (`<Notes>`, `<Head>`, `<Header>`, `<Footer>`) is the cleanest implementation of "semantic per-slide metadata inside a flat markdown file" we've seen. We should adopt that approach (`mdxType === 'hr'` as the slide delimiter; marker components with static flags extracted at split time) but lift it from React's `React.Children.toArray` runtime walk to Astro's compile-time MDX AST so we don't repay the cost on every render. The Gatsby runtime, Theme UI 0.3 theme contract, and React-specific component model are not worth carrying forward — Astro gives us SSG and routing for free, and our MCP-server angle wants real per-slide routes (the `gatsby-theme` Reach Router approach, not the hash-based main runtime). The `localStorage` `storage` event sync (`/Users/jluterek/code/jluterek/slides/reference-applications/mdx-deck/packages/gatsby-plugin/src/storage.js`) is a good cheap baseline for presenter-window sync; we can upgrade to `BroadcastChannel` for same-origin and only reach for sockets/MCP if cross-device matters. Finally: the `/print` + Puppeteer-driven PDF export is a pattern we should copy verbatim — generate a "stack every slide" view, let an external headless browser snapshot it, ship no PDF engine of our own.
