---
"@astro-slides/core": minor
"@astro-slides/client": minor
---

Presenter-grade engagement reset (#71). Rehearsal results no longer leak into the real session: the presenter view's toolbar gains a two-step **Reset** button that wipes all poll votes and the Q&A queue, each `<Poll>` slide gains a per-poll **Reset** beside *Close voting*, and the gateway accepts a curl-able `POST /__astro-slides/engagement/reset {deck}` (token- and origin-gated like the persistence POST) for headless pre-flight. Connected phones and deck windows zero out live — the presenter island now opens its own WebSocket leg to the gateway, so presenter-initiated actions (reset, blackout, the join QR) reach audience phones directly instead of relying on a same-origin deck window. Reset actions are denied to audience-role connections server-side.
