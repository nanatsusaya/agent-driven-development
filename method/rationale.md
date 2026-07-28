# Why the method looks like this

The catalogue states rules. This states what the catalogue bets on, what it
costs, and where it is most likely to be wrong. It is the part most worth
arguing with.

## The bet

**Within a session an agent remembers; across sessions, only the repository
does.**

The first half matters as much as the second. A session accumulates reasoning,
and that reasoning is what makes a long piece of work coherent rather than a
sequence of locally sensible steps — which is why [S1](rules.md#s1) tells the
procedure at the seam to *keep* its context. A method that told agents to
distrust their own working memory would cost everything and prevent nothing.

What does not survive is the seam. Longer contexts and external memory stores
move it without removing it, and a method that depends on where a vendor has
moved it this year has a short life. Treat it as the condition the system is
designed for, the way a filesystem is designed for the assumption that power
can fail at any moment.

If the repository is what carries across the seam, it is not a place where work
is stored. It is the interface every future session arrives through, and bugs
in it behave accordingly: they do not fail loudly, they make everything running
on top subtly wrong.

**None of this assumes one maintainer.** A team hits the same seam more often,
because sessions also lose each other's context — and a rule whose origin lives
in one person's memory is exactly as lost to a colleague as to tomorrow's
agent.

Three properties follow, and they are what the clusters are for. It has to be
**complete**, because anything the agent needs and cannot find it will invent —
plausibly, in your own register, without flagging it ([C3](rules.md#c3)). It
has to be **unambiguous**, because two documents answering the same question
produce whichever the agent read last, not a synthesis ([C1](rules.md#c1),
[C2](rules.md#c2)). And it has to **defend itself**, because a rule that exists
only as prose is enforced by whether someone happened to re-read it, which over
enough sessions rounds to never (**E**).

## What this is not

**Not spec-driven development.** That makes a specification the primary
artefact and derives implementation from it. This says nothing about where
implementations come from; you could run a strict spec-first workflow inside
these rules unchanged.

**Not a prompt library.** The claim is that the leverage sits in the
repository's structure, not in the wording of the request, because structure
persists across sessions and wording does not.

**Not an autonomy framework.** It reduces autonomy at one point — where work
becomes permanent — and grants it freely everywhere else
([S2](rules.md#s2)). Methods that treat autonomy as a single dial must choose
between an agent that asks about everything and one that asks about nothing.

**Not tied to a tool.** The plugin here targets one agent runtime because that
is what the author uses. The roles in `method.json` exist so that nothing in
the check needs to know which tool is reading the repository.

## What it costs

**Review becomes the bottleneck.** [G1](rules.md#g1) caps throughput at the
rate people read changes, and the cap tightens as the agent gets better: the
method converts capability into queue. A team can spread the load, but gains a
failure the solo case does not have — with several people merging, a rule can
be applied inconsistently, and [M1](rules.md#m1) becomes what keeps the
reviewers agreeing.

**The confidence bar relocates verification onto self-report.**
[H2](rules.md#h2) asks the agent to judge its own work, which is the weakest
available place to put that judgement. H3, H5 and E3 convert as much of it as
possible into something external, but a residue remains and it is the method's
softest joint.

**Operating rules compete with the task for attention.** Every rule in the
instruction file consumes context on every task, relevant or not. A large rule
file is not free discipline; it is a standing tax — the strongest argument for
keeping the catalogue small.

**The absolute gate costs a cycle on trivial changes.** A two-line correction
takes the same route as a redesign. That is the deliberate price of
[G1](rules.md#g1) having no exceptions.

**Written rules outnumber checked ones**, and that ratio is the honest measure
of how much of this is actually in force. Every rule marked `manual` depends on
someone remembering it.

## Where it is most likely wrong

**The catalogue may not be as domain-independent as it claims.** The clusters
were derived from a small number of projects by one person, and one person's
sense of what is universal is not evidence. The clearest falsification would be
a project type where a whole cluster has to be dropped rather than reshaped.

**A second reviewing agent may beat the confidence rule.** Before work reaches
a person, put it through an independent agent prompted to find fault rather
than agree. That would move verification off self-report. It is untested here
and not free — two agents sharing a failure mode produce agreement rather than
review.

**It was tested harder against project shapes than against team shapes.** It
has not been through the same exercise for the ways a *team* differs: several
people merging, disagreeing about a rule, or onboarding onto one. Indifference
that has not been tested is a claim, not a property.

**Some of the ceremony may not be earning its keep.** Every rule has a
plausible story attached, and a plausible story is not evidence. Rules acquired
after a bad experience outlive the conditions that justified them, and nothing
here retires one that has quietly stopped paying.

**The method log has no reader.** It is written for a future session, and
nothing guarantees a future session reads it. Making it load-bearing rather
than archival is unsolved.

## Contributions worth making

- a rule that did not hold up in practice, and what it cost
- a project archetype [adapting.md](adapting.md) does not cover
- a `manual` rule that could be made `automated`, with the check
- a check that produces false alarms, which is worse than no check at all

[Discussions](https://github.com/nanatsusaya/agent-driven-development/discussions)
is the place for it.
