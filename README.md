# agent-driven-development

**A ruleset for running real projects with AI agents, alone or in a team.
Within a session an agent remembers; across sessions, only the repository
does.**

[![CC BY 4.0](https://img.shields.io/badge/method-CC_BY_4.0-blue)](LICENSE)
[![MIT](https://img.shields.io/badge/code-MIT-blue)](checks/LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18+-blue)](package.json)
[![deps: none](https://img.shields.io/badge/deps-none-blue)](package.json)

## Try it before adopting anything

This scans a repository's Markdown for dead links and anchors, for stale copies
of rules the catalogue has withdrawn, and for a mixed spelling regime — then
tells you what it did **not** check. No `method.json`, no adoption, nothing
installed.

```bash
git clone https://github.com/nanatsusaya/agent-driven-development
node agent-driven-development/checks/check-method.mjs . --lint --spelling british
```

Zero dependencies, Node 18 or later.

## What a rule looks like

Every rule carries the failure it prevents, because a rule whose origin is lost
gets dropped by the first session that finds it inconvenient. And every rule
says whether a command can decide it, so nobody has to guess which half of the
method is actually enforced.

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

The full rule is [C4](method/rules.md#c4). Identifiers are permanent and never
reused, so a project can refer to one and mean something stable.

## What the check reports

Bind your artefacts in a `method.json`, record where you diverged, and the
check tells you whether the two still agree. Real output, against a project
that dropped one rule and narrowed another:

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
what it never looked at reads as a clean bill of health, and a tool that does
that has broken the rule it exists to enforce.

Note what it is **not** asking. Not *does this project obey the catalogue* —
[A1](method/rules.md#a1) expects the rules to be reshaped, so a narrowed rule
with a stated reason is a correct state. What is not correct is a rule that
vanished without anyone deciding it should.

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
through, and it has to be built like one.

Nothing here assumes a single maintainer. A team hits the same seam more often,
because the sessions that lose context are also each other's.

Five things follow, and each is a rule with its reasoning attached:

- **[The human is the gate.](method/rules.md#g1)** Agents propose; a person
  decides — and what that person is accountable for is
  [direction and coherence, not lines](method/rules.md#g3). A gate defined as
  *read everything* fails by volume, not by neglect.
- **[One artefact answers one question.](method/rules.md#c1)** With
  [exactly one authority per fact](method/rules.md#c2), because a fact
  duplicated away from its authority degrades into an assertion, and the agent
  believes whichever copy it read last.
- **[Decide before building.](method/rules.md#d1)** A choice made in
  conversation and never written down is not forgotten — it is re-litigated by
  the next session, differently.
- **[A rule that can be a check is a check.](method/rules.md#e1)** Prose
  erodes. Nobody re-reads a long instruction file in the middle of a task.
- **[Artefacts in one language; conversation in yours.](method/rules.md#l1)**
  Everything committed uses a single language and spelling standard. Talking to
  the agent happens in whatever language you think in.

## What is here

| | |
|---|---|
| [`method/rules.md`](method/rules.md) | **The catalogue.** 31 rules in eleven clusters, each with the failure it prevents and whether a command can decide it. |
| [`method/adapting.md`](method/adapting.md) | How to reshape the rules for your project, by archetype. |
| [`method/rationale.md`](method/rationale.md) | Why the method looks like this, what it costs, and where it is most likely wrong. |
| [`method/CHANGELOG.md`](method/CHANGELOG.md) | What changed between versions, and what you have to do about it. |
| [`templates/`](templates/README.md) | Starting points for the four artefacts, plus review and ticket forms. |
| [`checks/`](checks/README.md) | The coherence check, and the counter-test that makes it trustworthy. |
| [`plugins/agent-method/`](plugins/agent-method/README.md) | Five session procedures, as a Claude Code plugin. |

## Three ways to use it, and the first is enough

**1. Read the catalogue and take what fits.** Copy the rules that apply into
your own agent instructions, in your own words. Nothing has to be installed and
nothing has to reference this repository at runtime — rule
[C3](method/rules.md#c3) argues against it. This is a legitimate stopping
point.

**2. Install the plugin** for the session procedures — bring-up, the seam after
a merged change, wind-down, writing a decision record, and adopting the method
into a project. They read your project's own files and carry no assumptions
about your stack.

```
/plugin marketplace add nanatsusaya/agent-driven-development
/plugin install agent-method@agent-driven-development
```

**3. Declare the relationship** with a `method.json` that binds four roles to
your actual files, names the systems you keep outside the repository, and
records where you diverged. Then run the check without `--lint`.

It buys one thing: when a rule here changes, you find out which of your
projects still teaches the old version — instead of discovering it two sessions
later.

## Adapting it

The catalogue is a starting point, not a doctrine, and [A1](method/rules.md#a1)
says so normatively. A rule that does not fit should be narrowed, replaced or
dropped. The only requirement is that you write down what you changed and why,
because an undocumented divergence is indistinguishable from carelessness — and
the next session will helpfully restore the rule you deliberately removed.

## Discussion

This is a reference, and it is also an argument. The parts most worth attacking
are collected under *where it is most likely wrong* in
[the rationale](method/rationale.md#where-it-is-most-likely-wrong):
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

Copyright © 2026 Daniel Wagner. Two licences, because the repository holds two
kinds of thing.

**The written method** — everything outside `checks/` — is under
[CC BY 4.0](LICENSE). Copy it, adapt it, rewrite it for your own needs,
commercially or not. The one condition is credit.

**The code** in [`checks/`](checks/README.md) is under [MIT](checks/LICENSE).
Creative Commons advises against using CC licences for software, and a check
you cannot combine with your own project's licence is a check you cannot use.
