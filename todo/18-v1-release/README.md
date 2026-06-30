---
title: Phase 18 — v1.0 release
status: pending
started:
ended:
---

## Goal

Cut a real 1.0. Wire up Changesets for release notes and version bumping, publish to npm under the `@astro-slides/` scope, create the GitHub release with the docs URL, the demo URL, and screenshots from the Cosmic theme. After this phase, the project is real: installable, documented, and supported.

## Exit criteria

- [ ] Changesets configured at repo root with a release workflow.
- [ ] All packages have a stable, semver-compliant version.
- [ ] All packages declare `repository`, `license`, `keywords`, `author`, `homepage`, `bugs` fields.
- [ ] `pnpm publish -r` succeeds (dry-run first, then real).
- [ ] `@astro-slides/cli` is `npm install`-able and the `astro-slides` bin works.
- [ ] GitHub release created with notes, links to docs, links to demo, screenshots.
- [ ] A "what's in 1.0" announcement post drafted (post is the user's call).
- [ ] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md added.
- [ ] CI release workflow: tags push trigger `pnpm publish -r --tag latest`.
- [ ] Provenance / npm provenance attestation enabled.

## Planned tasks

- Changesets installation + config
- Initial version bump across all packages
- Per-package metadata audit (`repository`, `license`, etc.)
- Dry-run publish + fix-ups
- `@astro-slides` npm scope claim
- Real publish
- GitHub release with assets
- Open-source meta files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- Release workflow in CI
- Announcement post draft

## Dependencies

- Every prior phase must be done and distilled.
- Phase 17 (docs) must be deployed before announcement.

## Notes

This is the only phase that does something irreversible (publishing to npm). Treat it accordingly: every package publish is a dry-run first, then real.

We have not committed to a release cadence for post-1.0 yet. Changesets supports continuous-release workflows; the team can decide later.

We do NOT need: a TSC, a steering committee, sponsorships infrastructure, or a Discord. Those come if there's a community. Start small.

## Outcome

_Fill in when the phase closes._
