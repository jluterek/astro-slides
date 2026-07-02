---
"@astro-slides/cli": patch
"@astro-slides/mcp-server": patch
---

Report the real package version in the `astro-slides` CLI banner and the MCP server handshake. Both were hardcoded to `0.0.0`; they now read from `package.json` at runtime (working in type-stripped, compiled, and bundled contexts) so the advertised version tracks the published one and can't drift again.
