# PptxGenJS

## Summary

**PptxGenJS** is a TypeScript/JavaScript library that programmatically generates real `.pptx` (Open Office XML / OOXML) PowerPoint files. It is **not a runtime slide framework** — it has no rendering engine, no UI, no theming editor; it is a pure code-to-file generator. Given a script that constructs a `Presentation`, calls `addSlide()`, and pushes `addText`/`addImage`/`addChart`/`addTable`/`addShape` calls onto each slide, the library emits a fully-formed OOXML zip archive that opens losslessly in **Microsoft PowerPoint, Apple Keynote, LibreOffice Impress**, and (via import) **Google Slides**.

Maintained by **Brent Ely** ([@gitbrent](https://github.com/gitbrent/)) since 2015, licensed **MIT** (`/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/LICENSE`). Current version **4.0.1** (released 2025-06-25 per `/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/CHANGELOG.md`). Status: actively maintained (v4.0.0 in May 2025 modernised the build, added `exports` field, dropped CRA demo for Vite). The runtime has a single hard dependency: **JSZip** (and `image-size` for Node image dimensioning, plus `https` for remote image fetch in Node). Ships dual ESM + CJS builds plus a self-contained UMD-style browser bundle.

Ecosystem position: PptxGenJS is the **de-facto** way to author `.pptx` from JS. It is the engine behind `react-pptx`, countless dashboard exporters, and is referenced in almost every Stack Overflow answer about generating PowerPoint from Node. It is the natural backend for any framework that needs a real PowerPoint file as one of its export targets.

## At a glance

| Aspect | Value |
| --- | --- |
| Purpose | Programmatic `.pptx` generation (no rendering) |
| Stack | TypeScript 5.6, compiled with Rollup + rollup-plugin-typescript2 |
| Output | `.pptx` (Open XML / OOXML, zipped via JSZip) |
| Runtimes | Node.js, modern browsers, Vite, Webpack, Electron, Web Workers, serverless/edge |
| Bundle formats | CJS (`dist/pptxgen.cjs.js`), ESM (`dist/pptxgen.es.js`), IIFE bundle (`dist/pptxgen.bundle.js`), minified (`dist/pptxgen.min.js`) |
| Dependencies | `jszip ^3.10.1`, `image-size ^1.2.1`, `https ^1.0.0`, `@types/node` |
| License | MIT |
| Status | Active — v4.0.1 released 2025-06-25 |
| Repo | https://github.com/gitbrent/PptxGenJS |
| Type defs | First-party (`/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/types/index.d.ts`, 2679 lines) |

## Architecture

The library is small and surprisingly flat. Six TypeScript source files contain the entire engine (`/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/src/`, ~12.8k LOC total):

```
src/pptxgen.ts        791 lines  Top-level Presentation class + exportPresentation pipeline
src/slide.ts          246 lines  Slide class — addText/addImage/addChart/addShape/...
src/core-enums.ts     771 lines  EMU constant, layouts, shape names, chart names, defaults
src/core-interfaces.ts 1874 lines  All TS interfaces for props/options (mirror of types/index.d.ts)
src/gen-objects.ts    1243 lines  Converts user props into internal slide-object descriptors
src/gen-xml.ts        1898 lines  Emits OOXML strings (slide XML, master XML, theme XML, etc.)
src/gen-charts.ts     2042 lines  Chart XML generation + embedded Excel worksheet
src/gen-tables.ts     749 lines  Table layout + auto-paging across slides
src/gen-media.ts      236 lines  Encodes images/audio/video to base64 (Node fs/https or browser fetch)
src/gen-utils.ts      275 lines  Unit conversion (inch ↔ EMU, pt), color helpers, XML escape
```

The pipeline is:

1. **API surface** — User constructs `new PptxGenJS()` (`src/pptxgen.ts:103`) and calls fluent methods on the returned `Slide` instances (`src/slide.ts:32`).
2. **Internal slide-object model** — Every `addText`/`addShape`/`addImage` call funnels into a function in `src/gen-objects.ts` (e.g. `addTextDefinition`, `addImageDefinition`, `addChartDefinition`, `addShapeDefinition`, `addTableDefinition`). These build immutable `ISlideObject` descriptors and push them onto `slide._slideObjects[]`. Relationships (images, charts, hyperlinks) are tracked on `slide._rels`, `slide._relsChart`, `slide._relsMedia`.
3. **Async media encoding** — When export starts, `exportPresentation` (`src/pptxgen.ts:479`) iterates every slide and calls `genMedia.encodeSlideMediaRels()` (`src/gen-media.ts:13`), which lazily loads Node `fs`/`https` or uses browser `fetch`+`FileReader` to convert images to base64.
4. **OOXML generation** — `gen-xml.ts` produces every XML file required by the OOXML zip: `[Content_Types].xml`, `_rels/.rels`, `ppt/presentation.xml`, `ppt/theme/theme1.xml`, `ppt/slideMasters/slideMaster1.xml`, `ppt/slideLayouts/slideLayoutN.xml`, `ppt/slides/slideN.xml`, `ppt/notesSlides/notesSlideN.xml`. Charts pull in `gen-charts.ts:547` (`makeXmlCharts`) which also embeds a real `.xlsx` worksheet inside the `.pptx` so PowerPoint's "Edit Data in Excel" still works.
5. **Packaging** — A `JSZip` instance is filled with all generated XML strings and base64-encoded media (`src/pptxgen.ts:482-548`), then `zip.generateAsync()` produces a Blob (browser), Node buffer (`fs`), or stream.

The zip layout is hard-coded in `src/pptxgen.ts:501-512`:

```
_rels/
docProps/
ppt/
  _rels/
  charts/_rels/
  embeddings/        (embedded xlsx for charts)
  media/             (base64-decoded image/audio/video)
  slideLayouts/_rels/
  slideMasters/_rels/
  slides/_rels/
  theme/
  notesMasters/_rels/
  notesSlides/_rels/
```

## API surface (comprehensive)

The TypeScript definitions in `/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/types/index.d.ts` are the canonical surface. The class declaration is at lines 14-144 and the namespace begins at line 146.

### Presentation (class `PptxGenJS`)

**Construction:** `new pptxgen()` — no constructor arguments.

**Mutable properties** (set after construction; see `types/index.d.ts:31-84`):

| Property | Type | Notes |
| --- | --- | --- |
| `layout` | `'LAYOUT_4x3' \| 'LAYOUT_16x9' \| 'LAYOUT_16x10' \| 'LAYOUT_WIDE' \| <custom>` | Defaults to `LAYOUT_16x9` (10" × 5.625") |
| `rtlMode` | `boolean` | Right-to-left text mode |
| `author` | `string` | OOXML `dc:creator` |
| `company` | `string` | OOXML application metadata |
| `revision` | `string` | Must be an integer string |
| `subject` | `string` | OOXML `dc:subject` |
| `title` | `string` | OOXML `dc:title` |
| `theme` | `ThemeProps` | `{ headFontFace?: string, bodyFontFace?: string }` (default `Calibri Light` / `Calibri`) |

**Readonly properties:** `version`, `presLayout`, and exposed enums: `AlignH`, `AlignV`, `ChartType`, `OutputType`, `SchemeColor`, `ShapeType`, `PlaceholderType` (see lines 22-29).

**Methods:**

| Method | Returns | Purpose |
| --- | --- | --- |
| `addSlide(props?: AddSlideProps)` | `Slide` | Creates and returns a new slide. `props` may carry `masterName` and `sectionTitle`. (`src/pptxgen.ts:659`) |
| `addSection({ title, order? })` | `void` | Group subsequent slides into a section. (`src/pptxgen.ts:640`) |
| `defineLayout({ name, width, height })` | `void` | Register a custom inch-sized layout (e.g. A3, A4). (`src/pptxgen.ts:720`) |
| `defineSlideMaster(props: SlideMasterProps)` | `void` | Register a reusable master/layout. (`src/pptxgen.ts:742`) |
| `tableToSlides(eleId, props?)` | `void` | Convert an HTML `<table>` into one or more slides with auto-paging. (`src/pptxgen.ts:782`) |
| `write(props?: WriteProps)` | `Promise<string \| ArrayBuffer \| Blob \| Uint8Array>` | Generate the file in any JSZip output type. |
| `writeFile(props?: WriteFileProps)` | `Promise<string>` | Write to disk in Node or trigger browser download. (`src/pptxgen.ts:602`) |
| `stream(props?)` | `Promise<Buffer>` | Generate Node buffer for HTTP streaming. (`src/pptxgen.ts:573`) |

`WriteProps.outputType` is `'arraybuffer' | 'base64' | 'binarystring' | 'blob' | 'nodebuffer' | 'uint8array' | 'STREAM'` (`types/index.d.ts:2443`).

### Slide (class `Slide`)

`Slide` (`src/slide.ts:32` and `types/index.d.ts:2593`) is the unit of content. All add methods are **fluent**: each returns `this` so calls can chain.

| Property | Type | Notes |
| --- | --- | --- |
| `background` | `BackgroundProps` | `{ color?, transparency?, path?, data? }` — hex color, image URL, or base64 |
| `color` | `HexColor` | Default text color for the slide |
| `hidden` | `boolean` | Hide slide from playback |
| `slideNumber` | `SlideNumberProps` | Position + style of the auto-rendered slide number |
| `newAutoPagedSlides` | `PresSlide[]` | Read-only list of slides produced by an auto-paged `addTable` |

| Method | Signature | Purpose |
| --- | --- | --- |
| `addText` | `(text: string \| TextProps[], options?: TextPropsOptions) => Slide` | Plain string or array of styled runs |
| `addShape` | `(shapeName: SHAPE_NAME, options?: ShapeProps) => Slide` | One of ~190 named shapes |
| `addImage` | `(options: ImageProps) => Slide` | `path` or `data`, sizing modes |
| `addChart` | `(type: CHART_NAME \| IChartMulti[], data: any[], options?: IChartOpts) => Slide` | All chart types |
| `addTable` | `(rows: TableRow[], options?: TableProps) => Slide` | Rich tables with auto-paging |
| `addMedia` | `(options: MediaProps) => Slide` | Audio, video, YouTube embed |
| `addNotes` | `(notes: string) => Slide` | Speaker notes (renders to `notesSlideN.xml`) |
| `background` (setter) | `BackgroundProps` | Re-runs `addBackgroundDefinition` |

### Shapes

`pptx.ShapeType` / `pptx.shapes` is a frozen enum exposing ~190 named shapes (`types/index.d.ts:195-403` and the camelCase `shapes` enum at lines 405-589). Categories:

- **Action buttons:** `actionButtonBackPrevious`, `actionButtonHome`, `actionButtonReturn`, `actionButtonMovie`, `actionButtonSound`, etc.
- **Geometry primitives:** `rect`, `roundRect`, `ellipse`, `triangle`, `rtTriangle`, `parallelogram`, `trapezoid`, `diamond`, `pentagon`, `hexagon`, `heptagon`, `octagon`, `decagon`, `dodecagon`, `pie`, `pieWedge`, `donut`, `chord`, `arc`, `teardrop`, `heart`, `cloud`, `moon`, `sun`, `lightningBolt`, `cube`, `can`
- **Arrows:** `leftArrow`, `rightArrow`, `upArrow`, `downArrow`, `leftRightArrow`, `quadArrow`, `bentArrow`, `circularArrow`, `swooshArrow`, `uturnArrow`, `curvedDownArrow`, `notchedRightArrow`, `stripedRightArrow`, `leftCircularArrow` (+ many `*Callout` variants)
- **Callouts:** `wedgeRectCallout`, `wedgeRoundRectCallout`, `wedgeEllipseCallout`, `cloudCallout`, `borderCallout1`/`2`/`3`/`4`, `accentCallout1`/`2`/`3`, `accentBorderCallout1`/`2`/`3`, `callout1`/`2`/`3`/`4`
- **Flowchart:** 25+ `flowChart*` shapes (`flowChartProcess`, `flowChartDecision`, `flowChartConnector`, etc.)
- **Stars/ribbons/banners:** `star4` through `star32`, `ribbon`, `ribbon2`, `leftRightRibbon`, `wave`, `doubleWave`, `verticalScroll`, `horizontalScroll`
- **Math:** `mathPlus`, `mathMinus`, `mathMultiply`, `mathDivide`, `mathEqual`, `mathNotEqual`
- **Special:** `line`, `lineInv`, `custGeom` (for arbitrary points-based paths)

Shape options (`ShapeProps`, `types/index.d.ts:1439`): `x`, `y`, `w`, `h` (Coord = inches as number or `"75%"`), `fill: ShapeFillProps`, `line: ShapeLineProps`, `flipH`, `flipV`, `rotate` (-360..360), `shadow`, `hyperlink`, `rectRadius` (rounded rect), `angleRange` + `arcThicknessRatio` (arc/block-arc), and `points` for custom geometry (supports `moveTo`, `arc`, `cubic`, `quadratic`, `close` segments — `types/index.d.ts:1497`).

### Text

The text API supports both **simple strings** and **rich runs**. A "text" call accepts `string | TextProps[]`, where `TextProps = { text?: string, options?: TextPropsOptions }`.

`TextBaseProps` (`types/index.d.ts:1079-1270`, used by text + table cells + chart labels) covers:

- **Style:** `bold`, `italic`, `underline` (with `style` choice of `'sng'|'dbl'|'dotted'|'wavy'|'heavy'|...` and `color`), `strike` (`true | 'sngStrike' | 'dblStrike'`), `subscript`, `superscript`
- **Color:** `color`, `highlight`, `transparency` (0-100)
- **Font:** `fontFace`, `fontSize`
- **Alignment:** `align` (`'left'|'center'|'right'|'justify'`), `valign` (`'top'|'middle'|'bottom'`)
- **Paragraph:** `breakLine`, `softBreakBefore`, `indentLevel`, `paraSpaceBefore`, `paraSpaceAfter`, `lineSpacing` (pt), `lineSpacingMultiple` (e.g. 1.5)
- **Bullets:** `bullet: true | { type:'bullet'|'number', characterCode, indent, numberType, numberStartAt }` (numberType supports roman/alpha/arabic in upper/lower/parens variants)
- **Tabs:** `tabStops: [{ position, alignment }]`
- **Direction:** `textDirection: 'horz' | 'vert' | 'vert270' | 'wordArtVert'` (since v4.0.0), `lang` (ISO 639-1), `rtlMode`
- **Layout:** `margin` (number or `[t,r,b,l]`), `charSpacing`, `fit: 'none'|'shrink'|'resize'`, `wrap`, `isTextBox`
- **Effects:** `glow: { color, opacity, size }`, `shadow`, `outline: { color, size }`
- **Hyperlinks:** `hyperlink: { url? | slide?, tooltip? }`

A `TextPropsOptions` adds shape-like positioning + fill/line so any text run is effectively a shape with text inside.

### Charts

`pptx.ChartType` enum (`types/index.d.ts:160`):

| Chart type | Notes |
| --- | --- |
| `area` | Stacked + 100% stacked variants via options |
| `bar`, `bar3d` | Horizontal/vertical via `barDir` |
| `line` | + smoothed (`lineSmooth`), markers, dash types |
| `pie` | First slice angle, no-effects mode |
| `doughnut` | `holeSize` 0-90 |
| `radar` | `radarStyle: 'standard' \| 'marker' \| 'filled'` |
| `scatter` | XY with optional trendlines |
| `bubble`, `bubble3d` | + `sizes[]` array on data |

The chart options interface `IChartOpts` (`types/index.d.ts:2399`) is the union of:

- `IChartPropsBase` — colors, opacity, 3D rotation (`v3DPerspective`, `v3DRotX`, `v3DRotY`, `v3DRAngAx`), `chartArea`, `plotArea`, `showLegend`, `showTitle`, `showValue`, `showPercent`, `showSerName`
- `IChartPropsAxisCat`/`IChartPropsAxisVal`/`IChartPropsAxisSer` — full axis control: hidden, min/max, major/minor unit, tick marks, label rotation, log scale base, time units, format codes, multi-level labels (since v3.11), secondary axes
- `IChartPropsChartBar` — gap width, overlap, bar direction
- `IChartPropsChartLine` — line cap, dash, marker symbol, smoothing
- `IChartPropsChartPie` — first slice angle
- `IChartPropsChartDoughnut` — hole size
- `IChartPropsChartRadar` — radar style
- `IChartPropsDataLabel` — position, font, format code (`'0.00%'`, `'$0.00'`)
- `IChartPropsDataTable` — show data table beneath chart
- `IChartPropsLegend` — color, font, position (`'b'|'l'|'r'|'t'|'tr'`)
- `IChartPropsTitle` — title text, color, font, position, rotation
- `OptsChartGridLine` — color, size, style (`solid|dash|dot|none`), cap

**Multi-charts (combo)** — pass `IChartMulti[]` instead of a single `CHART_NAME` to overlay (e.g. bars + line on same axes). See `IChartMulti` at line 2006 and the demo at `/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/demos/modules/demo_chart.mjs`.

Each chart additionally embeds a real `.xlsx` workbook into the `.pptx` (under `ppt/embeddings/`) so PowerPoint's "Edit Data in Excel" round-trip works. `gen-charts.ts:createExcelWorksheet` (referenced from `src/pptxgen.ts:425`) handles this.

### Tables

`addTable(rows: TableRow[], options?: TableProps)` where `TableRow = TableCell[]` and `TableCell = { text?: string | TableCell[], options?: TableCellProps }` (`types/index.d.ts:1767-1774`).

**Cell options** (`TableCellProps`, line 1631) extend `TextBaseProps` with `border` (single `BorderProps` or 4-tuple `[top,right,bottom,left]`), `colspan`, `rowspan`, `fill`, `hyperlink`, `margin`.

**Table options** (`TableProps`, line 1676) include `colW` (number or array), `rowH`, `border`, `fill`, `margin`, and the **auto-paging** controls:

| Auto-page option | Effect |
| --- | --- |
| `autoPage` | Enable wrapping a tall table across slides |
| `autoPageRepeatHeader` | Repeat header rows on each new slide |
| `autoPageHeaderRows` | How many leading rows are "header" |
| `autoPageSlideStartY` | Y offset on continuation slides |
| `autoPageCharWeight` (-1.0 to 1.0) | Tune characters-per-line heuristic |
| `autoPageLineWeight` (-1.0 to 1.0) | Tune lines-per-slide heuristic |

The auto-paging engine lives in `src/gen-tables.ts:getSlidesForTableRows` (line 181) and `genTableToSlides` (line 523). `tableToSlides(htmlEleId)` reads CSS-computed widths/borders from a real DOM `<table>` and reproduces them across as many slides as needed.

### Images & media

`ImageProps` (`types/index.d.ts:1308`):

- **Source:** `path` (URL or filesystem) **or** `data` (base64 data URL) — exactly one required
- **Geometry:** `x`, `y`, `w`, `h`, plus `rotate`, `flipH`, `flipV`
- **Sizing modes:** `sizing: { type: 'contain' | 'cover' | 'crop', w, h, x?, y? }` — these reproduce CSS `object-fit` semantics by computing OOXML `<a:srcRect>` clip rectangles (`src/gen-xml.ts:46-78`)
- **Effects:** `transparency` (0-100), `shadow`, `rounding` (circular crop)
- **Accessibility:** `altText`
- **Hyperlinks:** `hyperlink`
- **Placeholders:** `placeholder` (name of a master placeholder)

Supported formats: PNG, JPG, GIF (including animated), SVG, BMP. Detection is by extension and magic bytes via `image-size`.

`MediaProps` (`types/index.d.ts:1403`) for audio/video:

- `type: 'audio' | 'video' | 'online'`
- `path` (local file or http URL) **or** `link` (YouTube embed URL)
- `cover` (poster image), `extn` (override extension)

YouTube embeds use `online` type and require recent PowerPoint to play.

### Slide masters & themes

`defineSlideMaster(props: SlideMasterProps)` (`src/pptxgen.ts:742`, `types/index.d.ts:2490`):

```typescript
{
  title: string,                  // unique name, referenced by addSlide({ masterName })
  background?: BackgroundProps,   // color | path | data
  margin?: Margin,
  slideNumber?: SlideNumberProps, // position + style of auto slide #
  objects?: Array<                // ordered children rendered on master
    | { chart: IChartOpts }
    | { image: ImageProps }
    | { line: ShapeProps }
    | { rect: ShapeProps }
    | { text: TextProps }
    | { placeholder: { options: PlaceholderProps, text?: string } }
  >
}
```

`PlaceholderProps` (`types/index.d.ts:1271`):

```typescript
{
  name: string,        // referenced by text/image/chart props as `placeholder: '<name>'`
  type: 'title' | 'body' | 'pic' | 'chart' | 'tbl' | 'media',
  margin?: Margin,
  ...PositionProps,
  ...TextBaseProps,
}
```

**Theme** is restricted to font choices only (`ThemeProps` at `types/index.d.ts:1290`):

```typescript
{ headFontFace?: string, bodyFontFace?: string }
```

There is no first-class theme color scheme API. Theme colors are referenced symbolically via `pptx.SchemeColor.{text1, text2, background1, background2, accent1..accent6}` (mapped to `'tx1'|'tx2'|'bg1'|'bg2'|'accent1'..'accent6'` in `types/index.d.ts:183-194`) and resolved against the default PowerPoint theme — the actual color palette is hard-coded in the generated `ppt/theme/theme1.xml`. To change palette you currently have to fork the theme XML generator (`genXml.makeXmlTheme` in `src/gen-xml.ts`).

### Sections & layout

**Sections** group slides for outline navigation (`SectionProps` at `types/index.d.ts:2458`):

```typescript
pptx.addSection({ title: 'Charts', order?: number })
pptx.addSlide({ sectionTitle: 'Charts' })
```

**Layouts** are slide dimensions in inches. Built-ins (`src/pptxgen.ts:315-324`):

| Name | Dimensions |
| --- | --- |
| `LAYOUT_4x3` | 10" × 7.5" |
| `LAYOUT_16x9` (default) | 10" × 5.625" |
| `LAYOUT_16x10` | 10" × 6.25" |
| `LAYOUT_WIDE` | 13.33" × 7.5" |

Custom: `pptx.defineLayout({ name: 'A4', width: 11.7, height: 8.27 })`.

## Notable libraries & dependencies

From `/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/package.json:40-45`:

- **`jszip ^3.10.1`** — the only true runtime dependency. Used in `src/pptxgen.ts:62` and exclusively for the final zip packaging step (`zip.generateAsync`). All XML content is produced as plain strings by PptxGenJS itself.
- **`image-size ^1.2.1`** — Node-side intrinsic image dimension detection (so `sizing: { type: 'contain' }` knows the source aspect ratio). Aliased to `false` in the `browser` field of `package.json` so it tree-shakes out of browser bundles.
- **`https ^1.0.0`** — used in `src/gen-media.ts` to fetch remote image URLs in Node.
- **`@types/node ^22.8.1`** — type-only.

The `browser` field aliases `fs`, `https`, `image-size`, `os`, `path`, `node:fs`, `node:https`, `express` to `false`, ensuring zero Node-only code lands in browser bundles (`package.json:30-39`).

## Code patterns worth studying

### The slide object → XML pipeline

The two-phase model — first collect descriptors via `gen-objects.ts`, then emit XML via `gen-xml.ts` — keeps the public API totally synchronous (every `addX` returns `this`) while the actual file production stays asynchronous and amortised. The whole presentation is materialised only when `writeFile`/`write`/`stream` is called.

```typescript
// src/pptxgen.ts:482-510 (abbreviated)
const zip = new JSZip()
await Promise.all(arrMediaPromises)             // encode all images first
this.slides.forEach(slide => genObj.addPlaceholdersToSlideLayouts(slide))
zip.file('[Content_Types].xml', genXml.makeXmlContTypes(this.slides, ...))
zip.file('ppt/presentation.xml', genXml.makeXmlPresentation(this))
zip.file('ppt/theme/theme1.xml', genXml.makeXmlTheme(this))
this.slides.forEach((slide, idx) => {
  zip.file(`ppt/slides/slide${idx+1}.xml`, genXml.makeXmlSlide(slide))
  zip.file(`ppt/slides/_rels/slide${idx+1}.xml.rels`, genXml.makeXmlSlideRel(this.slides, this.slideLayouts, idx+1))
  zip.file(`ppt/notesSlides/notesSlide${idx+1}.xml`, genXml.makeXmlNotesSlide(slide))
})
```

### Coordinate / units system (EMU)

PowerPoint stores positions in **EMU** (English Metric Units): 914 400 EMU = 1 inch = 72 points (`src/core-enums.ts:9-10`). The user-facing API exposes inches as plain numbers, percentages as `"75%"` strings, and converts to EMU on the fly via `getSmartParseNumber` (`src/gen-utils.ts:19-42`):

```typescript
// "Assume any number less than 100 is inches"
if (typeof size === 'number' && size < 100) return inch2Emu(size)
// "Assume any number greater than 100 sure isn't inches"
if (typeof size === 'number' && size >= 100) return size
// Percentages resolve against slide width/height
if (typeof size === 'string' && size.includes('%'))
  return Math.round((parseFloat(size) / 100) * layout.width)
```

This heuristic (the `< 100` cut-off) is interesting prior art — but also a known source of bugs when someone wants a 100"+ canvas. Worth not copying verbatim.

### Color & theme handling

Two color modes coexist: hex strings (`'FF3399'`) and **scheme color tokens** (`'accent1'`, `'tx1'`, `'bg2'`). `createColorElement` in `src/gen-utils.ts:136-150` discriminates by checking if the string matches `REGEX_HEX_COLOR = /^[0-9a-fA-F]{6}$/` and falls back to `<a:schemeClr val="...">` otherwise. The library never validates that referenced scheme colors actually exist in the theme — it just trusts you. This is the model that lets `SchemeColor.accent1` resolve correctly when the user later swaps theme files outside PptxGenJS.

### Chart XML generation

`src/gen-charts.ts:547` (`makeXmlCharts`) is the biggest single function in the library (~220 lines plus helpers). It hand-builds chart OOXML (`http://schemas.openxmlformats.org/drawingml/2006/chart`) by string concatenation. Notable: every chart **also** writes an embedded XLSX worksheet so PowerPoint can offer "Edit Data in Excel" — the worksheet path goes into `ppt/embeddings/Microsoft_Excel_Worksheet*.xlsx`. The embedded workbook is itself a tiny zip generated with JSZip inside JSZip.

### Image embedding (base64 vs URL fetch)

`src/gen-media.ts:13` (`encodeSlideMediaRels`) handles three loading paths with lazy dynamic imports so the browser bundle stays Node-free:

```typescript
const isNode = typeof process !== 'undefined' && !!process.versions?.node && process.release?.name === 'node'
const loadNodeDeps = isNode ? async () => {
  ;({ default: fs } = await import('node:fs'))
  ;({ default: https } = await import('node:https'))
} : async () => {}
```

Paths: Node local file (`fs.readFileSync`), Node HTTP(S) (`https.get` with binary encoding), Browser (`fetch` + `FileReader`). A dedupe step keys on `path` so the same image URL is only fetched once across all slides (`src/gen-media.ts:38-46`).

### The packager (JSZip)

JSZip is used in the simplest way possible: `zip.folder()` to create the directory tree, `zip.file()` to add strings or base64 data, and a single `zip.generateAsync({ type, compression })` call at the end. Compression is opt-in via `compression: true` (DEFLATE, otherwise STORE).

## What it does NOT do

To set expectations against runtime slide frameworks:

- **No rendering / no preview.** There is no canvas, no DOM, no React component. You cannot show a slide in a browser without first writing it and opening it in PowerPoint Online or similar.
- **No declarative authoring.** Everything is imperative `slide.addX(opts)` calls — no JSX, no MDX, no template language.
- **No reactive updates.** Once you've added content there is no API to inspect or modify it; you'd just rebuild the presentation.
- **No theming editor / no design tokens.** Theme XML is hand-rolled. Color schemes beyond default are essentially fork-the-XML territory.
- **No layout engine.** All positioning is absolute inches/percentages. No flexbox, no grid, no auto-layout. Auto-paging exists *only* for tables.
- **No animations / transitions.** PowerPoint slide transitions and shape animations are not exposed by the API; their XML simply isn't generated. (PowerPoint will open the file without complaint, just with no animation.)
- **No comments / no review workflow.** OOXML supports comments and revision tracking; PptxGenJS does not.
- **No SmartArt.** You can hand-build similar things with shape + line groups but there's no SmartArt API.
- **No equations.** OOXML math (OMML) is not exposed.
- **No interactive elements** beyond hyperlinks and action buttons.
- **No round-trip / no parsing.** PptxGenJS is one-way: it writes `.pptx` and cannot read or modify existing `.pptx` files.

## Demo coverage

`/Users/jluterek/code/jluterek/slides/reference-applications/PptxGenJS/demos/` is the de facto feature reference, and v4.0 advertises "75+ demo slides covering every feature and usage pattern".

| Path | What it demonstrates |
| --- | --- |
| `demos/modules/demos.mjs` | Top-level driver — imports each `demo_*` module and runs them in sequence |
| `demos/modules/demo_text.mjs` | All text features: alignment, RTL, bullets, hyperlinks, super/subscript, glow, shadow, fits |
| `demos/modules/demo_shape.mjs` | Every shape type, custom geometry, fills, lines, arrows |
| `demos/modules/demo_image.mjs` | Local files, URLs, base64, sizing modes, rounding, transparency, alt text |
| `demos/modules/demo_chart.mjs` | All chart types, multi-charts, axis options, data labels, 3D, secondary axes |
| `demos/modules/demo_table.mjs` | Cell styles, borders, colspan/rowspan, auto-paging across slides |
| `demos/modules/demo_media.mjs` | Audio, video, YouTube embeds, cover images |
| `demos/modules/demo_master.mjs` | Slide masters, placeholders, slide-number widget |
| `demos/modules/masters.mjs` | Example master slide definitions (corporate-branded) |
| `demos/modules/enums.mjs` + `enums_charts.mjs` + `enums_tables.mjs` | Shared defaults / option presets used across demos |
| `demos/node/demo.js` | Node CLI runner — `node demo.js All` produces a full feature-coverage `.pptx` |
| `demos/node/demo_stream.js` | Express server example — `GET /` streams a generated `.pptx` |
| `demos/browser/index.html` + `demos/browser/js/` | Browser test page using the IIFE bundle |
| `demos/browser/worker_test.html` | Generation from inside a Web Worker |
| `demos/vite-demo/` | TypeScript + Vite SPA example — autocomplete on `pptxgen.ChartType.*` etc. |

For any feature you want to copy semantics for, the corresponding `demo_*.mjs` is the highest-signal reference because it exercises edge cases.

## Strengths to learn from

- **Tiny dependency surface.** Pure TypeScript + one zip lib. The library is essentially self-contained; we could vendor it if needed.
- **Excellent first-party types.** `types/index.d.ts` is 2,679 lines of carefully JSDoc'd interfaces — every prop has `@default`, `@example`, `@since`. IntelliSense alone almost replaces the docs.
- **Fluent, chainable API.** `slide.addText(...).addImage(...).addNotes(...)` reads naturally and is trivial to map from any AST.
- **Universal runtime.** Same code path works in Node, browser, Web Worker, Vite, Electron, edge functions — achieved through `package.json` `exports`, the `browser` field for stripping Node modules, and runtime feature-detection (`typeof process !== 'undefined' && !!process.versions?.node`).
- **Comprehensive object coverage.** ~190 shape types, all OOXML chart types, full text run model, placeholders, masters, hyperlinks, alt text, RTL — the surface mirrors PowerPoint's own UI almost 1:1.
- **HTML-to-PPTX shortcut.** `tableToSlides(htmlElementId)` is genuinely useful for dashboard exports and worth referencing as an interop hook for our own HTML-rendered slides.
- **Deterministic output.** Same inputs produce byte-identical `.pptx` (modulo timestamps), which makes snapshot testing tractable.
- **Embedded Excel for charts.** PowerPoint's chart "Edit in Excel" works because the library bothers to ship a real `xlsx` blob inside the `.pptx`. Most competitors skip this.

## Weaknesses / pain points

- **Imperative-only.** No declarative authoring. Building a presentation from a tree/AST means imperatively walking it and calling methods — easy enough, but means we own the orchestration.
- **Verbose options.** Many properties have 5+ deprecated aliases (`lineHead`/`beginArrowType`, `bkgd`/`background`, `shapeName`/`objectName`, `pt`/`width`, etc.). The 4.0 release didn't remove them.
- **Coordinate heuristic.** "Any number < 100 is inches; ≥ 100 is EMU" silently breaks for any layout > 100".
- **No theme palette API.** Changing accent colors requires forking theme XML — there's no `pptx.theme.colors.accent1 = ...`.
- **No animations / transitions API.** A real loss when exporting from a runtime framework where authors *do* expect motion to survive.
- **Limited placeholder support.** `defineSlideMaster.objects.placeholder` only supports text placeholders today (`src/gen-objects.ts:84-97` has TODO comments for image placeholders).
- **No parsing / read API.** Asymmetric — you can write but never modify.
- **Auto-paging is table-only.** Other long content (text frames, lists) doesn't auto-flow.
- **Chart XML is monolithic.** `gen-charts.ts` is a 2,000-line string-concat function; bug fixes there are slow and risky.
- **No vector / SVG embedding fidelity.** SVG images are pass-through; PowerPoint then rasterises. There's no `addPath`/`addSvg` for true vector reuse.
- **String-concat XML.** No XML builder or schema validation — typos in property names silently produce malformed XML and PowerPoint's dreaded "needs repair" dialog. The changelog is full of fixes for exactly this class of issue.

## Relevance to our project

We will almost certainly **depend on PptxGenJS directly** as the engine of our PPTX exporter. The integration is straightforward: walk our framework's slide AST, instantiate `new pptxgen()`, and for each node emit the corresponding `addText`/`addShape`/`addImage`/`addChart`/`addTable` call with translated geometry (our coordinate space → inches) and translated styling (our design tokens → hex colors + `SchemeColor` references). The object-model parity is high enough that most slide constructs round-trip cleanly.

Concretely, our exporter will live in something like `src/exporters/pptx.ts` and consume the same AST our Astro renderer uses. The mapping is mostly mechanical: a `<Slide>` becomes `pres.addSlide()`, a `<Text>` becomes `slide.addText(runs, options)` with our runs mapped to `TextProps[]`, an `<Image>` becomes `slide.addImage({ data, sizing })`, a `<Chart>` becomes `slide.addChart(type, data, opts)`. Layout templates become `defineSlideMaster` calls run once at the start of an export.

**Expected fidelity gaps** (where PPTX export will necessarily lose information): animations and transitions (no API), interactivity beyond hyperlinks/action buttons, custom fonts that aren't installed on the viewer's machine, CSS-only effects (filters, backdrop blur, gradients beyond OOXML's two-stop linear/radial), web components, embedded videos hosted on non-YouTube providers, and any layout that depends on a layout engine (flexbox, grid). For those we'll either fall back to a rasterised image of the slide or document them as web-only features. We should also plan to contribute upstream (or fork-and-patch) for theme palette control, which we'll need for design-token-driven decks.
