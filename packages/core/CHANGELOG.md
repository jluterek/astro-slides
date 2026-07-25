# @astro-slides/core

## 0.6.0

### Minor Changes

- [#73](https://github.com/jluterek/astro-slides/pull/73) [`68cf49e`](https://github.com/jluterek/astro-slides/commit/68cf49e9c79c20d93571826bb73ec2bbc5b373de) Thanks [@jluterek](https://github.com/jluterek)! - Presenter-grade engagement reset ([#71](https://github.com/jluterek/astro-slides/issues/71)). Rehearsal results no longer leak into the real session: the presenter view's toolbar gains a two-step **Reset** button that wipes all poll votes and the Q&A queue, each `<Poll>` slide gains a per-poll **Reset** beside _Close voting_, and the gateway accepts a curl-able `POST /__astro-slides/engagement/reset {deck}` (token- and origin-gated like the persistence POST) for headless pre-flight. Connected phones and deck windows zero out live — the presenter island now opens its own WebSocket leg to the gateway, so presenter-initiated actions (reset, blackout, the join QR) reach audience phones directly instead of relying on a same-origin deck window. Reset actions are denied to audience-role connections server-side.

### Patch Changes

- Updated dependencies [[`68cf49e`](https://github.com/jluterek/astro-slides/commit/68cf49e9c79c20d93571826bb73ec2bbc5b373de), [`a7aeb30`](https://github.com/jluterek/astro-slides/commit/a7aeb3005c4976c40303c30540999ef21556920f)]:
  - @astro-slides/client@0.6.0
  - @astro-slides/types@0.6.0
  - @astro-slides/parser@0.6.0

## 0.5.0

### Minor Changes

- [#69](https://github.com/jluterek/astro-slides/pull/69) [`36a2fc5`](https://github.com/jluterek/astro-slides/commit/36a2fc53888137f6c00ff3a09d09283912816fd5) Thanks [@jluterek](https://github.com/jluterek)! - In-deck audience-join QR overlay ([#60](https://github.com/jluterek/astro-slides/issues/60)). Press `A` in a live deck (or the new **QR** button in presenter view) for a full-screen overlay — big QR + plain URL on the theme background — so a room of phones can join polls/Q&A/reactions without ever seeing your terminal. The overlay encodes the address phones can actually reach: under `dev --remote` a `localhost` origin is swapped for your LAN IP (advertised via runtime config), and decks built against a hosted gateway ([#62](https://github.com/jluterek/astro-slides/issues/62)) use the gateway's own host. Rides shared sync state, so the presenter view raises it on the deck window the room is watching; `A`/`Esc`/click dismiss it everywhere at once. Also fixes the presenter route 500ing in dev (`@astro-slides/client` is now `ssr.noExternal` — Vite dev-SSR was handing its raw-TS workspace entrypoints to Node, which cannot resolve `.js` specifiers to `.ts` sources).

- [#68](https://github.com/jluterek/astro-slides/pull/68) [`8b0b517`](https://github.com/jluterek/astro-slides/commit/8b0b5175c9754db63c1b3d98634ce8acfa64dfbc) Thanks [@jluterek](https://github.com/jluterek)! - Audience engagement for deployed static decks ([#62](https://github.com/jluterek/astro-slides/issues/62)). New `astro-slides gateway` command runs the sync gateway standalone anywhere Node runs — deck builds point at it via `ASTRO_SLIDES_GATEWAY=wss://<host>`, so polls, Q&A, reactions, and the phone remote work over the internet, not just `dev --remote` on a LAN. The gateway gains an `--allow-origin` allowlist (cross-origin WebSocket upgrades and engagement-persistence POSTs are origin-checked, with proper CORS on the POST), `--password` presenter tokens, and persistence under a configurable root; core exports it via the new `@astro-slides/core/gateway` subpath. The client accepts absolute `ws(s)://`/`http(s)://` gateway URLs and posts engagement state to the gateway's origin.

- [#66](https://github.com/jluterek/astro-slides/pull/66) [`4bf0905`](https://github.com/jluterek/astro-slides/commit/4bf09051f9ba514af29aa4b20a4a42ddf7ec06d1) Thanks [@jluterek](https://github.com/jluterek)! - User themes are now actually loaded ([#49](https://github.com/jluterek/astro-slides/issues/49)): put a stylesheet at `<root>/themes/<name>/theme.css` (tokens scoped under `[data-theme="<name>"]`, like the bundled themes) and select it with `theme: <name>` headmatter. The CSS is imported on the deck, presenter, print, and read routes via a virtual module, bundles into static builds, and hot-reloads in dev — standalone and embedded hosts alike. A `theme:` name that resolves to neither a bundled theme nor a `themes/` folder logs a visible warning instead of silently falling back to starter tokens. The MDX body-import workaround keeps working. `examples/embedded-site` ships a `sphere` user theme as the reference.

### Patch Changes

- [#63](https://github.com/jluterek/astro-slides/pull/63) [`c829aee`](https://github.com/jluterek/astro-slides/commit/c829aee7171b797d33d46228cd401492a5572070) Thanks [@jluterek](https://github.com/jluterek)! - Fix the dev-server reload feedback loop ([#61](https://github.com/jluterek/astro-slides/issues/61)). The per-slide MDX emitter rm-rf'd and rewrote its entire output on every re-parse; the emitted `.mdx` files live inside the watched project root, so the dev watcher treated our own output as deck edits — an infinite full-reload loop with a browser attached, ENOTEMPTY 500s from concurrent rm-rf races, and React invalid-hook errors during the storm. Four defenses, any of which breaks the loop: emission is now byte-stable (a file is written only when its content differs; strays removed individually; steady state produces zero filesystem events), the change handler ignores the emit dir, the integration tells the watcher to ignore `.astro-slides/` entirely, and emitted slide modules are invalidated explicitly on real deck edits so the ignore can't serve stale transforms.

- [#65](https://github.com/jluterek/astro-slides/pull/65) [`df69221`](https://github.com/jluterek/astro-slides/commit/df6922139a572d6bfacf15a28b5eaf76df8abc02) Thanks [@jluterek](https://github.com/jluterek)! - Three parser-correctness fixes from real-deck authoring ([#59](https://github.com/jluterek/astro-slides/issues/59), [#55](https://github.com/jluterek/astro-slides/issues/55), [#52](https://github.com/jluterek/astro-slides/issues/52)). Slot extraction now tracks fence character AND length per CommonMark, so a `::read::` marker after a 4-backtick Magic Move block lands in the read slot instead of rendering as literal slide content. All mid-slide HTML comments are stripped (fence-aware) at emit — MDX rejects them, so one misplaced comment used to 500 every deck route with an error pointing at an emitted temp file; comments are now inert anywhere while trailing speaker notes work exactly as before, including in the natural position before `::read::`. And the `---` frontmatter disambiguation requires a frontmatter-shaped `key:` first line, so a slide whose body accidentally parses as a YAML mapping (headings read as YAML comments; an `alt="text: with colon"` reads as a key) can no longer be silently swallowed as the next slide's frontmatter.

- Updated dependencies [[`36a2fc5`](https://github.com/jluterek/astro-slides/commit/36a2fc53888137f6c00ff3a09d09283912816fd5), [`8b0b517`](https://github.com/jluterek/astro-slides/commit/8b0b5175c9754db63c1b3d98634ce8acfa64dfbc), [`df69221`](https://github.com/jluterek/astro-slides/commit/df6922139a572d6bfacf15a28b5eaf76df8abc02)]:
  - @astro-slides/client@0.5.0
  - @astro-slides/parser@0.5.0
  - @astro-slides/types@0.5.0

## 0.4.1

### Patch Changes

- Updated dependencies [[`c0dba39`](https://github.com/jluterek/astro-slides/commit/c0dba39ca945c2a769387cfb1ff6e510b077e348)]:
  - @astro-slides/client@0.4.1
  - @astro-slides/types@0.4.1
  - @astro-slides/parser@0.4.1

## 0.4.0

### Minor Changes

- [#53](https://github.com/jluterek/astro-slides/pull/53) [`9ec8caa`](https://github.com/jluterek/astro-slides/commit/9ec8caa522aa8a47bfc643855cd14f62b54f85d1) Thanks [@jluterek](https://github.com/jluterek)! - Presenter view gains a slide grid — the PowerPoint "see all slides" gesture. The new **Slides** toolbar button (or `G`) opens a full-screen grid of every slide as a real prerendered thumbnail (scaled slide content, not screenshots — code, math, and diagrams render), numbered and titled, with the current slide highlighted and scrolled into view. Clicking a thumbnail jumps the presentation straight there at step 0 — click steps and animations are skipped by design. Keyboard-accessible (`Enter`/`Space` on a focused thumbnail, `Esc` closes).

### Patch Changes

- Updated dependencies [[`9ec8caa`](https://github.com/jluterek/astro-slides/commit/9ec8caa522aa8a47bfc643855cd14f62b54f85d1)]:
  - @astro-slides/client@0.4.0
  - @astro-slides/types@0.4.0
  - @astro-slides/parser@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`3794d52`](https://github.com/jluterek/astro-slides/commit/3794d52b7b0d6b2d1dd8ddccc6f90371796bf708)]:
  - @astro-slides/client@0.3.1
  - @astro-slides/types@0.3.1
  - @astro-slides/parser@0.3.1

## 0.3.0

### Minor Changes

- [#46](https://github.com/jluterek/astro-slides/pull/46) [`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421) Thanks [@jluterek](https://github.com/jluterek)! - Read mode ([#45](https://github.com/jluterek/astro-slides/issues/45)): the annotated-presentation format as a first-class output. A reserved `::read::` slot holds per-slide companion prose — sources, the spoken argument, detail that would crowd a slide — rendered **only** on the new prerendered `/read/<deck>` route: every slide as a static theme-styled block (all click steps revealed, scaled to a readable article column, phone-friendly) with its prose flowing beneath, per-slide anchors (`#slide-N`) for deep links, and Present/Print header links. Excluded from deck, presenter, print, PPTX, and image outputs; speaker notes unchanged and private; read-slot clicks never widen a slide's step count. Discoverable from the `?` help overlay ("Open reading view") and the multi-deck dashboard; respects the embedding `prefix`.

### Patch Changes

- Updated dependencies [[`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421)]:
  - @astro-slides/client@0.3.0
  - @astro-slides/types@0.3.0
  - @astro-slides/parser@0.3.0

## 0.2.0

### Minor Changes

- [#44](https://github.com/jluterek/astro-slides/pull/44) [`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318) Thanks [@jluterek](https://github.com/jluterek)! - Audience engagement (Phase 19): live polls, moderated Q&A, and emoji reactions. Declare a `<Poll id question options>` in MDX and the results tally live on the slide as the audience votes from their phones — one revisable vote per device, closable by the presenter, persisted across refreshes like drawings. Spectators join via the new `/audience` page (printed as a QR beside the remote QR under `dev --remote`), scoped server-side to vote/ask/react — audience connections can never navigate or draw. Questions land in a presenter-view moderation panel (show/dismiss; a shown question banners on the deck), and reactions float over the slides with a sprite cap. Also fixes a latent Phase 11 bug: the gateway's WebSocket handler corrupted Vite's HMR socket, reload-looping every page under `dev --remote`.

- [#42](https://github.com/jluterek/astro-slides/pull/42) [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f) Thanks [@jluterek](https://github.com/jluterek)! - Embedding into an existing Astro site is now first-class ([#39](https://github.com/jluterek/astro-slides/issues/39), [#40](https://github.com/jluterek/astro-slides/issues/40), [#41](https://github.com/jluterek/astro-slides/issues/41)). `astroSlides({ prefix: "/slides" })` namespaces every injected route — deck viewer, presenter, print, and the redirect/dashboard (which moves to `<prefix>/`) — so decks live inside a host site without claiming its top-level namespace; navigation, the presenter-launch shortcut, dashboard links, and `astro-slides export` all understand the prefix (export auto-detects it in the built output). `injectRoot: false` skips the root route entirely for hosts that own their homepage, and the 404.html static-host fallback no longer runs (or clobbers the host's 404) when embedding. `scopedReact: true` confines the bundled React renderer to astro-slides' own islands so a host's Solid/Preact/Vue-JSX renderer keeps `.jsx`/`.tsx` for its files. A new docs page ("Embedding in an existing Astro site") plus the runnable `examples/embedded-site` cover the setup, including `@astrojs/mdx` coexistence.

### Patch Changes

- Updated dependencies [[`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318), [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f)]:
  - @astro-slides/client@0.2.0
  - @astro-slides/types@0.2.0
  - @astro-slides/parser@0.2.0

## 0.1.2

### Patch Changes

- [#35](https://github.com/jluterek/astro-slides/pull/35) [`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b) Thanks [@jluterek](https://github.com/jluterek)! - Dashboard links now target each deck's actual first built slide instead of a hardcoded `/1` — a deck whose first slide is `hide: true` starts at slide 2, so Open/Present links 404'd (the single-deck redirect already handled this). The `?` help overlay now documents the `L` (laser pointer) and `D` (drawing) shortcuts, which were bound but unlisted.

- [#33](https://github.com/jluterek/astro-slides/pull/33) [`52228dc`](https://github.com/jluterek/astro-slides/commit/52228dcef52f2bfc0e0c5333523627a17d74e786) Thanks [@jluterek](https://github.com/jluterek)! - PPTX/export fidelity: theme colors, backgrounds, blank slides, and a working `--dark`. The DOM walker's color normalization read canvas `fillStyle` back as a string, which modern Chromium serializes as `oklch()` — so every theme color was silently dropped from PPTX exports; it now reads a 1×1 `getImageData` pixel (always sRGB). Slide backgrounds fall back to the deck's theme background instead of exporting on PowerPoint's default white. Slides whose content maps to no editable block (pure visual composition) are auto-rasterized instead of exporting blank. And the `--dark` flag now actually works: the deck/print routes honor `ASTRO_SLIDES_COLOR_SCHEME`, forcing the scheme over the deck's `colorSchema` and the OS default.

- [#30](https://github.com/jluterek/astro-slides/pull/30) [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856) Thanks [@jluterek](https://github.com/jluterek)! - Fix the print route (PDF export) dropping the theme background and client-rendered islands. `.as-print`/`.as-print-slide` hardcoded/omitted backgrounds, so a dark deck exported to PDF on paper-white pages — they now paint `var(--slide-bg)`. The print route ran no client scripts, so Magic Move blocks shipped as empty boxes and Mermaid diagrams as a stuck "Rendering diagram…" fallback — it now statically renders each Magic Move island at its final step (print reveals all click state) and mounts Mermaid diagrams. Mermaid islands also declare `data-waitfor=".as-mermaid svg"` so PDF/PNG exports wait for the async render instead of racing it.

- Updated dependencies [[`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b), [`3eccfba`](https://github.com/jluterek/astro-slides/commit/3eccfbae08e27dd3744615638923ead981fae7c3), [`88d13b8`](https://github.com/jluterek/astro-slides/commit/88d13b855c624e137659f6b7d27000703f9f7fb5), [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856), [`5e3f061`](https://github.com/jluterek/astro-slides/commit/5e3f06177ca64649264f7526f9aeefe8c08e2f6c)]:
  - @astro-slides/client@0.1.2
  - @astro-slides/types@0.1.2
  - @astro-slides/parser@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [[`8e0bd28`](https://github.com/jluterek/astro-slides/commit/8e0bd286d7b9f77d8561691179a3e69bb0fbc304)]:
  - @astro-slides/client@0.1.1
  - @astro-slides/types@0.1.1
  - @astro-slides/parser@0.1.1
