---
"@astro-slides/client": minor
"@astro-slides/core": minor
"@astro-slides/cli": minor
---

Audience engagement (Phase 19): live polls, moderated Q&A, and emoji reactions. Declare a `<Poll id question options>` in MDX and the results tally live on the slide as the audience votes from their phones — one revisable vote per device, closable by the presenter, persisted across refreshes like drawings. Spectators join via the new `/audience` page (printed as a QR beside the remote QR under `dev --remote`), scoped server-side to vote/ask/react — audience connections can never navigate or draw. Questions land in a presenter-view moderation panel (show/dismiss; a shown question banners on the deck), and reactions float over the slides with a sprite cap. Also fixes a latent Phase 11 bug: the gateway's WebSocket handler corrupted Vite's HMR socket, reload-looping every page under `dev --remote`.
