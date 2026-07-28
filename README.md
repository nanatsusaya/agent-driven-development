# agent-driven-development

**A ruleset for running real projects with AI agents, alone or in a team.
Within a session an agent remembers; across sessions, only the repository
does.**

## The premise

An agent working a task builds up context as it goes, and that context is worth
keeping. What it does not do is survive. When the session ends, everything not
written into the repository is gone, and the next session — yours, a
colleague's, or the same agent tomorrow — begins from what the repository says
and nothing else.

That seam is what this ruleset is designed for. Most advice treats it as a
limitation to route around: longer context, better prompts, external memory.
Here it is the premise, because the alternative is a project whose continuity
depends on somebody happening to remember, and that somebody is not always in
the room. If the repository is what carries across the seam, it is not merely
where the work is kept — it is the interface every future session arrives
through, and it has to be built like one. Nothing here assumes a single
maintainer; a team hits the same seam more often, because the sessions that
lose context are also each other's.

## What follows from it

**The human is the gate.** Agents propose; a person decides — not because
agents are unreliable, but because a review boundary is the only place where
stated intent gets compared against actual outcome.

**One artefact answers one question.** A fact duplicated away from its authority
degrades into an assertion. Two documents that answer the same question will
eventually disagree, and the agent will believe whichever it read last.

**Decide before building.** A choice made in conversation and never written down
is not forgotten — it is re-litigated by the next session, differently.

**A rule that can be a check is a check.** Prose erodes. Nobody re-reads a long
instruction file in the middle of a task.

**Artefacts in one language; conversation in yours.** Everything committed is
written in a single language and spelling standard. Talking to the agent
happens in whatever language you think in.

## What is here

| | |
|---|---|
| [`method/rules.md`](method/rules.md) | **The catalogue.** 30 rules in eleven clusters, each with the failure it prevents and whether a command can decide it. |
| [`method/adapting.md`](method/adapting.md) | How to reshape the rules for your project, by archetype. |
| [`method/rationale.md`](method/rationale.md) | Why the method looks like this, what it costs, and where it is most likely wrong. |
| [`templates/`](templates/README.md) | Starting points for the four artefacts, plus review and ticket forms. |
| [`checks/`](checks/README.md) | The coherence check, and the counter-test that makes it trustworthy. |
| [`plugins/agent-method/`](plugins/agent-method/README.md) | Five session procedures, as a Claude Code plugin. |

## Using it

Three ways, and the first is a legitimate stopping point.

**1. Read the catalogue and take what fits.** Copy the rules that apply into
your own agent instructions, in your own words. Nothing has to be installed and
nothing has to reference this repository at runtime — rule
[C3](method/rules.md#c3) argues against it.

**2. Install the plugin** for the session procedures — bring-up, the seam after
a merged change, wind-down, writing a decision record, and adopting the method
into a project. They read your project's own files and carry no assumptions
about your stack.

```
/plugin marketplace add nanatsusaya/agent-driven-development
/plugin install agent-method@agent-driven-development
```

**3. Declare the relationship** with a `method.json` that binds four roles to
your actual files and records where you diverged, then run the check:

```bash
git clone https://github.com/nanatsusaya/agent-driven-development
node agent-driven-development/checks/check-method.mjs <your-project>
```

Zero dependencies, Node 18 or later. It buys one thing: when a rule here
changes, you find out which of your projects still teaches the old version —
instead of discovering it two sessions later.

## Adapting it

The catalogue is a starting point, not a doctrine, and [A1](method/rules.md#a1)
says so normatively. A rule that does not fit should be narrowed, replaced or
dropped. The only requirement is that you write down what you changed and why,
because an undocumented divergence is indistinguishable from carelessness — and
the next session will helpfully restore the rule you deliberately removed.

## Discussion

This is a reference, and it is also an argument. The parts most worth attacking
are in [`method/rationale.md`](method/rationale.md#where-it-is-most-likely-wrong):
whether the catalogue is really domain-independent, whether an adversarial
second agent would beat the self-assessment rule, and how much of the ceremony
is earning its keep.

Most useful to bring: a rule that did not hold up in practice and what it cost ·
an archetype the adaptation guide misses · a `manual` rule that could be
`automated`, with the check · a check that produces false alarms, which is worse
than no check at all.

[Discussions](https://github.com/nanatsusaya/agent-driven-development/discussions)
for the arguments, issues for concrete corrections, and see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Copyright © 2026 Daniel Wagner. Licensed under [CC BY 4.0](LICENSE) — copy it,
adapt it, rewrite it for your own needs, commercially or not. The one condition
is credit.
