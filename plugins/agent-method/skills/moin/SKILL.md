---
name: moin
description: >-
  Use at the start of a working session to bring up cleanly and orient: read what this project is,
  the standing rules and available procedures, the last few units of work, and — above all — the
  current state and the single clearest next step, all read fresh from the project's own living
  documents. Flag but do not run any maintenance that has come due, then ask whether to continue as
  planned. This is orientation, NOT a trigger to start work — it ends with a question, not an
  action. The counterpart to feierabend.
---

# Moin — session bring-up

Starting a session cleanly is a procedure, not something reconstructed from
memory. Improvised bring-up fails in a consistent way: something is skipped, and
the skip goes unnoticed because there was no list to skip from.

Work the steps in order. Read every source **fresh** — do not trust context
carried in from anywhere — and **report faithfully**: an open change awaiting
review, a red build or an overdue task is stated plainly.

**Guardrails (do not violate):**

- **Orient, do not start work.** This ends with a **question**, never an action.
  If the briefing surfaces a task, name it and wait. Opening a session by
  starting work chooses the session's direction on the human's behalf.
- **Read-only.** No commits, no branches, no edits to living documents.
- **The living documents are the source of truth for state** — not this file,
  not memory, not what was true last session.
- **Do not invent state you could not read.** If an artefact is missing, say it
  is missing.

## 0. Locate the artefacts

Read `method.json` at the project root if it exists. It binds four roles to
actual paths:

| Role | Answers |
|---|---|
| `operating-rules` | How is work done here? |
| `decisions` | What was decided, and why? |
| `state` | Where do we stand? |
| `method-log` | Why does the way we work look like this? |

If there is no `method.json`, fall back to the conventional names — `CLAUDE.md`
or `AGENTS.md`, `docs/adr/` or `docs/decisions/`, `docs/STATUS.md`,
`docs/method-log.md` — and say in the briefing which ones you could not find.

## 1. What this is

- The project and its goal, from the top of the operating-rules artefact. One or
  two sentences, not a wall of text.
- How long it has been running: `git log --reverse --format=%ad --date=short`,
  first line.
- Name the working directory, so it is unambiguous which project this is.

## 2. Standing rules and available procedures

- The load-bearing rules from the operating-rules artefact — the ones that shape
  *how* work happens here, not the whole file. A compact reminder.
- Which procedures are available and when to reach for each.
- Any adaptations declared in `method.json`: a rule this project deliberately
  narrowed or dropped is exactly the kind of thing a fresh session gets wrong.

## 3. Recent work

The last handful of completed units — merged changes rather than raw commits,
because the merge is the unit that passed review:

```bash
git log --merges --format="%ad %s" --date=short -6
```

Fall back to `git log --oneline -6` where there are few merges. Mention a
methodological moment from the method log only if it bears on today.

## 4. Where we stand

- **Repository state:** current branch, whether the tree is clean, and every
  change awaiting review. Fetch first, so this reflects the shared state rather
  than a stale local view.
- **Project state:** the *where we stand* section of the state artefact.
  Summarise; do not paste it.

## 5. Maintenance that has come due — flag, do not run

If the project keeps a calendar-driven maintenance list, compare each entry's
due date to today and **report** what is due. Do not run it here: running
maintenance is work, and work starts after the human says so. If nothing is due,
say so explicitly with the next date — never skip it silently.

## 6. The next step

From the state artefact, name the **single clearest next step** — not the
roadmap — plus any decision that must be settled before it can start.

## 7. Close with a question

Deliver the briefing concisely, then end by asking whether to continue as
planned or change direction. If step 5 found something due, fold it into that
question.

Then **stop and wait.** Begin nothing until the answer comes; the answer sets
the session's direction.
