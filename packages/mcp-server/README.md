# @astro-slides/mcp-server

First-class Model Context Protocol server (ADR-0009).

Tools for listing, reading, writing, navigating, and exporting decks. Shipped from
the CLI (`astro-slides mcp-server`). stdio transport locally; Streamable HTTP (via
`@hono/mcp`) for remote. Zod schemas with `.describe()`.

Status: skeleton (Phase 01). Implemented in Phase 14.
