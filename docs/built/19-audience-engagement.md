---
phase: 19-audience-engagement
status: distilled
distilled: 2026-07-13
---

# Phase 19 — Audience engagement

Live polls, moderated Q&A, and emoji reactions — the layer presenters otherwise rent
from Slido/Mentimeter — riding the Phase 11 sync gateway with new payloads and more
participants. Works under `dev --remote`; static builds render polls inert.
Archived task notes: `todo/archive/19-audience-engagement/`.

## What shipped

**State model** — `packages/client/src/sync/types.ts`
- `SharedState` grew `polls` (`pollId → { votes: clientId → optionIndex, closed? }`),
  `activePoll`, and `questions` (`qa/ask` idempotent by client-generated id; at most one
  `shown` at a time). All actions are idempotent — the transport double-delivers by design.
- **Reactions are transient events, not state**: `react` reduces to a no-op; observers
  use the store's new `onAction()` listener API. Snapshot merges backfill the new fields
  so pre-Phase-19 peers can't punch holes in state.
- Poll **options stay in MDX**: the `<Poll>` island publishes `poll/open {id, question,
  options}` when its slide becomes present, so audience phones never need the deck bundle
  and late joiners get the poll via the existing `hello`/`state` handshake.

**Gateway** — `packages/core/src/server/`
- `/audience` page (template-string HTML like `/entry`): active-poll voting, a question
  box, a reaction bar; anonymous stable identity via `localStorage["as-client-id"]`.
- **Server-side role scoping**: WS connections with `?role=audience` pass only
  `vote | qa/ask | react | hello` — a modified page cannot navigate or draw. This is the
  one place the otherwise payload-agnostic relay inspects a message.
- Persistence mirrors drawings: the publisher window debounce-POSTs
  `{polls, questions}` → `.astro-slides/engagement/<deck>.json` → embedded as an
  `as-engagement-data` seed the runtime hydrates, so results survive refreshes.
- `dev --remote` prints an **Audience QR** beside the remote QR; `dev` gained `--port`.

**Deck + presenter UI** — `packages/client/`
- `<Poll>` renders live tally bars (token-driven CSS) + a Close-voting button;
  `initEngagement` (vanilla runtime module, drawing/laser style) must boot **after**
  `controller.start()` — it reads `present` classes to publish the active poll.
- Reactions overlay floats emoji with a sprite cap (drop, don't queue); Q&A banner shows
  the moderated question; presenter view gained a Q&A panel (Show / Hide / Dismiss).
- Registered in BOTH route COMPONENTS maps (slide + print); embeds/previews stay inert.

## What surprised us

- **The gateway had been corrupting Vite's HMR socket since Phase 11.** @hono/node-ws's
  `injectWebSocket` attaches a blanket `upgrade` listener; it mangled Vite's HMR
  websocket ("Invalid frame header"), the HMR client lost its connection, and **every
  page reload-looped under `dev --remote`** — which also masked the deck's gateway join
  during this phase's bring-up. Fixed with a shim EventEmitter forwarding only
  `SYNC_PATH` upgrades. If sync features misbehave in dev, check this seam first.
- Two servers can silently share one port via SO_REUSEPORT (the export lesson, again) —
  the e2e spec runs its `dev --remote` on an explicit `--port` for this reason.

## Verification

- 20 unit tests (reducer semantics: idempotent votes/asks, one-shown moderation,
  role allowlist, persistence round-trip, page escaping).
- e2e `audience.spec.ts`: real `dev --remote`, deck + phone contexts — join, vote,
  live tally on the slide, and a forged audience `goto` verified dropped server-side.

## What's still loose

- Descoped by design: audience accounts/auth, moderation beyond show/dismiss,
  cross-network tunneling (same-LAN constraint inherited from Phase 11).
- A chart primitive for poll results (bars only today) — would also unblock the
  descoped PPTX editable-chart mapping from Phase 13.
- Reactions/poll activity in the presenter view (presenter sees questions but not the
  reaction stream).
