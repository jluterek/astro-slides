---
title: Phase 19 build plan — audience engagement
status: in-progress
---

# Build plan (single phase PR, per repo convention)

## Design decisions (the "spike/ADR" task, resolved)

- **Client identity**: anonymous stable id, `crypto.randomUUID()` cached in
  `localStorage["as-client-id"]`. No accounts (descoped up front).
- **State model** (extends `SharedState`, same last-write-wins reducer):
  - `polls: Record<string, PollState>` — `PollState = { votes: Record<clientId, optionIndex>, closed?: boolean }`.
    Votes revisable until closed; idempotent (re-applying a vote is a no-op state-wise); dedup by client id.
  - `activePoll: { id, question, options[] } | null` — the `<Poll>` island dispatches
    `poll/open` when its slide becomes present (MDX stays the source of truth for options;
    late joiners get it via the existing `hello`/`state` snapshot).
  - `questions: QaQuestion[]` — `{ id, text, at, status: "new" | "shown" | "dismissed" }`.
    `qa/ask` is idempotent by id (double-delivery adds once); `qa/moderate` sets status.
    At most one `shown` at a time (moderating a question to `shown` demotes the previous).
  - **Reactions are transient events, NOT state** (like laser bursts): `react { emoji, id }`
    reduces to a no-op; overlays observe the action stream. Store gains an action-listener API.
- **Wire scoping**: the gateway WS route accepts `?role=audience`. For audience connections the
  relay parses each message and forwards ONLY `vote | qa/ask | react | hello` — nav/draw/etc.
  are dropped server-side (client-side scoping alone fails the exit criteria).
- **Persistence**: mirror the drawings pattern — the publisher deck window debounce-POSTs
  engagement state (`polls` + `questions`) to the gateway; gateway writes
  `.astro-slides/engagement/<deck>.json` (gitignored); the deck route embeds the seed as an
  `as-engagement-data` script the store hydrates from. Static builds embed nothing (feature
  requires `dev --remote`; documented).
- **Audience page**: `/audience` sibling of `/entry` (same template-string approach in
  `packages/core/src/server/`), mobile-first: current poll voting, question box, reaction bar.

## Task order

1. [x] Bookkeeping (ROADMAP, phase status) — done.
2. [ ] `sync/types.ts`: PollState/QaQuestion types + actions + reducer cases; unit tests.
3. [ ] `sync/store.ts`: action-listener API (for reactions overlay) + engagement seed hydration.
4. [ ] Gateway: `?role=audience` scoped relay in `gateway.ts` (+ hub tests), engagement
   persistence endpoint + load, `/audience` page in `server/audience-page.ts`.
5. [ ] `<Poll>` component (`packages/client/components/Poll.astro`) + `initPolls` runtime module
   (dispatch `poll/open` on present; render live tally bars) + CSS. Register in slide.astro AND
   print.astro COMPONENTS maps (print shows a static tally).
6. [ ] Reactions overlay runtime module (`packages/client/src/engagement/reactions.ts`) —
   floats emoji, caps concurrent sprites, no-op in embed/preview/export.
7. [ ] Q&A: presenter panel (React, in presenter island) + shown-question banner in the deck
   runtime.
8. [ ] Example deck (`examples/audience-engagement/` or extend conference-talk) + docs-site page
   + readme *Roadmap* sync (move feature from Roadmap to features).
9. [ ] Tests: reducer unit, hub role-scoping unit, e2e join flow (spec spawns `dev --remote`).
10. [ ] Changeset (minor — new feature across client/core), phase Outcome + distill + archive.

## Notes / decisions (live)

- Rate limiting reactions: client-side min-interval on the audience page (300ms) AND the
  overlay caps concurrent sprites (drop excess) — the gateway stays dumb about rates.
