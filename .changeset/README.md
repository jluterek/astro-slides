# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It records
intended version bumps and release notes for the publishable `@astro-slides/*` packages and
`create-astro-slides` (which are versioned in lockstep — see `config.json` `fixed`).

## Adding a changeset

When a change should ship in a release, run:

```bash
pnpm changeset
```

Pick the affected packages and a bump level (patch / minor / major), and write a human-readable
summary. This writes a Markdown file here that gets consumed at release time.

## Releasing

On push to `main`, the `Release` workflow (`.github/workflows/release.yml`) opens a
**Version Packages** PR that applies the pending changesets (bumping versions + updating
`CHANGELOG.md`s). Merging that PR publishes to npm — once an `NPM_TOKEN` secret is configured and
the `@astro-slides` scope is claimed. Until then the version PR still works; only the publish step
is gated.
