# The agent manual

This is the layer an agent works from. Everything here gets **copied into your
project** and rewritten in your words. Nothing stays a reference to this
repository, because [C3](../method/rules.md#c3) says the agent working a task
has your repository and nothing else.

## Start with one file

**[`operating-rules.md`](operating-rules.md)** is the manual. Your agent reads
it at the start of every task, and it is the answer to *"how do I stop
explaining my way of working again in every project?"*

It becomes your `CLAUDE.md` or `AGENTS.md`, and it covers:

| Section | Answers |
|---|---|
| What this is | what the project is, and what would make it a failure |
| Commands | how to build, test and check it |
| Structure | where things live, and why |
| Working conventions | the rules that exist only because of this project |
| Decisions | how a choice gets recorded here |
| Delivery | how a change reaches the trunk |
| Working with the people who decide | what gets escalated, and to whom |
| Documentation | what has to be updated alongside a change |
| Tickets | what a task must say before it starts |
| Session rituals | how a session begins and ends |
| Guardrails | what the agent must never do unasked |

Everything below is a shape that file refers to. Take what it points at, leave
the rest.

## The shapes it refers to

| Template | Becomes | Role |
|---|---|---|
| [`method.json`](method.json) | `method.json` | the declaration the check reads |
| [`decision-record.md`](decision-record.md) | `docs/adr/NNNN-slug.md` | one entry under `decisions` |
| [`decision-index.md`](decision-index.md) | `docs/adr/README.md` | the index under `decisions` |
| [`status.md`](status.md) | `docs/STATUS.md` | `state` |
| [`method-log.md`](method-log.md) | `docs/method-log.md` | `method-log` |
| [`pull-request.md`](pull-request.md) | `.github/PULL_REQUEST_TEMPLATE.md` | — |
| [`issue-templates/`](issue-templates) | `.github/ISSUE_TEMPLATE/` | — |

Starting points, not fixtures. Copy one, delete what does not apply, rewrite the
rest. A short document that tells the truth beats a complete one full of
headings nobody filled in — and if you leave a `«placeholder»` behind in a file
you declared, the check says so.

## Why the manual restates the rules

An operating-rules file that says *"follow the rules at github.com/…"* is a
fetch that can fail, be blocked or be skipped, and it costs something on every
task. So the manual spells the rules out.

That looks like it breaks [C2](../method/rules.md#c2) — one authority per fact,
and here is a second copy. It does not, for one specific reason: the copy is not
meant to stay identical. Your file is the authority for *your* project, in your
words, adapted to your circumstances. `method.json` records where you diverged,
and the coherence check tells you when the catalogue moves under you. A tracked,
declared divergence is a decision. An untracked identical copy is the thing C2
warns about.

If you would rather not maintain the relationship at all, delete `method.json`
and keep the manual. Step 1 of
[adopting](../method/README.md#adopting-it) is a legitimate stopping point.

## When the catalogue moves

These documents are the catalogue said in the second person, so a new or changed
rule can leave them a version behind — silently, because nothing here is
declared and no check reads them. S3 arrived in 0.3 and the manual went on
mentioning the state artefact without ever asking for one.

So: **a change to [`rules.md`](../method/rules.md) is read against this
directory in the same change.** Most rules need nothing here; the ones that do
are the rules an agent acts on every session.
[`CHANGELOG.md`](../method/CHANGELOG.md) is where an adopter finds out what
moved, and it says which entries reached the manual.
