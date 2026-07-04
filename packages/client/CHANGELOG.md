# @astro-slides/client

## 0.1.1

### Patch Changes

- [#25](https://github.com/jluterek/astro-slides/pull/25) [`8e0bd28`](https://github.com/jluterek/astro-slides/commit/8e0bd286d7b9f77d8561691179a3e69bb0fbc304) Thanks [@jluterek](https://github.com/jluterek)! - Fix `<Morph>` object-continuity transitions aborting on Chromium/Safari. The View Transitions morph path assigned the shared `view-transition-name` to both the outgoing and incoming element up front; because both slides live in one DOM, the old-state capture saw two elements with the same name and the browser aborted the transition ("Unexpected duplicate view-transition-name"), silently falling back to an instant cut. The outgoing element is now named for the old-state capture and each name is handed off to the incoming element inside the update callback, so morphs animate as intended.

- Updated dependencies []:
  - @astro-slides/types@0.1.1
