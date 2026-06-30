# Ways of working

This file is the process doc. Read it once. It describes how we plan, execute, and document work on Slides — without a ticket tracker.

## Principles

1. **Markdown files are the source of truth.** No Jira, Linear, GitHub Issues, or external tracker. Everything lives in this repo.
2. **The active surface stays small.** Only in-flight work sits in `todo/`. Done work moves out. The cost of "what should I work on next?" is one `ls`.
3. **Completed work becomes documentation.** A phase that finishes produces a single distilled summary in `docs/built/`. The detailed history is archived but rarely re-read.
4. **Decisions are separated from tasks.** Cross-cutting "we chose X because Y" notes go into `docs/decisions/` as ADRs, not buried inside task files.

## Folder layout

```
todo/
├── README.md                 # this file
├── ROADMAP.md                # phase index (always up to date)
├── templates/                # copy from here when starting new work
│   ├── phase-readme.md
│   └── task.md
├── archive/                  # phases that have completed and been distilled
│   └── NN-phase-name/
└── NN-phase-name/            # active phases live at this level
    ├── README.md             # phase overview, exit criteria, task list
    └── NN-task-name.md       # one file per task

docs/
├── built/                    # one summary file per completed phase
│   └── NN-phase-name.md
├── decisions/                # ADRs — one per cross-cutting decision
│   └── NNNN-decision-title.md
├── reference-applications/   # prior-art research (already exists)
└── ...                       # architecture, parser internals, etc., grow over time
```

Numbering uses two-digit prefixes (`01-parser/`, `02-runtime/`) so `ls` sorts naturally. ADRs use four digits (`0001-…`) because there will be more of them.

## The three states of work

Every piece of work moves through three locations. Where the file lives *is* its state.

| State | Location | Read when? |
| --- | --- | --- |
| **Active** | `todo/NN-phase/` | Working on the phase or picking the next task |
| **Archived** | `todo/archive/NN-phase/` | Rarely — only when investigating history of a specific decision |
| **Distilled** | `docs/built/NN-phase.md` | Whenever the phase's outcomes are relevant to current work |

This is the "don't keep reading the same files" mechanism. When a phase is distilled, the archive is there for forensics but the distilled doc is what you load into context.

## Lifecycle

### Starting a phase

1. Pick the next number (look at `ROADMAP.md`).
2. Create `todo/NN-phase-name/` and copy `templates/phase-readme.md` to `todo/NN-phase-name/README.md`. Fill it in.
3. Create task files (`NN-task-name.md`) from `templates/task.md`. List them in the phase README's *Tasks* section.
4. Update `ROADMAP.md`: add the phase, status `active`.

### Working a task

1. Set the task's frontmatter `status: in-progress` and add `started: YYYY-MM-DD`.
2. Fill in *Notes / decisions* as you work. Future-you will thank present-you.
3. When done, set `status: done`, fill in *Outcome*, list any files created or modified, link any follow-up tasks.
4. Check the task's box in the phase README.

### Completing a phase

When every task in a phase is `done` and the exit criteria are met:

1. Fill in the phase README's *Outcome* section: what shipped, key decisions, links to relevant ADRs.
2. Create `docs/built/NN-phase-name.md`. This is the **distilled** summary — what we built, why, how to navigate the resulting code, what surprised us, what's still loose. Aim for one screen of content. It's what future contributors and future-Claude will read.
3. Move the entire phase folder: `mv todo/NN-phase-name todo/archive/`.
4. Update `ROADMAP.md`: phase status `done`, link to the distilled doc.

If a decision made during the phase has implications beyond the phase, also create an ADR (see below).

### Writing an ADR

Any decision that future work will need to honor lives in `docs/decisions/` as an Architecture Decision Record. Examples: "we use Astro content collections, not a custom file loader", "PPTX exports use PptxGenJS, not headless screenshot", "themes are folders, not packages".

ADR file naming: `docs/decisions/NNNN-short-title.md`, four-digit zero-padded, never renumbered. A minimal ADR has *Context*, *Decision*, *Consequences*. Use [Michael Nygard's format](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md) if in doubt.

## Status conventions

Task frontmatter `status:` values:

- `pending` — not started
- `in-progress` — being worked on right now
- `blocked` — waiting on something; include `blocked-by:` with explanation
- `done` — finished, outcome filled in
- `cancelled` — abandoned, with a note explaining why

Phases use the same set minus `cancelled` (we don't cancel phases — we redefine and renumber).

## File naming

- **Phase folder:** `NN-kebab-case-name/` (e.g., `01-parser/`, `02-runtime/`).
- **Task file:** `NN-kebab-case-name.md` within the phase folder. Task numbers are local to the phase.
- **ADR:** `NNNN-kebab-case-title.md` in `docs/decisions/`. Globally numbered.
- **Distilled doc:** matches the phase folder name (`docs/built/NN-phase-name.md`).

## What goes where, in two sentences

If it's an **action that needs doing**, it's a task in an active phase folder. If it's a **fact or decision** that will outlive the task, it belongs in `docs/decisions/` (a decision) or `docs/` (architecture, internals, references).

## When to split a task vs. add notes

A task should be one focused unit of work — usually less than a day of focused effort. If you find yourself writing more than ~5 *Notes* bullets or your *Acceptance criteria* has more than ~6 items, split into multiple tasks.

A task can also be a *spike* — exploratory work with no clear deliverable beyond "a recommendation". Mark it explicitly in the title (`spike: …`) and let *Acceptance criteria* be "decision recorded in `docs/decisions/NNNN-…`".

## How Claude works with this

When you (Claude) are asked to work on Slides:

1. Read `todo/README.md` (this file) and `todo/ROADMAP.md`.
2. Find the active phase. Read `todo/NN-phase/README.md`.
3. Pick the next pending task or work on what the user specifies. Read only that task's file.
4. **Do not read `todo/archive/` unless explicitly asked or unless investigating history of a specific feature.**
5. Read `docs/built/` distilled summaries for any phase whose outcomes inform the current task.
6. Read relevant ADRs in `docs/decisions/` when making choices that touch their subject matter.
7. As you work, update the task file's *Notes / decisions* in real time, not retroactively.
8. When a task finishes, do the bookkeeping: status, outcome, files touched, phase README checkbox.

This is the rhythm. Keep the active surface small. Keep the distilled docs honest. Trust the archive to hold history without re-reading it.
