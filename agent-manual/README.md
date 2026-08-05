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

## Why the pull-request shape is fixed

[`pull-request.md`](pull-request.md) is the one shape here that is not simply
yours to reshape, and this section is where that was settled. It is written here
rather than in a decision record of its own because this repository keeps none —
the reasoning still has to be somewhere a future session reads, and this is the
document that owns the shapes.

The occasion: several projects deliver through pull requests written by agents,
carrying two generations of this template between them, and the repository the
templates were copied *from* carried none at all — so its own descriptions
followed no shape. Left alone that produces invented headings, a second
numbering scheme, and sections no template defines.

**The core set is What · Why · Verified · Open questions · Follow-ups, and a
project may add exactly one section of its own.** A fixed set is what makes two
projects' descriptions readable by the same person; the single slot is what
stops a project fighting the handbook over the one thing its reviewers there
genuinely need. Two slots and it stops being a set.

Two headings from the older generation are folded in rather than dropped:

- *Which issue / ADR it follows* → **Why**, which already asks which decision or
  ticket a change follows, and for the link. A heading of its own made two
  authorities for one fact, which is what [C2](../method/rules.md#c2) is about.
- *Merge-order caveats* → **Follow-ups**, which already covers what a change
  deliberately leaves undone and where that is recorded. The heading stood empty
  on almost every change, and an empty heading reads as "considered and found
  empty".

### An answered question is a comment, never an edit

When a decider answers an `O`-number, the answer is posted as a comment naming
that number. The description keeps one line per question and nothing in it is
rewritten.

The alternative is the one agents reach for unprompted: rewrite `O1..On` as
`R1..Rn` in the body, by analogy with what the operating rules say for a
decision *record*. In a record that is right — the record is the artefact, and
its history is the file's history. In a pull-request description it destroys the
question it answers. The answer gets no permalink, notifies nobody, carries no
timestamp except one typed by hand, and races whoever else is editing.

A review with the answer in it was also rejected. That is the right instrument
when the answer is a verdict on the change; an `O`-number is usually a question
about direction that outlives the branch, and a review body cannot be addressed
per question.

**Why the rule needs a destination rather than more emphasis.** *Do not answer
them yourself* asks an agent to stop and hand over, and that is measurably the
kind of rule agents do not follow.
[Yang, He and Zhou, *A First Look at Coding Agents' Compliance with AI
Contribution Rules in Open-Source
Communities*](https://arxiv.org/html/2607.26819v1) sorts
contribution rules into Refuse, Disclose, Verify and Handoff, and reports that
unaided "Refuse and Handoff sit at a uniform 0% across all four models", while
the policy file itself "was opened in only 12 of 347 non-anchor Native runs
(3.5%)". Disclose ranged from 17% to 40%, Verify from 4% to 92% — rules that add
a step get followed sometimes, rules that demand restraint did not get followed
at all. So the instruction says where the answer goes. A rule with a mechanism
is a step; a rule without one is restraint.

### Provenance goes in the commit, not the description

Agent assistance is disclosed with an `Assisted-by:` trailer on the commit. The
keyword is not invented here: curl's
[`CONTRIBUTE.md`](https://github.com/curl/curl/blob/master/docs/CONTRIBUTE.md)
defines it alongside `Acked-by:`, `Co-authored-by:`, `Reported-by:`,
`Reviewed-by:`, `Suggested-by:` and `Tested-by:`.

A trailer survives a squash merge and cannot be edited afterwards. A footer in
the description is editable by anyone with write access, which makes it a claim
rather than a record.

A template *field* was rejected, on the pattern of
[renovate's template](https://github.com/renovatebot/renovate/blob/main/.github/pull_request_template.md),
which asks whether AI tools were used with four graded answers and separately
who will reply to review comments. It is the better instrument for an open pull
request from a stranger, whose answer is unknown. Where every pull request is
agent-written the answer is always the same, and a heading whose answer never
varies teaches nothing while costing attention on every change.

### Nothing already merged is rewritten

The shape applies from its adoption forward. Existing descriptions are left
alone: editing closed pull requests retroactively is the same failure the rule
above exists to prevent, performed once per pull request.

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
