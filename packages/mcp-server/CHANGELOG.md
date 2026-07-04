# @astro-slides/mcp-server

## 0.1.1

### Patch Changes

- [#24](https://github.com/jluterek/astro-slides/pull/24) [`6f0fbd1`](https://github.com/jluterek/astro-slides/commit/6f0fbd1425c6cdf077c1a36e60a7545f0d7f8340) Thanks [@jluterek](https://github.com/jluterek)! - Report the real package version in the `astro-slides` CLI banner and the MCP server handshake. Both were hardcoded to `0.0.0`; they now read from `package.json` at runtime (working in type-stripped, compiled, and bundled contexts) so the advertised version tracks the published one and can't drift again.

- Updated dependencies []:
  - @astro-slides/types@0.1.1
  - @astro-slides/parser@0.1.1
