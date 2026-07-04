---
phase: 18-v1-release
status: distilled
distilled: 2026-07-04
---

# Phase 18 — First public release (0.1.0)

The phase that made the project real: Changesets release automation, npm publishing under the
`@astro-slides` scope, open-source meta files, and the v0.1.0 GitHub release. Shipped **0.1.0,
not 1.0.0** — the framework is feature-complete, but a `0.x` line lets real-world install/use
surface issues before the 1.0 stability promise. Cutting `1.0.0` is a later, deliberate call.
Archived task notes: `todo/archive/18-v1-release/`.

## What shipped

**Release automation** — `.changeset/config.json`, `.github/workflows/release.yml`
- Changesets with `@changesets/changelog-github`; all 7 publishable packages
  (`@astro-slides/{types,parser,core,client,cli,mcp-server}` + `create-astro-slides`) version in
  lockstep via one `fixed` group. `access: public`.
- Release flow: merge a changeset to main → the workflow opens/updates a **"chore: version
  packages" PR** → merging that PR publishes to npm and tags GitHub releases. The publish step
  builds first (`pnpm build` — the mcp-server ships a bundled dist).
- **npm auth is OIDC/Trusted Publishing**, not a token: changesets keys token auth on an env var
  literally named `NPM_TOKEN`; the workflow sets only `NODE_AUTH_TOKEN`, so it falls through to
  OIDC — which works and gives SLSA provenance attestation for free.

**The publish itself**
- All 7 packages live at 0.1.0 (2026-07-02), then 0.1.1. Verified clean-room:
  `npm install @astro-slides/cli` runs the bin; `npm create astro-slides` scaffolds → installs
  published deps → builds 14 pages.
- Publish metadata audited per package (`repository`/`license`/`keywords`/`homepage`/`bugs`,
  `files` negation excludes tests); every package validated with `npm publish --dry-run` first.
- **Published bins can't rely on Node type-stripping** — Node refuses to strip types under
  `node_modules`, so bins load compiled `dist/` with a TS-source fallback (pre-release review,
  PR #21, fixed this as a release blocker).

**Open-source meta** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `THIRD-PARTY.md`
- THIRD-PARTY.md covers 705 prod deps; no pure copyleft in the shipped tree (LGPL only in
  `@img/sharp-libvips`, a build-time native binary).

## What surprised us

- **Scoped packages look unpublished until the org exists.** The `@astro-slides/*` packages
  published fine via OIDC but 404'd on the registry until the `astro-slides` npm org was created
  to claim the namespace. Create the org *before* the first publish.
- **GitHub Actions couldn't open the Version PR.** The repo setting *"Allow GitHub Actions to
  create and approve pull requests"* is off by default; the changesets action pushed its branch
  but failed to open the PR until the setting was enabled (fixed 2026-07-04). The full
  merge → Version PR → publish loop has since run end-to-end (0.1.1).
- **The version banner drifted immediately.** CLI + MCP server hardcoded `0.0.0`; both now read
  `package.json` at runtime (shipped in 0.1.1).

## What's still loose

- `1.0.0` itself — a future phase when the 0.x line has proven out.
- Release cadence is uncommitted; changesets supports continuous release when wanted.
- Announcement post: `todo/archive/18-v1-release/RELEASE-NOTES-DRAFT.md` was adapted for the
  0.1.0 framing and is in the user's hands.
