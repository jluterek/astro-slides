# @astro-slides/client

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
