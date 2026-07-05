---
title: Phase 19 — Audience engagement
status: in-progress
started: 2026-07-05
ended:
---

## Goal

Live audience participation as a first-class deck feature: polls voted from phones, moderated
Q&A, and emoji reactions — results rendering live on the slide being presented. This is the
feature no competing deck framework bundles (presenters pay for Slido or Mentimeter alongside
their deck tool), and we get it cheaply because the hard infrastructure already exists: the
Phase 11 sync gateway (`SyncHub` + Hono/WebSocket) already relays idempotent actions to every
connected client, and the `/entry` route + QR flow already lets a phone join a presentation.
Audience engagement is structurally the same wire with more participants and new payloads.

## Exit criteria

- [ ] A `<Poll>` component: options declared in MDX, audience votes from their phones, results
      render live on the slide (bar tally at minimum) and update as votes arrive.
- [ ] An audience join flow: QR code / short URL onto a mobile-friendly page (extend `/entry`
      or a sibling `/audience` route) scoped to what the audience may do — vote, ask, react.
      No navigation or drawing control.
- [ ] Vote integrity: one vote per client per poll (client-id dedup, revisable until closed),
      idempotent actions safe under the gateway's double-delivery (BroadcastChannel + WS).
- [ ] Q&A: audience submits questions; presenter view lists them with moderation (show/dismiss);
      a chosen question can be displayed on the audience-facing window.
- [ ] Reactions: transient emoji from audience phones overlay the deck; rate-limited; no-op in
      exports/embed.
- [ ] Results survive a refresh (persist to `.astro-slides/` like drawings do) and are excluded
      from static builds — the feature requires `dev --remote`, and that constraint is documented.
- [ ] Docs page + an example deck exercising all three features; CI covers reducer/state logic
      with unit tests and the join flow with an e2e test.

## Tasks (planned — files created when the phase starts)

- Spike/ADR: audience state model — anonymous client identity, poll/Q&A/reaction action shapes
  in `SharedState`, scaling posture of `SyncHub` fan-out for room-sized audiences (~100s).
- Gateway extensions: audience role (restricted action set), vote dedup, persistence.
- `<Poll>` component + live results rendering. Decide here whether a small chart primitive is
  warranted — it would also unblock the descoped PPTX editable-chart mapping (Phase 13).
- Audience mobile page (join, vote, ask, react).
- Q&A moderation panel in the presenter view.
- Reactions overlay.
- Example deck + docs-site page.

## Dependencies

- Phase 18 (v1.0 release) — this is the first post-1.0 phase.
- Phase 11 sync gateway (`packages/core/src/server/`) and Phase 10 `SharedState` reducer —
  read `docs/built/11-drawing-and-recording.md` and `docs/built/10-presenter-mode.md` first.

## Notes

- The readme's *Interactivity and live content* section and *Roadmap* section reference this
  phase — keep them in sync when scope changes.
- Same honesty rule as the phone remote: this works when presenting via `dev --remote` (a live
  gateway), not from a static export. Document it wherever the feature is advertised.
- Reactions and votes must be idempotent actions (the transport can double-deliver) but are
  *not* echo-suppressed state — see the `draw`/`laser` precedent in ADR-0010 territory.
- Descoped up front: accounts/auth for audience members (anonymous client ids only), moderation
  beyond show/dismiss, cross-network tunneling (same-LAN constraint inherited from Phase 11).

## Outcome

_Fill in when the phase closes._

- **What shipped:**
- **Key decisions:**
- **Follow-ups:**
- **Distilled doc:** `docs/built/19-audience-engagement.md`
