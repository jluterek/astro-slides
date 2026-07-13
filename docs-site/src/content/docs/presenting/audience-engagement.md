---
title: Audience engagement
description: Live polls, moderated Q&A, and emoji reactions — the audience joins by QR.
---

Ask the room and see the answers land on your slide. astro-slides bundles the audience
layer most deck tools outsource to Slido or Mentimeter: **polls** voted from phones,
**moderated Q&A**, and **emoji reactions** — all riding the same sync gateway as the
phone remote.

:::note
Like the phone remote, this is a **live-presentation** feature: it works when you
present via `astro-slides dev --remote` (which runs the sync gateway on your LAN).
Static exports render polls with zero counts and no reaction/Q&A chrome.
:::

## The audience joins by QR

Run your deck with the gateway and the terminal prints **two** QR codes — the
presenter remote and the audience page:

```bash
astro-slides dev --remote            # open on the LAN
astro-slides dev --remote=hunter2    # token-protected URLs
```

Spectators scan the **Audience** code onto `/audience`: a mobile page with the active
poll, a question box, and a reaction bar. Audience connections are scoped
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
