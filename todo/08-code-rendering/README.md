---
title: Phase 08 — Code rendering
status: pending
started:
ended:
---

## Goal

Implement Shiki + Magic Move + Twoslash code support per ADR-0011. Build-time tokenization keeps the runtime small. Magic Move gives us a flagship animated diff that competes with Keynote-tier code transitions.

## Exit criteria

- [ ] Shiki-powered syntax highlighting on every fenced code block. Default theme matches VS Code's "dark plus" and a light counterpart.
- [ ] Authors configure highlighting via `setup/shiki.ts` (custom themes, languages, transformers).
- [ ] Line highlighting via `{1,3-5}` and per-click `{1|2-3|all}` syntax. Click steps register against the Phase 06 click model.
- [ ] `<<< @/snippets/file.ts#region` external snippet imports work, with region detection across common comment syntaxes. Files are watched for HMR.
- [ ] `twoslash` flag on a fence enables Twoslash hover popovers with inferred TypeScript types.
- [ ] Magic Move via a fenced block with info `md magic-move` — inner code fences become animation steps. Tokenization at build time; lz-compressed step data embedded in the output.
- [ ] `<CodeBlockWrapper>` component handles line numbers, max-height, copy button.
- [ ] Tests cover: highlighting correctness, click-step line highlighting, snippet imports with regions, Magic Move step count and tokenization stability.

## Planned tasks

- Shiki integration (markdown-it transformer or remark plugin equivalent)
- Default themes + custom-theme setup hook
- Line-highlighting transformer (build-time, parse `{1|2-3|all}` syntax)
- Snippet import remark plugin + region detector
- Twoslash integration (`@shikijs/twoslash`)
- Magic Move codeblock transformer (build-time tokenization, lz-compress)
- `<ShikiMagicMove>` runtime component (port the headless engine to React/Astro)
- `<CodeBlockWrapper>` component (line numbers, copy, max-height)

## Dependencies

- Phase 02 (parser — fence handling integrates with the MDX pipeline)
- Phase 06 (click model — line-highlight and Magic Move register clicks)

## Notes

We adapt `@shikijs/magic-move`'s Vue wrapper to React/Astro. The headless engine is framework-agnostic; only the rendering layer needs reimplementation.

Reference: `docs/reference-applications/slidev.md` § *Code: Shiki, Magic Move, Monaco, twoslash, line highlighting* — this section has the implementation shape.

Monaco is **not** part of this phase (or v1). See ADR-0011. Add as an optional addon later if demand exists.

## Outcome

_Fill in when the phase closes._
