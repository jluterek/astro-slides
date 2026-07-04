---
"@astro-slides/client": patch
---

Fix `<Morph>` object-continuity transitions aborting on Chromium/Safari. The View Transitions morph path assigned the shared `view-transition-name` to both the outgoing and incoming element up front; because both slides live in one DOM, the old-state capture saw two elements with the same name and the browser aborted the transition ("Unexpected duplicate view-transition-name"), silently falling back to an instant cut. The outgoing element is now named for the old-state capture and each name is handed off to the incoming element inside the update callback, so morphs animate as intended.
