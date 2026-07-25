---
"@astro-slides/core": minor
"@astro-slides/client": minor
---

In-deck audience-join QR overlay (#60). Press `A` in a live deck (or the new **QR** button in presenter view) for a full-screen overlay — big QR + plain URL on the theme background — so a room of phones can join polls/Q&A/reactions without ever seeing your terminal. The overlay encodes the address phones can actually reach: under `dev --remote` a `localhost` origin is swapped for your LAN IP (advertised via runtime config), and decks built against a hosted gateway (#62) use the gateway's own host. Rides shared sync state, so the presenter view raises it on the deck window the room is watching; `A`/`Esc`/click dismiss it everywhere at once. Also fixes the presenter route 500ing in dev (`@astro-slides/client` is now `ssr.noExternal` — Vite dev-SSR was handing its raw-TS workspace entrypoints to Node, which cannot resolve `.js` specifiers to `.ts` sources).
