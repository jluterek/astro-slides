---
"create-astro-slides": patch
---

The scaffolded starter deck now demonstrates the flagship features instead of merely listing them: click-stepped reveals (`<Click>`), a `<Morph>` pair whose number travels between two slides, and a Shiki Magic Move block that refactors itself. Fixed a real build break: the generated `package.json` omitted `@astrojs/mdx`/`@astrojs/react`, so under pnpm's isolated node_modules `astro build` failed to resolve the injected React renderer — both are now explicit dependencies (matching the example projects). The theme prompt and `--theme` flag now accept all five bundled themes (cosmic, starter, and the three marp-* variants), and the template is guarded by tests that parse the generated deck with the workspace parser.
