---
phase: NN-phase-name
status: distilled
distilled: YYYY-MM-DD
---

# Phase NN — <name>

One screen. This file is what future contributors and future-Claude read when they need to know what this phase delivered. The archived task files at `todo/archive/NN-phase-name/` are forensics; this is the working document.

## What shipped

A short paragraph (or bullets) inventorying code, components, packages, files. Not a changelog — a tour.

## Why

The motivation that drove the phase. Often a one-liner pointing at the phase's *Goal* in its archived README.

## How to navigate the result

The entry points and key files. Example:

- `packages/parser/src/index.ts` — public API
- `packages/parser/src/splitter.ts` — `---` aware of fences/comments
- `packages/parser/src/frontmatter.ts` — YAML + block-frontmatter

If the phase added something to `docs/architecture/`, link it.

## Key decisions

ADRs created or referenced during the phase. Decisions that *didn't* warrant an ADR but are still load-bearing — call them out in a sentence each.

## What surprised us

Things we didn't expect — API quirks, gotchas, dead-ends we explored. This section is the most important part of the file. Future-self will be grateful.

## Loose ends

Things deferred to a later phase. Link to the receiving phase if known.

## Stats

Optional but useful: lines added, packages touched, tests passing. The kind of thing a quick reader scans before diving deeper.

---

**Workflow:** This file is created at the end of a phase, immediately before the phase folder moves to `todo/archive/`. See `todo/README.md` § *Completing a phase*.
