# Agent Driven Development

**AI agents remember the current session. Your repository has to remember the
rest.**

[![CC BY 4.0](https://img.shields.io/badge/method-CC_BY_4.0-blue)](LICENSE)
[![MIT](https://img.shields.io/badge/code-MIT-blue)](checks/LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18+-blue)](package.json)
[![deps: none](https://img.shields.io/badge/deps-none-blue)](package.json)

## The premise

> Within a session an agent remembers; across sessions, only the repository
> does.

You close the session. The next one — yours, a colleague's, or the same agent
tomorrow — starts from nothing. It reads the repository, and that is all it
reads.

Everything that lived only in the conversation is gone. Why that odd workaround
exists. Which option you rejected, and what it would cost to revisit. What
"finished" meant for the thing half-done on the branch. The agent does not
report the gap. It fills it — plausibly, in your own register, without flagging
that it guessed.

Both halves matter. Nothing here asks an agent to distrust its own working
memory. What does not survive is the **seam** between sessions — and longer
contexts and external memory stores move that seam rather than removing it.

Treat it as a given, and the repository stops being where the work is kept. It
is the interface every future session arrives through, and it has to be built
like one.

## What follows from it

Three ideas do most of the work. Each is a rule, and each carries the failure it
prevents.

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

## The catalogue

Thirty-two rules in eleven clusters. A rule enters only if it holds regardless
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
| **S** — Sessions | how a session starts, resumes and ends | [S1](method/rules.md#s1) · [S2](method/rules.md#s2) · [S3](method/rules.md#s3) |
| **W** — Work | what "done" means, fixed before the work starts | [W1](method/rules.md#w1) |
| **P** — What never enters | secrets and personal data, kept out of the repository | [P1](method/rules.md#p1) |
| **A** — Adaptation | changing the rules on purpose rather than by drift | [A1](method/rules.md#a1) · [A2](method/rules.md#a2) · [A3](method/rules.md#a3) |

One rule in full, so you can see the shape. Each says whether a command can
decide it, so nobody has to guess which half of the method is really enforced:

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

That is [C4](method/rules.md#c4). Identifiers are permanent and never reused, so
a project can point at one and mean something stable. All thirty-two are in
[`method/rules.md`](method/rules.md).

## Make it yours

The catalogue is a starting point, not a checklist, and
[A1](method/rules.md#a1) says so normatively. Narrow, replace or drop what does
not fit. The one requirement is that you write down what you changed and why —
an undocumented divergence is indistinguishable from carelessness, and the next
session will helpfully restore the rule you deliberately removed.

**Start from the manual.**
[`agent-manual/operating-rules.md`](agent-manual/operating-rules.md) is the file
your agent reads at the start of every task. Copy it into your project, cut what
does not apply, and rewrite the rest in your own words. Nothing is installed,
and nothing references this repository at runtime — rule
[C3](method/rules.md#c3) argues against that.

**Reshape the rules for your kind of project.**
[`method/adapting.md`](method/adapting.md) works through six archetypes —
including a knowledge base with no code, a team rather than one maintainer, and
a solo project with no audience yet — and says which rules change shape in each.

**Record what you changed.** A `method.json` binds four roles to your actual
files, names the systems you keep outside the repository, and lists your
divergences.

| Role | Question it answers |
|---|---|
| `operating-rules` | How should an agent work in this project? |
| `decisions` | What has been decided, and why? |
| `state` | Where does the project stand now? |
| `method-log` | Why has the way of working changed? |

```json
{
  "method": "agent-driven-development",
  "version": "0.4",
  "artefacts": {
    "operating-rules": "CLAUDE.md",
    "decisions": "docs/adr/",
    "state": "docs/STATUS.md",
    "method-log": "docs/method-log.md"
  },
  "adaptations": []
}
```

Start from [the template](agent-manual/method.json). It buys one thing: when a
rule here changes, you find out which of your projects still teaches the old
version — instead of discovering it two sessions later.

### Checking that it still holds

A command reads your declaration and reports where it and the repository
disagree. It changes no files, and it needs no adoption to be useful:

```bash
git clone https://github.com/nanatsusaya/agent-driven-development ../agent-driven-development
node ../agent-driven-development/checks/check-method.mjs . --lint --spelling british
```

Zero dependencies, Node 18 or later. What matters most is how it ends:

```
not verified here
  G1 — trunk protection is a hosting-platform setting; verify it there. Even
      then it proves a change arrived through review, not that anyone read it
  P1 — secret scanning belongs to the platform; this check does not look for
      credentials
  20 rule(s) in force are marked `manual` and depend on review
  role "method-log" is unbound — checks that depend on it were skipped
```

A report that says "no findings" without naming what it never looked at reads
as a clean bill of health — which is the rule the tool exists to enforce, broken
by the tool. [`checks/`](checks/README.md) has the ten checks, the options, and
the limitations it will not pretend away.

## The five procedures

The moments a session turns over are where the seam actually bites, so each one
has a procedure. These are the ones in daily use.

| Procedure | When you run it |
|---|---|
| `session-start` | Bring-up. Orients from the project's own documents, and ends with a question rather than an action. |
| `after-merge` | The seam after a change lands. Re-verify the world, bring the documents current, start the next task only if it needs no decision. |
| `session-end` | Wind-down. Tidy the branches, park unfinished work at an honest stopping point, bring the documents current. |
| `decision-record` | Write a decision down, and take it through its cycle from proposed to accepted. |
| `adopt` | Introduce the method to a project, or review how well an existing one fits. |

The first three are the loop: one when you sit down, one every time a change
lands, one when you stop. The other two come up as needed.

They are plain Markdown, they read your project's own files, and they assume
nothing about your stack. Put them wherever your agent already looks and they
work. What each one does step by step is in
[`plugins/agent-method/`](plugins/agent-method/README.md), along with how to
rename them into your own language.

## Installing them

Optional convenience. The procedures are also packaged as a Claude Code plugin,
which saves you copying five files by hand. Three steps, from inside Claude
Code:

**1. Add this repository as a marketplace.** Nothing is installed yet; this only
makes the catalogue visible.

```
/plugin marketplace add nanatsusaya/agent-driven-development
```

**2. Install the plugin.** You will be asked to choose a scope — yourself
everywhere, this repository for everyone, or this repository for you alone.

```
/plugin install agent-method@agent-driven-development
```

**3. Activate it in the running session.**

```
/reload-plugins
```

The skills are then `/agent-method:session-start` and so on.

Two of those steps report something that looks like a failure and is not, and
`/plugin` does not exist in every environment.
[`plugins/agent-method/`](plugins/agent-method/README.md) covers both, and how
to skip the plugin entirely.

## What it costs

It is not an agent runtime, a multi-agent orchestration framework, a prompt
library, a task tracker, a specification format, or a replacement for human
judgement. The plugin targets one runtime; the rules, manual and check do not.

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

## Where everything lives

This page is for you. Most of the rest is written to be read by an agent, in
your project, with no conversation attached — which is why the manual spells
rules out rather than linking to them, as [C3](method/rules.md#c3) asks.

| | Written for | What it is |
|---|---|---|
| [`method/rules.md`](method/rules.md) | you, choosing what to adopt — and your agent, for the reasoning | **The catalogue.** The only normative document here. |
| [`agent-manual/`](agent-manual/README.md) | your agent, once you have copied it into your project | [`operating-rules.md`](agent-manual/operating-rules.md) is the manual it reads; the rest are the shapes it refers to. |
| [`plugins/agent-method/`](plugins/agent-method/README.md) | you, installing or adapting the procedures | The five procedures — plain Markdown, packaged as a Claude Code plugin. |
| [`method/adapting.md`](method/adapting.md) | you, reshaping the rules for your project | How each archetype changes which rules apply. |
| [`method/rationale.md`](method/rationale.md) | you, deciding whether to believe any of it | Why the method looks like this, what it costs, where it is weak. |
| [`method/CHANGELOG.md`](method/CHANGELOG.md) | you, keeping an adoption current | What changed between versions, and what you have to do about it. |
| [`method/withdrawn.md`](method/withdrawn.md) | the check, and you | Rules that no longer apply, and what replaced them. |
| [`checks/`](checks/README.md) | you, verifying an adoption | The coherence check, and the counter-test that makes it trustworthy. |

## FAQ

**Do I have to install anything?**
No. Reading the catalogue and copying what fits is a complete way to use this.
The plugin is convenience, not a dependency.

**Does this only work with Claude Code?**
The catalogue names no tool and no stack. The plugin targets one runtime
because that is what the author uses; the `method.json` roles exist so the
check never needs to know what is reading the repository.

**Thirty-two rules sounds like a lot.**
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
