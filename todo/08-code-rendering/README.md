---
title: Phase 08 — Code rendering
status: pending
started:
ended:
---

## Goal

Implement Shiki + Magic Move + Twoslash code support per ADR-0011. Build-time tokenization keeps the runtime small. Magic Move gives us a flagship animated diff that competes with Keynote-tier code transitions.

**Big simplification from research:** `@shikijs/magic-move` ships official React/Solid/Svelte wrappers via subpath imports (`@shikijs/magic-move/react`). We no longer need to port the engine ourselves — we consume the React wrapper directly.

## Exit criteria

- [ ] Shiki-powered syntax highlighting on every fenced code block. Default theme matches VS Code's "Dark+" and a light counterpart.
- [ ] Authors configure highlighting via `setup/shiki.ts` (custom themes, languages, transformers).
- [ ] Line highlighting via `{1,3-5}` and per-click `{1|2-3|all}` syntax. Click steps register against the Phase 06 click model.
- [ ] `<<< @/snippets/file.ts#region` external snippet imports work, with region detection across common comment syntaxes. Files are watched (chokidar) for HMR.
- [ ] `twoslash` flag on a fence enables Twoslash hover popovers with inferred TypeScript types.
- [ ] Magic Move via a fenced block with info `md magic-move` — inner code fences become animation steps. Tokenization at build time; `lz-string`-compressed step data embedded in the output.
- [ ] `<CodeBlockWrapper>` component handles line numbers, max-height, copy button.
- [ ] Tests cover: highlighting correctness, click-step line highlighting, snippet imports with regions, Magic Move step count and tokenization stability.

## Locked decisions

- **Syntax highlighter:** `shiki` v4+ (build-time tokenization via remark plugin).
- **Animated code diffs:** `@shikijs/magic-move` v1.4+ — use the **official React wrapper** (`@shikijs/magic-move/react`). No porting.
- **TS hover popovers:** `@shikijs/twoslash` + `@shikijs/vitepress-twoslash` transformer.
- **Compression for embedded step payloads:** `lz-string`.
- **Monaco:** **not** in v1 (per ADR-0011). Optional addon for later.
- **Code-snippet imports:** `<<< @/file#region {twoslash}` syntax — own remark plugin that resolves the file, extracts the region, embeds it as a virtual code block fed to Shiki.
- **Watch integration:** snippet files added to `chokidar` watch list (from Phase 03) for HMR.

## Tasks (planned)

- Shiki integration (remark plugin) with custom themes hook
- Default themes (Dark+ / Light+)
- Line-highlighting transformer (build-time, parse `{1|2-3|all}`)
- Snippet import remark plugin + region detector (common comment syntaxes)
- Twoslash integration
- Magic Move codeblock transformer (build-time tokenization, lz-string compression)
- `<ShikiMagicMove>` runtime component wrapper (thin layer over `@shikijs/magic-move/react`)
- `<CodeBlockWrapper>` component (line numbers, copy, max-height)
- Register click steps from line highlighting + Magic Move into the Phase 06 click context

## Parallel work

| Stage | Can run in parallel |
| --- | --- |
| Shiki integration | first |
| After Shiki | **default themes, line-highlighting, snippet imports, Twoslash, Magic Move transformer, code-block wrapper** — six parallel agents possible |
| After Magic Move transformer | `<ShikiMagicMove>` wrapper + integration tests |
| Click registration | parallel with wrapper |

## Dependencies

- Phase 02 (parser — fence handling integrates with the MDX pipeline)
- Phase 06 (click model — line-highlight and Magic Move register clicks)

## Risks

- **Magic Move tokenization is theme-coupled.** Changing the deck's Shiki theme invalidates Magic Move artifacts at build time. Fast rebuild mitigates; document.
- **Twoslash needs the user's `tsconfig`.** Without it, types can't be inferred. The Twoslash code blocks expect a project context — fine when authors run `astro-slides dev` in a TS project, breaks for plain MD without TS. Document the constraint.
- **External snippet imports + HMR:** chokidar watches must include `<<<` referenced files. Test that editing a snippet triggers slide HMR.

## Notes

Reference: `docs/reference-applications/slidev.md` § *Code: Shiki, Magic Move, Monaco, twoslash, line highlighting* — implementation shape is highly transferable, especially the build-time tokenization + lz-string embedding pattern.

The previous draft of this phase said "port the Vue wrapper to React" — research confirmed the engine ships React/Solid/Svelte wrappers natively. This phase is meaningfully simpler than initially scoped.

## Outcome

_Fill in when the phase closes._
