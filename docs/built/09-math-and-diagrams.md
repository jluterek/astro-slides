---
phase: 09-math-and-diagrams
status: distilled
distilled: 2026-07-01
---

# Phase 09 — Math and diagrams

KaTeX math (inline + block + stepped), Mermaid diagrams, and PlantUML diagrams — each
plugged into the same click model and conditional-inclusion story (ADR-0011). Math and
PlantUML render at build time (no client bytes); Mermaid is the one lazily-hydrated
diagram island. Archived task notes: `todo/archive/09-math-and-diagrams/`.

## The one thing that changed vs. the plan

The plan said "port markdown-it-katex into a remark plugin (no markdown-it dep)." That
can't work under MDX: `{` starts a JS expression, so `$e^{i\pi}$` fails to parse **before
any remark plugin runs** ("Expecting Unicode escape sequence \uXXXX"). The fix is
**`remark-math`**, whose micromark extension tokenizes `$…$`/`$$…$$` at parse time so the
braces inside are math content, not expressions. Our `remark-katex` then renders those
`inlineMath`/`math` nodes with KaTeX. Same intent (KaTeX, our rendering, our step syntax),
correct mechanism for MDX.

## What shipped

**KaTeX (build-time)** — `packages/core/src/math/`
- `katex.ts` — `renderMath(tex, displayMode)` via `katex.renderToString` (`throwOnError:
  false` so one bad expression renders a red node instead of failing the build).
- `remark-katex.ts` — runs after `remark-math`: `inlineMath` → `<KaTeX inline html=…>`,
  `math` → `<KaTeX html=…>`. Stepped block math (`$$ {1|3|all}`) reads the step spec from
  the math node's **meta**, splits the body on `\\` into rows, and tags each row with
  `data-click` — revealed by the Phase-06 runtime. Numbers steps after prose + code clicks
  (shares the injected `totalClicks` via `click-total.ts`).
- Conditional CSS: the route links `katex/dist/katex.min.css?url` only when
  `deck.features.katex` (surfaced through the configs virtual module).

**Mermaid (client, lazy)** — `packages/client/src/diagrams/mermaid.ts`
- `remark-diagrams` converts ` ```mermaid ` fences to `<Mermaid code=… options=…>` **before**
  remark-code (so they aren't highlighted).
- The runtime imports `mermaid` **only when a `.as-mermaid` element exists** (Vite code-splits
  it — genuinely conditional), renders each to SVG, and mounts it in a **Shadow DOM** (CSS
  isolation). Theme follows the active color scheme (or a `theme:` fence option); `scale:`
  applies a transform. Re-renders on scheme change (matchMedia + a `data-color-scheme`
  MutationObserver).

**PlantUML (build-time encode)** — `packages/core/src/diagrams/plantuml.ts`
- `remark-diagrams` encodes ` ```plantuml `/`puml` fences with `plantuml-encoder` into a
  `<server>/svg/<encoded>` URL rendered as `<PlantUml>` → `<img>`. Server configurable via the
  `plantumlServer` integration option (default public plantuml.com). Bare source is wrapped in
  `@startuml/@enduml`.

**Shared** — `click-total.ts` extracts the `totalClicks` read/bump helper (was private to
remark-code) so remark-katex and remark-code cooperate on one authoritative count.

## How to navigate the result

- `packages/core/src/math/remark-katex.ts` — math node → `<KaTeX>`, stepped rows.
- `packages/core/src/diagrams/remark-diagrams.ts` — mermaid/plantuml fences → components.
- `packages/core/src/diagrams/plantuml.ts` — encoding + server URL.
- `packages/client/src/diagrams/mermaid.ts` — lazy load, Shadow DOM, scheme sync.
- `packages/core/src/integration.ts` — plugin order: snippets → clicks → math → katex →
  diagrams → code.
- `packages/core/src/routes/slide.astro` — conditional KaTeX `<link>` via `features`.

## Key decisions

- **`remark-math` for delimiter tokenization** — mandatory under MDX (brace protection); a
  hand-rolled `$`-scanner in a remark plugin runs too late.
- **Math + PlantUML at build time, Mermaid on the client** — math/PlantUML reduce to
  HTML/`<img>` (zero runtime bytes); Mermaid needs a live renderer, so it's the lone lazy
  island.
- **Conditional inclusion two ways** — KaTeX CSS gated by `deck.features.katex` (build-time
  signal from the parser); Mermaid gated by DOM presence + Vite code-splitting (network-time).
- **Shadow DOM for Mermaid** — isolates mermaid's injected CSS from the deck and vice versa.
- **Stepped math reuses the click contract** — `data-click` rows + `totalClicks` cooperation,
  no parallel stepping system (same pattern as code line steps).

## What surprised us

- **LaTeX braces break MDX parsing pre-remark** — the whole reason `remark-math` is required;
  no remark plugin can intervene early enough on its own.
- **remark-math exposes the block's info string as `node.meta`** — exactly where our
  `{1|3|all}` step spec lands, so no custom delimiter parsing was needed.
- **Attaching a Shadow DOM hides light-DOM children with no `<slot>`** — the "Rendering…"
  fallback disappears for free once the SVG mounts.
- **Mermaid is heavy** — keeping it behind a presence check + dynamic import keeps it out of
  the main client bundle entirely (verified: `mermaid.core.*.js` is its own chunk).

## Loose ends

- **Stepped math renders each `\\` row independently** — `&` column alignment across rows
  isn't preserved in stepped mode (fine left-aligned; a documented trade-off).
- **PlantUML color scheme** is whatever the server renders — no automatic dark variant.
- **KaTeX fonts aren't subset** — the full `.woff2` set ships; browsers fetch only glyphs
  used, but build-time subsetting for production decks is a future optimization.
- **Mermaid `securityLevel: loose`** to allow richer diagrams — revisit if untrusted decks
  become a concern.
- **No pixel snapshots** — e2e asserts structure (KaTeX nodes, stepped-row reveal, SVG in the
  shadow root, PlantUML `<img>` src), not rendered pixels.

## Stats

New `packages/core/src/math/` (katex, remark-katex) + `diagrams/` (remark-diagrams, plantuml)
+ `client/src/diagrams/mermaid.ts` + KaTeX/Mermaid/PlantUml components + `diagrams.css` +
shared `click-total.ts`. Deps: `katex`, `remark-math`, `mermaid`, `plantuml-encoder`. 181 unit
tests (+18: KaTeX render + stepped math + click numbering, PlantUML encoding, diagram fence
conversion, mermaid option parsing) + 17 Playwright e2e (+4: KaTeX + conditional CSS, stepped
math reveal, Mermaid Shadow-DOM SVG, PlantUML image). Demo grew to 21 slides.

---

**Workflow:** Created at phase close, before `todo/09-math-and-diagrams/` moved to
`todo/archive/`. See `todo/README.md` § *Completing a phase*.
