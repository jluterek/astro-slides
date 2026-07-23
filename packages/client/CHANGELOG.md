# @astro-slides/client

## 0.4.0

### Minor Changes

- [#53](https://github.com/jluterek/astro-slides/pull/53) [`9ec8caa`](https://github.com/jluterek/astro-slides/commit/9ec8caa522aa8a47bfc643855cd14f62b54f85d1) Thanks [@jluterek](https://github.com/jluterek)! - Presenter view gains a slide grid — the PowerPoint "see all slides" gesture. The new **Slides** toolbar button (or `G`) opens a full-screen grid of every slide as a real prerendered thumbnail (scaled slide content, not screenshots — code, math, and diagrams render), numbered and titled, with the current slide highlighted and scrolled into view. Clicking a thumbnail jumps the presentation straight there at step 0 — click steps and animations are skipped by design. Keyboard-accessible (`Enter`/`Space` on a focused thumbnail, `Esc` closes).

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.4.0

## 0.3.1

### Patch Changes

- [#50](https://github.com/jluterek/astro-slides/pull/50) [`3794d52`](https://github.com/jluterek/astro-slides/commit/3794d52b7b0d6b2d1dd8ddccc6f90371796bf708) Thanks [@jluterek](https://github.com/jluterek)! - Fix `astro dev` wedging on Node >= 22.18 in embedded host sites ([#48](https://github.com/jluterek/astro-slides/issues/48)). The published package's runtime entries pointed at raw TypeScript; Vite SSR-externalizes bare node_modules imports and loads them with Node's native ESM loader, which refuses to type-strip under node_modules — every deck-route render errored, retried, reload-looped the open pages, and eventually hung the dev server. Published entrypoints (`.` and `./fit-text`) now ship compiled JS + declarations for every consumer (one module graph — serving Node dist while browsers got source made Vite's optimizer disagree with itself about CJS interop); styles/themes/components stay as source under Vite. The CJS deps (`lz-string`, `recordrtc`, `@fix-webm-duration/fix`) are now imported interop-tolerantly, fixing a second latent bug where Magic Move's decompressor crashed the deck runtime in published dev installs. Verified against a Node 24 host: zero errors across dashboard/deck/read/presenter, stable presenter (was reload-looping 142×/15s), working navigation.

- Updated dependencies []:
  - @astro-slides/types@0.3.1

## 0.3.0

### Minor Changes

- [#46](https://github.com/jluterek/astro-slides/pull/46) [`f6d4623`](https://github.com/jluterek/astro-slides/commit/f6d46233c71af45216b91d25b44c3ef8ab2b9421) Thanks [@jluterek](https://github.com/jluterek)! - Read mode ([#45](https://github.com/jluterek/astro-slides/issues/45)): the annotated-presentation format as a first-class output. A reserved `::read::` slot holds per-slide companion prose — sources, the spoken argument, detail that would crowd a slide — rendered **only** on the new prerendered `/read/<deck>` route: every slide as a static theme-styled block (all click steps revealed, scaled to a readable article column, phone-friendly) with its prose flowing beneath, per-slide anchors (`#slide-N`) for deep links, and Present/Print header links. Excluded from deck, presenter, print, PPTX, and image outputs; speaker notes unchanged and private; read-slot clicks never widen a slide's step count. Discoverable from the `?` help overlay ("Open reading view") and the multi-deck dashboard; respects the embedding `prefix`.

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.3.0

## 0.2.0

### Minor Changes

- [#44](https://github.com/jluterek/astro-slides/pull/44) [`b01e701`](https://github.com/jluterek/astro-slides/commit/b01e70109dd89aaaf7dafb646b773a521a281318) Thanks [@jluterek](https://github.com/jluterek)! - Audience engagement (Phase 19): live polls, moderated Q&A, and emoji reactions. Declare a `<Poll id question options>` in MDX and the results tally live on the slide as the audience votes from their phones — one revisable vote per device, closable by the presenter, persisted across refreshes like drawings. Spectators join via the new `/audience` page (printed as a QR beside the remote QR under `dev --remote`), scoped server-side to vote/ask/react — audience connections can never navigate or draw. Questions land in a presenter-view moderation panel (show/dismiss; a shown question banners on the deck), and reactions float over the slides with a sprite cap. Also fixes a latent Phase 11 bug: the gateway's WebSocket handler corrupted Vite's HMR socket, reload-looping every page under `dev --remote`.

- [#42](https://github.com/jluterek/astro-slides/pull/42) [`eccd7c3`](https://github.com/jluterek/astro-slides/commit/eccd7c366c98ba6079adeb98bcac05cb9ab6ba0f) Thanks [@jluterek](https://github.com/jluterek)! - Embedding into an existing Astro site is now first-class ([#39](https://github.com/jluterek/astro-slides/issues/39), [#40](https://github.com/jluterek/astro-slides/issues/40), [#41](https://github.com/jluterek/astro-slides/issues/41)). `astroSlides({ prefix: "/slides" })` namespaces every injected route — deck viewer, presenter, print, and the redirect/dashboard (which moves to `<prefix>/`) — so decks live inside a host site without claiming its top-level namespace; navigation, the presenter-launch shortcut, dashboard links, and `astro-slides export` all understand the prefix (export auto-detects it in the built output). `injectRoot: false` skips the root route entirely for hosts that own their homepage, and the 404.html static-host fallback no longer runs (or clobbers the host's 404) when embedding. `scopedReact: true` confines the bundled React renderer to astro-slides' own islands so a host's Solid/Preact/Vue-JSX renderer keeps `.jsx`/`.tsx` for its files. A new docs page ("Embedding in an existing Astro site") plus the runnable `examples/embedded-site` cover the setup, including `@astrojs/mdx` coexistence.

### Patch Changes

- Updated dependencies []:
  - @astro-slides/types@0.2.0

## 0.1.2

### Patch Changes

- [#35](https://github.com/jluterek/astro-slides/pull/35) [`1dd1229`](https://github.com/jluterek/astro-slides/commit/1dd12295ba45ee0e2a02bcfbed55fe8684ba2d3b) Thanks [@jluterek](https://github.com/jluterek)! - Dashboard links now target each deck's actual first built slide instead of a hardcoded `/1` — a deck whose first slide is `hide: true` starts at slide 2, so Open/Present links 404'd (the single-deck redirect already handled this). The `?` help overlay now documents the `L` (laser pointer) and `D` (drawing) shortcuts, which were bound but unlisted.

- [#29](https://github.com/jluterek/astro-slides/pull/29) [`3eccfba`](https://github.com/jluterek/astro-slides/commit/3eccfbae08e27dd3744615638923ead981fae7c3) Thanks [@jluterek](https://github.com/jluterek)! - Fix Magic Move blocks rendering as an empty box until the last click. Three compounding issues: the island's `data-click` (step accounting only) matched the generic click-reveal hide, so the whole block sat at `opacity: 0` until its final step; the `@shikijs/magic-move` stylesheet was never imported, so whitespace tokens collapsed (`const total` → `consttotal`); and the vanilla mount never added `shiki-magic-move-container` (the framework wrappers stamp it in their templates), which carries the `white-space: pre` rule. Magic Move now shows its first step immediately with correct spacing. The e2e now asserts computed opacity and whitespace — `toBeVisible()` ignores opacity, which is how this slipped through.

- [#27](https://github.com/jluterek/astro-slides/pull/27) [`88d13b8`](https://github.com/jluterek/astro-slides/commit/88d13b855c624e137659f6b7d27000703f9f7fb5) Thanks [@jluterek](https://github.com/jluterek)! - Give View-Transitions `<Morph>` object continuity an eased ~440ms timing. The browser default (~250ms, near-linear) made morphs snap — noticeably so for elements travelling a long way — and diverged from the FLIP fallback, which already used an eased ~400ms. The runtime now flags `<html data-as-morphing="vt">` for the morph's duration and `transitions.css` scopes the `::view-transition-group` timing to it, so both morph paths feel the same. Collapses to instant under `prefers-reduced-motion`.

- [#30](https://github.com/jluterek/astro-slides/pull/30) [`afa7fe8`](https://github.com/jluterek/astro-slides/commit/afa7fe86f6e7b57849954f1d4878981eced87856) Thanks [@jluterek](https://github.com/jluterek)! - Fix the print route (PDF export) dropping the theme background and client-rendered islands. `.as-print`/`.as-print-slide` hardcoded/omitted backgrounds, so a dark deck exported to PDF on paper-white pages — they now paint `var(--slide-bg)`. The print route ran no client scripts, so Magic Move blocks shipped as empty boxes and Mermaid diagrams as a stuck "Rendering diagram…" fallback — it now statically renders each Magic Move island at its final step (print reveals all click state) and mounts Mermaid diagrams. Mermaid islands also declare `data-waitfor=".as-mermaid svg"` so PDF/PNG exports wait for the async render instead of racing it.

- [#32](https://github.com/jluterek/astro-slides/pull/32) [`5e3f061`](https://github.com/jluterek/astro-slides/commit/5e3f06177ca64649264f7526f9aeefe8c08e2f6c) Thanks [@jluterek](https://github.com/jluterek)! - Fix `<Morph>` and `view-transition` effects never playing on synced follower windows — the audience screen and presenter panes. Remote applies (BroadcastChannel sync) used URL mode `"replace"`, which was overloaded to also mean "skip the JS transition path", so any window driven from presenter mode silently downgraded every morph to a plain fade. URL mode and animation are now separate concerns: followers mirror the URL without history entries _and_ run the slide transition; only the initial paint stays instant.

- Updated dependencies []:
  - @astro-slides/types@0.1.2

## 0.1.1

### Patch Changes

- [#25](https://github.com/jluterek/astro-slides/pull/25) [`8e0bd28`](https://github.com/jluterek/astro-slides/commit/8e0bd286d7b9f77d8561691179a3e69bb0fbc304) Thanks [@jluterek](https://github.com/jluterek)! - Fix `<Morph>` object-continuity transitions aborting on Chromium/Safari. The View Transitions morph path assigned the shared `view-transition-name` to both the outgoing and incoming element up front; because both slides live in one DOM, the old-state capture saw two elements with the same name and the browser aborted the transition ("Unexpected duplicate view-transition-name"), silently falling back to an instant cut. The outgoing element is now named for the old-state capture and each name is handed off to the incoming element inside the update callback, so morphs animate as intended.

- Updated dependencies []:
  - @astro-slides/types@0.1.1
