---
title: Audience engagement
description: Live polls, moderated Q&A, and emoji reactions — the audience joins by QR.
---

Ask the room and see the answers land on your slide. astro-slides bundles the audience
layer most deck tools outsource to Slido or Mentimeter: **polls** voted from phones,
**moderated Q&A**, and **emoji reactions** — all riding the same sync gateway as the
phone remote.

:::note
Like the phone remote, this is a **live** feature — it needs a sync gateway running.
`astro-slides dev --remote` runs one on your LAN; a **deployed static deck** gets the
same features by pointing its build at a [hosted gateway](#deployed-decks-the-hosted-gateway).
Without a gateway, static exports render polls with zero counts and no reaction/Q&A chrome.
:::

## The audience joins by QR

Run your deck with the gateway and the terminal prints **two** QR codes — the
presenter remote and the audience page:

```bash
astro-slides dev --remote            # open on the LAN
astro-slides dev --remote=hunter2    # token-protected URLs
```

Spectators scan the **Audience** code onto `/audience`: a mobile page with the active
poll, a question box, and a reaction bar.

On stage you don't want to show your terminal — press <kbd>A</kbd> **in the deck**
(or hit the **QR** button in presenter view) for a full-screen join overlay: a large
QR plus the plain URL, on the deck's theme background. Press <kbd>A</kbd>, <kbd>Esc</kbd>,
or click to dismiss. The overlay knows the address phones can actually reach — under
`dev --remote` it swaps a `localhost` origin for your LAN IP; decks built against a
[hosted gateway](#deployed-decks-the-hosted-gateway) use the gateway's own host.

:::caution[Conference Wi-Fi]
`dev --remote` engagement is same-network by design — venue Wi-Fi with AP isolation
will block phones from reaching the gateway on your laptop. Bring a travel router or
phone hotspot, or use a [hosted gateway](#deployed-decks-the-hosted-gateway) so
phones join over the internet.
::: Audience connections are scoped
**server-side** — the gateway only relays `vote`, `qa/ask`, and `react` from them, so
a modified page still can't navigate your deck or draw on it.

## Polls

Declare a poll in MDX; options live in your source, votes live in the room:

```mdx
<Poll
  id="warmup"
  question="How are you presenting today?"
  options={["Keynote/PowerPoint", "A web framework", "PDF and prayers"]}
/>
```

- When the poll's slide is **present**, it opens for the audience automatically; their
  phones show the question and options.
- Votes tally **live** as bars on the slide. One vote per device (anonymous stable
  client id), revisable until you press **Close voting** on the slide.
- Results **persist** across refreshes — like drawings, they save under
  `.astro-slides/engagement/` while the gateway runs.
- Give each poll a stable `id`; votes are keyed by it.

## Q&A

The audience types questions on their phones; they appear in your **presenter view**
(`P`) in a moderation panel:

- **Show** puts the question on the audience-facing deck window as a banner (at most
  one at a time — showing another demotes the first).
- **Hide** returns it to the queue; **Dismiss** removes it.

## Reactions

Six emoji on the audience page float up the deck when tapped. Rate-limited on the
phone and sprite-capped on the deck, so an enthusiastic room stays legible. Inert in
embeds, previews, and print.

## Deployed decks: the hosted gateway

`dev --remote` only reaches phones on the **same network**. To run engagement against
a deck deployed as a static site (GitHub Pages, Netlify, …), host the gateway
anywhere Node runs and point the deck's build at it:

```bash
# 1. On your server (any Node ≥22 host — a $5 VM, Fly.io, Railway…):
npx astro-slides gateway ./state \
  --port 8787 \
  --allow-origin "https://you.github.io" \
  --password hunter2          # optional: protects presenter-grade access

# 2. Build the deck against it:
ASTRO_SLIDES_GATEWAY=wss://gateway.example.com astro-slides build .
```

- The built deck opens a WebSocket to the gateway on load; the audience page lives on
  the gateway itself at `/audience?deck=<name>` (the command prints the URL + QR).
- `--allow-origin` is required for a deployed site: cross-origin browsers send an
  `Origin` header and the gateway refuses any that aren't allowlisted (WebSocket and
  the engagement-persistence POST both check it; the POST also gets proper CORS
  headers). Comma-separate multiple origins; `*` allows all.
- Poll/Q&A state persists under the directory you pass (`./state` above), exactly like
  the dev gateway's `.astro-slides/engagement/`.
- Use `wss://` (behind TLS — put the gateway behind a reverse proxy or a platform
  that terminates TLS); an `https://` page cannot open a `ws://` socket.
- `--password` derives the same token scheme as `dev --remote=<password>`: presenter
  URLs need it, the audience page can be left open.

## Example

[`examples/audience-engagement`](https://github.com/jluterek/astro-slides/tree/main/examples/audience-engagement)
is a runnable four-slide deck exercising all three features:

```bash
astro-slides dev examples/audience-engagement --remote
```

## Source

- `packages/client/components/Poll.astro` — the `<Poll>` component
- `packages/client/src/engagement/` — tallies, reactions overlay, Q&A banner, persistence
- `packages/client/src/sync/types.ts` — poll/question state + actions in `SharedState`
- `packages/core/src/server/audience-page.ts` — the `/audience` mobile page
- `packages/core/src/server/engagement.ts` — audience-role scoping + persistence
- `docs/built/19-audience-engagement.md` — the phase write-up
