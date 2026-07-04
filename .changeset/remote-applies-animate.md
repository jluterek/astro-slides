---
"@astro-slides/client": patch
---

Fix `<Morph>` and `view-transition` effects never playing on synced follower windows — the audience screen and presenter panes. Remote applies (BroadcastChannel sync) used URL mode `"replace"`, which was overloaded to also mean "skip the JS transition path", so any window driven from presenter mode silently downgraded every morph to a plain fade. URL mode and animation are now separate concerns: followers mirror the URL without history entries *and* run the slide transition; only the initial paint stays instant.
