---
"@astro-slides/core": minor
"@astro-slides/client": minor
"@astro-slides/cli": minor
---

Audience engagement for deployed static decks (#62). New `astro-slides gateway` command runs the sync gateway standalone anywhere Node runs — deck builds point at it via `ASTRO_SLIDES_GATEWAY=wss://<host>`, so polls, Q&A, reactions, and the phone remote work over the internet, not just `dev --remote` on a LAN. The gateway gains an `--allow-origin` allowlist (cross-origin WebSocket upgrades and engagement-persistence POSTs are origin-checked, with proper CORS on the POST), `--password` presenter tokens, and persistence under a configurable root; core exports it via the new `@astro-slides/core/gateway` subpath. The client accepts absolute `ws(s)://`/`http(s)://` gateway URLs and posts engagement state to the gateway's origin.
