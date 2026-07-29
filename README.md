# Agent Driven Development

**AI agents remember the current session. Your repository has to remember the
rest.**

A catalogue of rules for running real projects with AI agents — alone or in a
team — plus the tooling to keep a project honest about which of them it
actually follows.

[![CC BY 4.0](https://img.shields.io/badge/method-CC_BY_4.0-blue)](LICENSE)
[![MIT](https://img.shields.io/badge/code-MIT-blue)](checks/LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18+-blue)](package.json)
[![deps: none](https://img.shields.io/badge/deps-none-blue)](package.json)

## The problem

You close the session. The next one — yours, a colleague's, or the same agent
tomorrow — starts from nothing. It reads the repository, and that is all it
reads.

Everything that lived only in the conversation is gone. Why that odd workaround
exists. Which option you rejected, and what it would cost to revisit. What
"finished" meant for the thing half-done on the branch.

The agent does not report the gap. It fills it — plausibly, in your own
register, without flagging that it guessed.

## The premise

> Within a session an agent remembers; across sessions, only the repository
> does.

Both halves matter. Nothing here asks an agent to distrust its own working
memory. What does not survive is the **seam** between sessions — and longer
contexts and external memory stores move that seam rather than removing it.

Treat it as a given, and the repository stops being where the work is kept. It
is the interface every future session arrives through, and it has to be built
like one.

## Who reads what

This page is for you. Most of the rest is written to be read by an agent, in
your project, with no conversation attached.

| | Written for | Where |
|---|---|---|
| **This page** | a visitor deciding whether the idea is worth their time | `README.md` |
| **The manual** | your agent, once you have copied it into your project | [`agent-manual/`](agent-manual/README.md) |
| **The catalogue** | you, choosing what to adopt — and your agent, for the reasoning | [`method/rules.md`](method/rules.md) |
| **The apparatus** | you, keeping an adoption current | [`method/adapting.md`](method/adapting.md) · [`rationale.md`](method/rationale.md) · [`CHANGELOG.md`](method/CHANGELOG.md) · [`checks/`](checks/README.md) |

Nothing here is *optimised* for machine consumption. It is prose, and it stays
prose. What it is instead is **self-supporting**: an agent can act on the manual
without anyone explaining it first, which is what [C3](method/rules.md#c3) asks
for and why the manual spells rules out rather than linking to them.

The catalogue sits in both columns deliberately. Every rule carries the failure
it prevents, because [M1](method/rules.md#m1) holds that a rule whose origin is
lost gets dropped by the first session that finds it inconvenient — and that
session is usually an agent's.

## Try it without adopting anything

Clone it, then point the check at any repository. It scans Markdown for dead
links and anchors, for stale copies of rules the catalogue has withdrawn, and
for a mixed spelling regime — then tells you what it did **not** check.

```bash
git clone https://github.com/nanatsusaya/agent-driven-development
node agent-driven-development/checks/check-method.mjs . --lint --spelling british
```

No `method.json`, no adoption, nothing installed. Zero dependencies, Node 18 or
later. It changes no files.

## Three ideas

Each is a rule, and each carries the failure it prevents.

**[The human is the gate.](method/rules.md#g1)** Agents propose; a person
decides, with no exception for the changes an agent is sure are trivial. What
that person owns is
[direction and coherence, not lines](method/rules.md#g3): an agent writes more
in an hour than anyone reads in an hour, so a gate defined as *read everything*
fails by volume, and fails quietly.

**[One artefact answers one question,](method/rules.md#c1)** and
[every fact has exactly one authority](method/rules.md#c2). Two documents
answering the same question will disagree eventually, and the agent believes
whichever it read last.

**[Decide before building.](method/rules.md#d1)** A choice made in conversation
and never written down is not forgotten. It is re-litigated by the next
session, differently — and nobody can tell that from a fresh decision.

## What a rule looks like

Each one also says whether a command can decide it, so nobody has to guess
which half of the method is actually enforced.

> ### C4 — Documentation changes in the same commit
>
> When behaviour changes, the documents that describe it change in the same
> commit. Stale documentation is a defect, not untidiness.
>
> **Why.** It is the most expensive kind of error, because it does not fail: it
> silently misinforms every future session, and each then produces work
> consistent with something untrue.
>
> **Check:** `manual`

That is [C4](method/rules.md#c4) in full. Identifiers are permanent and never
reused, so a project can point at one and mean something stable.

## The catalogue

Thirty-one rules in eleven clusters. A rule enters only if it holds regardless
of domain — for a software product as much as for a knowledge base with no code
in it. That bar is what keeps the catalogue small.

| Cluster | What it governs | Rules |
|---|---|---|
| **G** — The gate | who decides, and what they are accountable for | [G1](method/rules.md#g1) · [G2](method/rules.md#g2) · [G3](method/rules.md#g3) |
| **D** — Decisions | writing choices down, and keeping them readable later | [D1](method/rules.md#d1) · [D2](method/rules.md#d2) · [D3](method/rules.md#d3) · [D4](method/rules.md#d4) |
| **C** — Documentation | where facts live, and how they stay true | [C1](method/rules.md#c1) · [C2](method/rules.md#c2) · [C3](method/rules.md#c3) · [C4](method/rules.md#c4) · [C5](method/rules.md#c5) |
| **M** — Method memory | why the way of working looks the way it does | [M1](method/rules.md#m1) · [M2](method/rules.md#m2) |
| **E** — Enforcement | turning rules into commands, and what a check may claim | [E1](method/rules.md#e1) · [E2](method/rules.md#e2) · [E3](method/rules.md#e3) |
| **H** — Honesty | what may be reported, and when work is handed back | [H1](method/rules.md#h1) · [H2](method/rules.md#h2) · [H3](method/rules.md#h3) · [H4](method/rules.md#h4) · [H5](method/rules.md#h5) |
| **L** — Language | one language in the repository, yours in conversation | [L1](method/rules.md#l1) · [L2](method/rules.md#l2) |
| **S** — Sessions | how a session starts, resumes and ends | [S1](method/rules.md#s1) · [S2](method/rules.md#s2) |
| **W** — Work | what "done" means, fixed before the work starts | [W1](method/rules.md#w1) |
| **P** — What never enters | secrets and personal data, kept out of the repository | [P1](method/rules.md#p1) |
| **A** — Adaptation | changing the rules on purpose rather than by drift | [A1](method/rules.md#a1) · [A2](method/rules.md#a2) · [A3](method/rules.md#a3) |

Read them in [`method/rules.md`](method/rules.md).

## Three ways to use it

### 1. Read the catalogue and take what fits

Copy the rules that apply into your own agent instructions, in your own words.
Nothing is installed, and nothing references this repository at runtime — rule
[C3](method/rules.md#c3) argues against that.

**⚠️ Most people should stop here.**

### 2. Install the plugin

Five procedures for Claude Code. This is what the method looks like as daily
work rather than as a document.

| Procedure | When |
|---|---|
| `session-start` | Bring-up — and it ends with a question, never an action |
| `after-merge` | The seam right after a change lands |
| `session-end` | Wind-down: tidy up, park unfinished work honestly, bring the living documents current |
| `decision-record` | Writing or reworking a decision |
| `adopt` | Introducing the method to a project, or reviewing how well an existing one fits |

The first three are the loop: one when you sit down, one every time a change
lands, one when you stop. The other two come up occasionally.

```
/plugin marketplace add nanatsusaya/agent-driven-development
/plugin install agent-method@agent-driven-development
```

They read your project's own files and assume nothing about your stack.
Details in [`plugins/agent-method/`](plugins/agent-method/README.md), including
how to rename the commands into your own language — you type them all day, and
[L1](method/rules.md#l1) only asks that the *documents* stay in one language.

### 3. Declare the relationship

Add a `method.json` that binds four roles to your actual files, names the
systems you keep outside the repository, and records where you diverged.

| Role | Question it answers |
|---|---|
| `operating-rules` | How should an agent work in this project? |
| `decisions` | What has been decided, and why? |
| `state` | Where does the project stand now? |
| `method-log` | Why has the way of working changed? |

```json
{
  "method": "agent-driven-development",
  "version": "0.2",
  "artefacts": {
    "operating-rules": "CLAUDE.md",
    "decisions": "docs/adr/",
    "state": "docs/STATUS.md",
    "method-log": "docs/method-log.md"
  },
  "adaptations": []
}
```

Start from [the template](agent-manual/method.json), then run the check without
`--lint`. It buys one thing: when a rule here changes, you find out which of
your projects still teaches the old version — instead of discovering it two
sessions later.

## What the check reports

Real output, against a project that dropped one rule and narrowed another.
Trimmed of its absolute paths and wrapped here to fit:

```
────────────────────────────────────────────────────────────────────────
agent-driven-development · coherence check
  catalogue: method (31 rules, 0 withdrawn)
────────────────────────────────────────────────────────────────────────

rules: 30 in force, 2 adapted
  M1 dropped  Keep a method log
  D2 narrowed An accepted decision is immutable  · check still runs

external authorities
  gate     https://github.com/acme/atlas/settings/branches
  tasks    https://github.com/acme/atlas/issues

not verified here
  G1 — trunk protection is a hosting-platform setting; verify it there. Even
      then it proves a change arrived through review, not that anyone read it
      verify it at: https://github.com/acme/atlas/settings/branches
  P1 — secret scanning belongs to the platform; this check does not look for
      credentials
  20 rule(s) in force are marked `manual` and depend on review
  role "method-log" is unbound — checks that depend on it were skipped

────────────────────────────────────────────────────────────────────────
OK · the declaration matches the project
```

The last block is the point. A report that says "no findings" without naming
what it never looked at reads as a clean bill of health — which is the rule the
tool exists to enforce, broken by the tool.

Note what it is **not** asking. Not *does this project obey the catalogue*.
[A1](method/rules.md#a1) expects the rules to be reshaped, so a narrowed rule
with a stated reason is a correct state. What is not correct is a rule that
vanished without anyone deciding it should.

### What it cannot decide

It does not inspect branch-protection settings, scan for real credentials,
follow external links, or establish that a human review actually happened. It
does not judge whether a decision is a good one or a document well written —
that is [E2](method/rules.md#e2), and it stays a review question.

A passing run means the declaration matches the repository. It does not mean
the project is correct. Every check it could not perform is named in the
report.

## Adapting it

The catalogue is a starting point, and [A1](method/rules.md#a1) says so
normatively. Narrow, replace or drop what does not fit — the one requirement is
that you write down what you changed and why. An undocumented divergence is
indistinguishable from carelessness, and the next session will helpfully
restore the rule you deliberately removed.

[`method/adapting.md`](method/adapting.md) works through six archetypes —
including a knowledge base with no code, a team rather than one maintainer, and
a solo project with no audience yet — and says which rules change shape in
each.

## What it is not, and what it costs

It is not an agent runtime, a multi-agent orchestration framework, a prompt
library, a task tracker, a specification format, or a replacement for human
judgement. The plugin targets one runtime; the rules, templates and check do
not.

And the method is not free. Pretending otherwise would break
[H1](method/rules.md#h1).

- **Review becomes the bottleneck.** The gate caps throughput at the rate
  people read changes, and the cap tightens as the agent gets better.
- **The confidence bar sits on self-report.** The agent judges its own work.
  Three rules push as much of that as possible onto something external, but a
  residue remains.
- **Rules compete with the task for attention.** Every rule in your instruction
  file spends context on every task, relevant or not.
- **Trivial changes pay full price.** A two-line correction takes the same
  route as a redesign. That is what an absolute gate costs.
- **Written rules outnumber checked ones**, and that ratio is the honest
  measure of how much of this is really in force.

[`method/rationale.md`](method/rationale.md) has the full version, plus a
section on where the method is most likely wrong.

## Repository layout

| | |
|---|---|
| [`method/rules.md`](method/rules.md) | **The catalogue.** The only normative document here. |
| [`method/adapting.md`](method/adapting.md) | How to reshape the rules for your project, by archetype. |
| [`method/rationale.md`](method/rationale.md) | Why the method looks like this, what it costs, where it is weak. |
| [`method/CHANGELOG.md`](method/CHANGELOG.md) | What changed between versions, and what you have to do about it. |
| [`method/withdrawn.md`](method/withdrawn.md) | Rules that no longer apply, and what replaced them. |
| [`agent-manual/`](agent-manual/README.md) | **What you copy into your project.** [`operating-rules.md`](agent-manual/operating-rules.md) is the manual your agent reads; the rest are the shapes it refers to. |
| [`checks/`](checks/README.md) | The coherence check, and the counter-test that makes it trustworthy. |
| [`plugins/agent-method/`](plugins/agent-method/README.md) | Five session procedures, as a Claude Code plugin. |

## FAQ

**Do I have to install anything?**
No. Reading the catalogue and copying what fits is option 1 above, and it is a
complete way to use this.

**Does this only work with Claude Code?**
The catalogue names no tool and no stack. The plugin targets one runtime
because that is what the author uses; the `method.json` roles exist so the
check never needs to know what is reading the repository.

**Thirty-one rules sounds like a lot.**
It is a catalogue to choose from, not a checklist to satisfy. Every rule you
adopt spends context on every task, which is exactly why the bar for admission
is high and why [A1](method/rules.md#a1) tells you to drop what does not fit.

**Is this spec-driven development?**
No. That approach makes a specification the primary artefact and derives the
implementation from it. This says nothing about where implementations come
from — you could run a strict specification-first workflow inside these rules
unchanged.

## Contributing

This is a reference, and it is also an argument. The parts most worth attacking
are collected under *where it is most likely wrong* in
[the rationale](method/rationale.md#where-it-is-most-likely-wrong). Most useful
to bring:

- a rule that did not hold up in practice, and what it cost
- a project archetype the adaptation guide misses
- a `manual` rule that could be `automated`, with the check
- a check that produces false alarms, which is worse than no check at all

[Discussions](https://github.com/nanatsusaya/agent-driven-development/discussions)
for the arguments, issues for concrete corrections. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Copyright © 2026 Daniel Wagner. Two licences, because the repository holds two
kinds of thing.

**The written method** — everything outside `checks/` — is under
[CC BY 4.0](LICENSE). Copy it, adapt it, rewrite it, commercially or not. The
one condition is credit.

**The code** in [`checks/`](checks/README.md) is under [MIT](checks/LICENSE),
because a check you cannot combine with your own project's licence is a check
you cannot use.
