---
title: Phase 18 — v1.0 release
status: in-progress
started: 2026-07-01
ended:
---

> **Progress (2026-07-01): GitHub-side release tooling landed; npm publishing deferred.**
> Everything that doesn't require the npm registry / an `NPM_TOKEN` is done (Changesets, publish
> metadata + dry-run validation, release + docs-deploy workflows, open-source meta files, release-
> notes draft). The remaining criteria all depend on claiming the `@astro-slides` npm scope and a
> real publish — see the unchecked boxes and the *Remaining (npm)* note below.

## Goal

Cut a real 1.0. Wire up Changesets for release notes and version bumping, publish to npm under the `@astro-slides/` scope, create the GitHub release with the docs URL, the demo URL, and screenshots from the Cosmic theme. After this phase, the project is real: installable, documented, and supported.

## Exit criteria

- [x] Changesets configured at repo root with a release workflow. (`.changeset/config.json`, `.github/workflows/release.yml`)
- [x] All packages have a stable, semver-compliant version. (all publishable packages → `0.1.0`, versioned in lockstep via the changesets `fixed` group)
- [x] All packages declare `repository`, `license`, `keywords`, `author`, `homepage`, `bugs` fields and pass `npm publish --dry-run`. (validated — tests excluded from tarballs via `files` negation)
- [ ] `pnpm publish -r` succeeds (dry-run first, then real). **Dry-run done; real publish needs the npm scope + token.**
- [ ] `@astro-slides/cli` is `npm install`-able and the `astro-slides` bin works in a fresh shell. **(post-publish)**
- [ ] `pnpm create astro-slides my-deck` works end-to-end against the published packages. **(post-publish; scaffolded projects already pin `^0.1.0`)**
- [ ] GitHub release created with notes, links to docs, links to demo, screenshots. **(coupled to publish; notes drafted — see `RELEASE-NOTES-DRAFT.md`)**
- [x] A "what's in 1.0" announcement post drafted. (`RELEASE-NOTES-DRAFT.md`)
- [x] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md added.
- [x] CI release workflow via `changesets/action` (opens a Version PR; publishes on merge once `NPM_TOKEN` is set).
- [x] npm provenance attestation enabled. (`publishConfig.provenance: true` + `NPM_CONFIG_PROVENANCE` + `id-token: write` in the workflow)

### Remaining (npm — requires the registry, out of scope for the GitHub-side pass)

- Claim the `@astro-slides` scope on npm; add an `NPM_TOKEN` repo secret (and enable GitHub Pages).
- Add a release changeset and let the workflow's Version PR bump `0.1.0` → the 1.0 line, then merge
  to publish. Verify install + `pnpm create astro-slides` against the published packages.
- Cut the GitHub release from `RELEASE-NOTES-DRAFT.md` with Cosmic screenshots + the live docs URL.

## Locked decisions

- **Versioning tool:** `@changesets/cli` + `@changesets/changelog-github`.
- **Release workflow:** `changesets/action` in GitHub Actions, opening a "Version Packages" PR that triggers publish on merge.
- **npm scope:** `@astro-slides/`. Bin name: `astro-slides`. Scaffolder: unscoped `create-astro-slides`.
- **Provenance:** npm provenance enabled via `npm publish --provenance` in the GH Actions workflow.
- **Open-source meta files:** Contributor Covenant for CoC; SECURITY.md points to private security email; CONTRIBUTING.md covers pnpm setup, branch policy, ADR/spec etiquette.
- **VS Code extension:** **not** in v1. Documented as a post-v1 target.

## Tasks

- [x] [`01-pre-release-code-review.md`](./01-pre-release-code-review.md) — full-project
  review + fixes before publish (found + fixed two release blockers and several security
  bugs; full gate green).

### Planned

- Changesets installation + initial config
- Per-package metadata audit (one task per package — parallel)
- Per-package `npm publish --dry-run` validation
- Initial version bump across all packages (`@changesets/cli`)
- `@astro-slides` npm scope claim (manual one-time action)
- Real publish via CI
- GitHub release with assets (screenshots from Cosmic theme)
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- Release workflow in CI
- Announcement post draft (handed off to user)

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Changesets config | first |
| **Per-package metadata audits + dry-runs** | parallel — 7 packages → 7 agents |
| Open-source meta files | parallel with audits |
| Real publish + GH release | sequential, final |

## Dependencies

- Every prior phase must be done and distilled.
- Phase 17 (docs) must be deployed before announcement.

## Risks

- **Irreversibility of npm publishes.** Every package publish is dry-run first, then real. Never `--force`.
- **npm 2FA hiccups:** plan for auth flows in CI vs local publish.
- **Scope squatting:** claim `@astro-slides` on npm well before publish day.
- **License attributions:** confirm all our deps' licenses are MIT/Apache-2.0/BSD-compatible; generate `THIRD-PARTY.md`.

## Notes

This is the only phase that does something irreversible (publishing to npm). Treat it accordingly: every package publish is a dry-run first, then real.

We have not committed to a release cadence for post-1.0 yet. Changesets supports continuous-release workflows; the team can decide later.

We do NOT need: a TSC, a steering committee, sponsorship infrastructure, or a Discord. Those come if there's a community. Start small.

## Outcome

_Fill in when the phase closes._
