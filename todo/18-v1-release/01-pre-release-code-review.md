---
title: Pre-release full-project code review
phase: 18-v1-release
status: done
created: 2026-07-02
started: 2026-07-02
---

## Goal

Sweep the whole monorepo for correctness bugs, convention violations, and release-readiness
gaps before the 1.0 publish — the last cheap moment to fix anything, since post-publish fixes
cost a release. Fix what the review finds.

## Acceptance criteria

- [x] Every package reviewed (parser, types, core, client, cli, mcp-server, create-astro-slides)
      plus docs-site/examples/skill bundle and the cross-cutting seams (conventions, deps matrix,
      publish metadata, workflows).
- [x] Confirmed findings fixed, or explicitly recorded here as accepted for 1.0 with a reason.
- [x] Full gate green after fixes: build, typecheck, lint, unit tests, Playwright e2e.

## Notes / decisions

- Baseline before review: everything green (tsc -b, biome 225 files, 311 unit tests, 37 e2e).
- Review executed as parallel per-package subagent sweeps + a cross-cutting release audit;
  findings verified by hand before fixing.

## Outcome

- **What shipped:** A 7-agent parallel review (one per package + a cross-cutting release
  audit), each finding hand-verified, then fixed. Full gate green after: `tsc -b`, Biome
  (226 files), 330 unit tests, 37 Playwright e2e.

- **Release blockers fixed (would have broken every published install):**
  - Both bins (`astro-slides`, `create-astro-slides`) imported `../src/main.ts`; Node
    refuses type-stripping under `node_modules`, so `pnpm create` / `pnpm dev` crashed on
    any registry install. Bins now import compiled `dist/` with a TS-source fallback for
    the workspace; publishable packages ship `dist/` (parser/types/cli/create standalone
    surfaces point `exports` at it), root `build` runs `tsc -b`, all 7 get `engines.node`.
    Verified by packing both tarballs and running the bins from a real `node_modules`.

- **Security fixes:**
  - Parser `src:`/`<<<` imports could escape the project root (`@/../../etc/passwd`) —
    now contained, throws on escape (+ Windows-separator handling in `dirname`).
  - MCP `output` tool arg could write anywhere (absolute or `../`); `--read-only` still
    exposed export tools that write files. Both closed; `resolveOut` contains to root,
    read-only now drops write **and** media tools.
  - MCP HTTP: added Host/Origin validation (DNS-rebinding) for tokenless loopback servers,
    constant-time token compare, per-process write queue (HTTP built one per request → lost
    updates).
  - `slide.astro` embedded notes/drawings JSON without escaping `<` → `</script>` breakout
    (stored XSS via the unauthenticated drawings POST). Now escaped; drawing deck-name
    sanitizer rejects `.`/`..`.

- **Correctness fixes:** multi-slot `totalClicks` summed instead of max (dead keypresses);
  `.astro-slides` rm-rf wiped persisted drawings on every dev restart; stale gateway deck
  totals; KaTeX set-builder `{x|x>0}` misparsed as click spec; empty `<Clicks>` dead step;
  parser splitter fence-in-comment + BOM + yaml-code-sample-as-frontmatter; Marp `![bg-…]`
  false match + dropped split backgrounds + prose-note eaten as directives; slide title
  picked from `#` inside code fences; write-engine CRLF + fence-`---` corruption; PPTX
  oklch/transparent color loss (Cosmic exported black-on-black) + cross-slide code-block
  screenshot index; per-slide PDF filter misalignment; multi-deck `--output` overwrite;
  dev `r`-restart crash + orphaned MCP child; recorder stream leak on partial-capture
  failure; nav history spam at deck ends; presenter/embed BASE_URL + embed publish guard;
  WS backlog unbounded/uncoalesced; scaffolder YAML-unsafe title + `--yes` interactivity +
  clobber; missing React peer dep.

- **Hygiene:** removed dead `themes/*` workspace glob; added the `unified`-pipeline row to
  the dependency matrix; fixed skill/CLAUDE.md Marp drift; docs `--read-only` wording.

- **Regression tests added:** parser (`review-regressions.test.ts`), mcp-server (transport
  Host/Origin/token + read-only + output-containment + CRLF/fence write-engine).

- **Follow-ups:** none blocking. `parser`/`types` are now genuinely Node-importable as
  standalone libs; if that's not a supported use, drop the `dist` exports and note it.
- **Files touched:** see the PR diff (fix/pre-release-review-fixes).
