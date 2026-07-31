# The rule catalogue

Thirty-two rules in eleven clusters, identified as `<cluster><number>`. The
identifier is permanent and never reused, even for a withdrawn rule: projects
refer to rules by identifier, so renumbering would silently change what a
project claims to follow.

Every rule carries **Why** — the failure it prevents — because a rule whose
origin is lost gets dropped by the first session that finds it inconvenient.
**Check** says whether a command can decide it: `automated`, `manual`, or `n/a`
for a stance rather than a testable condition. **Binding**, where present, is
how the rule is usually expressed concretely; the binding is a suggestion, the
rule is not.

A rule belongs here only if it holds **independently of domain** — for a
software product as much as for a knowledge base with no code in it. That bar
is deliberately hard, and it is what keeps the catalogue small. Everything
domain-specific belongs in your own project layer; [adapting.md](adapting.md)
describes how to build one.

---

## G — The gate

<a id="g1"></a>
### G1 — The human is the gate

Every change reaches the trunk through a review boundary that a human controls.
The agent proposes, opens the change, and stops. There is no exception — not
for a one-line status flip, not for a log file, not for a change the agent is
certain is mechanical.

**Why.** An exception carved out for "mechanical" changes is an exception whose
boundary the agent decides, and an agent that can classify its own change as
mechanical can reach the trunk unreviewed. The rule survives only while it is
absolute.

**Check:** `automated` in part — trunk protection that requires a change to
arrive through review and applies to administrators as well. An agent usually
runs with a human's own credentials, so a protection administrators may bypass
is one the agent may bypass.

What the setting proves is that the boundary was there, not that anyone stopped
at it. Where the approving-review requirement is zero — which the *Binding*
below recommends wherever the same account authors and merges — a change still
reaches the trunk through a pull request nobody read. No setting closes that
gap, and a rule that claimed otherwise would be worse than one that names it:
the boundary is machine-enforced, the reading is not.

**Binding.** In a team the ordinary approving-review requirement already does
this, and the rule adds only that the agent is never one of the approvers.
Where the same account authors and merges, set the required approving reviews
to **zero** deliberately: most platforms forbid approving your own change, so a
higher number makes the trunk unmergeable rather than better reviewed — and a
setting that cannot be satisfied gets switched off, taking the rest of the
protection with it.

<a id="g2"></a>
### G2 — Open questions are surfaced, never self-answered

When a task meets a decision that belongs to a person rather than to the agent
— direction, sequencing, anything legal, outward-facing or expensive to reverse
— the agent states the question, recommends a default, and stops. Number them
`O1..On`; once answered, rewrite them in place as `R1..Rn` with what was
decided and why. Who the person is varies; the rule is about *where the
decision sits*, not how many people sit there.

**Why.** An agent asked to produce an outcome resolves ambiguity rather than
surfacing it, because resolving is progress and surfacing is delay. The
resolution is occasionally wrong in a way that is expensive and invisible —
invisible precisely because it was never presented as a choice.

**Check:** `manual`

<a id="g3"></a>
### G3 — The gate reviews direction and coherence, not lines

At the boundary a person decides two things: whether the change moves towards
the goal, and whether it fits what already exists rather than working by making
an exception to it. Line-level correctness is not one of them. That is what
[H3](#h3) is for — verification by exercising the thing — and what [E1](#e1)
turns into a command wherever a command can decide it.

**Why.** [G1](#g1) makes the boundary absolute without saying what makes it
survivable. A reviewer who believes the job is to read every line does one of
two things: burns out, or begins waving changes through while still believing
otherwise. The second is worse, because from outside the boundary still looks
like a boundary.

With an agent this stops being a question of discipline and becomes one of
arithmetic. An agent produces more in an hour than anyone can read in an hour,
so a gate defined as *read everything* fails by volume rather than by neglect —
and it fails silently, at whichever moment the reviewer quietly stops.

Naming the two questions is what makes the gate cheap enough to hold every
time, without exception, which is the only form [G1](#g1) survives in. It also
guards the opposite failure: a reviewer deep in the lines who never asks
whether the change was worth making at all.

It follows that a change too large to answer both questions about is a change
that will be waved through, and that the size at which this happens is far
smaller than the size at which anyone admits it. The reviewer rarely refuses;
they approve, and quietly stop being the gate. So the practical form of this
rule is a constraint on what arrives: one concern per change, and a change
scoped so that "does this fit?" is answerable at all — which is the same
discipline [W1](#w1) asks of a task before it starts.

**Check:** `manual`, and necessarily. A check deciding whether direction *had
been considered* would be a quality measure, which is what [E2](#e2) exists to
forbid.

**Binding.** In a software project the two questions are the ones a *product
owner* and a *software architect* ask, and borrowing those names is usually the
quickest way to be understood. They are the local form, not the rule. Where
there is no code the same two questions are: does this serve the reader we said
we were writing for, and does it fit the canon or quietly contradict something
already in it. Neither title has to exist as a job for the questions to be
someone's — in a team they may sit with different people, and then the
operating rules say which, for the same reason [G2](#g2) needs an addressee.

---

## D — Decisions

<a id="d1"></a>
### D1 — Decide before building

Anything a later change could silently reverse, and anything whose reasoning is
not obvious from the result, is written down before it is built. The test:
could a future agent undo this without noticing that a choice was being made?

**Why.** A choice made in conversation and never written down is not merely
forgotten; it is re-litigated by the next session, differently. The cost is not
the first reversal — it is that nobody can tell a reversal from a fresh
decision, so the drift is never detected.

**Check:** `manual`

**Binding.** In software the established form is the **Architecture Decision
Record**: one file per decision in `docs/adr/`, named `NNNN-slug.md`, listed in
an index with a status column. A familiar form beats a better one nobody
recognises. Projects without an architecture bind the role elsewhere; see
[adapting.md](adapting.md).

<a id="d2"></a>
### D2 — An accepted decision is immutable

Once accepted, a decision is not edited. It is either **amended** — only with
explicit human authorisation, recorded in the decision itself with the date and
the superseded wording quoted verbatim — or **superseded** by a later decision
that says so and flips the old one's status.

**Why.** A decision log that can be edited is a current-opinion file. Its value
is showing what was believed at a point in time and what changed since; an edit
destroys exactly that, invisibly. Quoting the superseded wording is what lets a
reader tell reconsideration from forgetting.

**Check:** `automated` — the status inside each decision matches the status the
index claims for it, and every decision file appears in the index.

<a id="d3"></a>
### D3 — Accepted means decided, not built

A decision's status says whether the choice is binding, never whether the thing
exists. Track implementation separately, on an explicit scale with named
stages.

**Why.** Without a separate scale the decision log becomes a progress report by
accident, and a flattering one: a project can accumulate an impressive set of
accepted decisions and have built none of them. The failure is hard to see from
the inside, because every individual document is accurate.

**Check:** `manual`

**Binding.** Publish the scale next to the state artefact — for example
*planned · designed · draft · complete · live* — and say which stage an
accepted decision alone confers.

<a id="d4"></a>
### D4 — Do not implement ahead of a decision

Read before you write: the state artefact, and the decision that owns the area
you are about to change. If the task would settle in code something a
still-open decision owns, write the decision first. Do not invent structures no
decision covers.

**Why.** [D1](#d1) is written for the person deciding. This is the same rule at
the moment of acting, which is where it actually gets broken. An agent that
meets an undecided question mid-task resolves it in the implementation, and a
choice embodied in code is much harder to see, and much harder to reverse, than
one written down. It does not announce itself as a decision at all.

**Check:** `manual`

---

## C — Documentation

<a id="c1"></a>
### C1 — One artefact answers one question

Each document answers exactly one question, and the documents are separated by
how often they change. The usual split: how we work here (rarely) · what was
decided and why (append-only) · where we stand (often) · why the way we work
looks like this (occasionally) · what is to be done (continuously).

**Why.** Two documents that answer the same question will disagree eventually,
and the agent believes whichever it read last — a function of file ordering,
not of correctness. Splitting by change frequency is what makes the boundary
hold: a fast-moving fact in a slow-moving document is the form the drift always
takes.

**Check:** `manual`

<a id="c2"></a>
### C2 — One authority per fact

Every fact has exactly one place where it is defined. Everywhere else refers to
that place rather than restating it.

**Why.** A fact duplicated away from its authority degrades into an assertion,
because the copy does not announce that it is a copy. This applies to values in
data and just as exactly to process rules — with the extra difficulty that
copies of a rule are invisible from inside the document being changed, so
"where else does this live?" is a question nobody thinks to ask.

**Check:** `automated` in part — see [C5](#c5) and [M2](#m2).

<a id="c3"></a>
### C3 — The documentation is self-supporting

Assume a session **begins** with this repository and nothing else: no earlier
conversation, no recollection of why a rule exists. Everything needed to do the
work correctly is written down.

This is a rule about the seam between sessions, not about working memory.
Within a session an agent accumulates context and should keep it — see
[S1](#s1). What C3 forbids is letting that context become load-bearing without
ever being written down. Instructions that tell the agent to fetch something
external are not self-supporting either: the fetch can fail, be blocked or be
skipped, and it costs something on every task.

**Why.** This is the premise the rest of the method rests on. Where it does not
hold, the repository relies on somebody happening to remember — and whether
that is one maintainer or a team, the person who remembers is not always the
person in the session.

**Check:** `manual`, with one automated part: an artefact still carrying the
placeholders of the template it was copied from was never finished.

<a id="c4"></a>
### C4 — Documentation changes in the same commit

When behaviour changes, the documents that describe it change in the same
commit. Stale documentation is a defect, not untidiness.

**Why.** It is the most expensive kind of error, because it does not fail: it
silently misinforms every future session, and each then produces work
consistent with something untrue. Deferring the update to a follow-up leaves
the window open for exactly as long as the backlog is.

**Check:** `manual`

<a id="c5"></a>
### C5 — References resolve

A reference to another document, section or artefact points at something that
exists. When the authority for a fact moves, every reference to it moves in the
same change.

**Why.** [C2](#c2) puts every fact in one place and tells everything else to
refer to it, which turns every reference into load-bearing structure. A dead
link is that structure failing silently: the reader is sent to the authority
and arrives nowhere, and the fact reverts to whatever the referring document
happened to say about it. This is the part of C2 a command can decide.

**Binding.** Ordinary inline links — `[text](path/to/doc.md#anchor)` — are what
the check reads, so they are what it can decide. The rule does **not** require
them. A wiki-style `[[doc]]` costs a fraction of the characters, which is the
difference between a corpus an agent can hold and one it cannot when the
documents number in the hundreds; a project whose documents are read far more
often than they are checked is trading correctly.

What such a project must not do is assume the check is behind it. Every run
reports how many references it read. **Zero read is the number to look for**: it
means the scan ran, found nothing it understood, and reported success — the
silent no-op [E3](#e3) is about, arriving as a green result. Where the syntax is
not the ordinary one, the resolving is yours to do, and saying so is cheaper
than a check that quietly decides nothing.

**Check:** `automated` — relative links and anchors resolve, in the three
ordinary forms: `[text](dest)` with an optional title, `[text](<dest>)`, and the
reference definition `[label]: dest`. Other link syntaxes are not read, and the
count of references read is printed so that is visible rather than assumed.
External links are not fetched: whether a URL is reachable is a network
question, and a check that fails for the wrong reason gets ignored for the right
ones.

---

## M — Method memory

<a id="m1"></a>
### M1 — Keep a method log

Maintain a document recording **why the way of working looks the way it does**:
corrections and their reasoning, workflow experiments and their outcome,
mistakes that produced a rule. Not a progress log, not a decision log. The
admission test: *would an agent with no memory of that session decide worse
without this?*

**Why.** A rule whose origin is lost gets dropped by the next session that
finds it inconvenient — in good faith, because from the outside an unexplained
rule is indistinguishable from an arbitrary one. The decision log records what
was decided about the work; nothing otherwise records what was learned about
the working.

**Check:** `manual`

<a id="m2"></a>
### M2 — A withdrawn rule leaves a check behind

When a rule is changed or withdrawn, do not only update the place where it was
defined. Leave behind a check that fails wherever any document still teaches
the old version.

**Why.** Changing a rule in the two places you remember and leaving it wrong in
the three you forgot is the ordinary outcome, not a lapse in care: the copies
are invisible from inside the document being edited. The documents most often
missed are not the decision records but the *procedural* files, the ones an
agent reads immediately before acting.

**Check:** `automated` — a list of withdrawn patterns, each with what replaced
it, scanned across all documents. Quoted text must be exempt, or a decision
record cannot quote the wording it superseded.

---

## E — Enforcement

<a id="e1"></a>
### E1 — Prefer enforceable formulations

When a rule can be written in a form a command could decide, write it that way.
What can be a check, is a check.

**Why.** Nobody re-reads a long instruction file in the middle of a task, and a
rule that is only ever read at onboarding decays into folklore within a few
sessions. A rule that fails a command is re-taught at the moment someone breaks
it, without anyone having to remember it exists.

**Check:** `manual`

<a id="e2"></a>
### E2 — A check asserts presence, not quality

A check decides whether something is there, or whether something forbidden
occurs. It does not decide whether the thing is any good. Judgement stays a
review responsibility.

**Why.** A check that pretends to measure quality produces a number people
optimise against, and the number improves while the thing it stands for does
not. Worse, it licenses the belief that review is no longer needed. Keeping the
boundary explicit is what lets a check be trusted absolutely within its scope.

**Check:** `n/a`

<a id="e3"></a>
### E3 — A new check is counter-tested before it is trusted

Before relying on a check, feed it deliberate violations and confirm it fails
on each — and confirm it passes on the legitimate cases nearest to them.

**Why.** A check that silently matches nothing is worse than no check: it
reports success and is believed. The failure is quiet — a pattern that never
fires, a filter that excludes everything — and only ever caught by trying to
break it. False alarms are the other half: they teach people to distrust the
checks, and the distrust generalises to the ones that are right.

**Check:** `manual`

---

## H — Honesty

<a id="h1"></a>
### H1 — Report outcomes faithfully

Say what actually happened, including failures, partial results and skipped
steps. If a check was not run, say so rather than describing what it would have
shown.

**Why.** A report that rounds a partial result up to a complete one does not
merely mislead once; it puts a false fact into the repository, where
[C3](#c3) guarantees it will be believed by sessions that cannot check it.

**Check:** `manual`

<a id="h2"></a>
### H2 — Hand work back only at high confidence

Return a task only when you believe it is correct, complete and safe. Below
that bar, keep working or name the specific uncertainty — what exactly is
unverified and what would settle it, not a general disclaimer.

**Why.** A review boundary is only as good as what arrives at it. Work arriving
with unstated doubt spends the reviewer's attention on rediscovering the doubt
rather than judging the decision, and the bottleneck the gate creates buys
nothing.

**Check:** `manual`

<a id="h3"></a>
### H3 — Verify by exercising it, not by a green build

For anything with observable behaviour, verify by making it behave: run it,
look at the output, use it the way it will be used.

**Why.** Tests and builds assert the properties someone thought to assert. The
class of defect that survives them is precisely the class nobody anticipated,
which is the class that reaches users.

**Check:** `manual`

<a id="h4"></a>
### H4 — External facts come from primary sources

Capabilities, limits, terms, deadlines, interface details: read them from the
authoritative source and cite it. Do not assert them from memory.

**Why.** A model's recollection of an external fact is fluent, specific and
sometimes wrong, and nothing about the phrasing distinguishes the wrong ones.
Once written down the claim is indistinguishable from a verified one. A
citation also lets a later reader re-check it cheaply when the world moves.

**Check:** `manual`

<a id="h5"></a>
### H5 — If a claim is checkable by a command, run the command first

Do not write "the tests pass" and then verify. Run it, then write what it
returned.

**Why.** A claim written first becomes the hypothesis the verification is read
against, and a result that half-agrees gets read as agreement. The cheapest
rule here to follow and one of the most frequently broken, because writing the
expected result feels like reporting it.

**Check:** `manual`

---

## L — Language

<a id="l1"></a>
### L1 — Artefacts in one language; conversation in the speaker's

Two separate decisions, and conflating them is the mistake this rule prevents.

**Everything committed** — code, comments, documents, decisions, commit
messages, tickets, review descriptions — is written in **one** language and one
spelling standard. Write down which, and enforce it with a check. English is
the usual choice because it is what the tooling, the search results and most
future collaborators share; a default, not a requirement.

**Conversation with a person happens in that person's own language.** Nothing
is gained by making someone discuss their own project in a second language, and
something is lost: people are more precise, and more willing to push back, in
the language they think in. Where a team spans languages, each person speaks
theirs and the artefacts stay in the one everybody reads.

User-facing output belongs to neither category. It is a product decision,
handled through localisation, never by writing project documents in the
product's language.

**Why.** A repository written largely by agents drifts between variants far
faster than one written by a person, because nothing carries a habit across the
seam. The result reads as though several people wrote it carelessly — and the
doubt that produces is not misplaced, since the same absent convention shows up
in the substance. The conversation half matters for the opposite reason: a
second language makes people terser and less willing to argue, which is the
wrong trade at a review boundary.

**Check:** `automated` for the artefacts — a spelling scan over prose,
excluding fenced blocks, code spans, link targets and any file that states the
rule and must therefore contain examples of what it forbids. The conversation
half is `n/a`: nothing about it is committed.

<a id="l2"></a>
### L2 — Quoted source material is never translated

Quote in the original language and leave it unmodified. If a reader needs it in
another language, put the translation beside the quotation, never in place of
it.

**Why.** A translated quotation is a paraphrase wearing quotation marks, and
the reader has no way to tell. Source material kept as a record loses its
entire value as evidence the moment it is edited into the repository's own
voice.

**Check:** `manual`

---

## S — Sessions

<a id="s1"></a>
### S1 — Session rituals are procedures, not habits

Starting, resuming and ending a session are written-down procedures that
produce the same result every time. Three seams matter:

- **Bring-up** reads the current state fresh and produces an orientation
  briefing. It ends with a **question**, never an action.
- **The seam after a merged change** keeps the session's accumulated context
  and re-verifies the *external* state: the trunk, open changes, the task's
  current scope. Context is an asset; the shared world is what moved while you
  worked.
- **Wind-down** leaves the repository at an honest stopping point: everything
  unfinished is parked visibly and handed off.

**Why.** Improvised session boundaries fail in a consistent way: something is
skipped, and the skip is unnoticed because there was no list to skip from. The
bring-up rule exists because an agent that opens a session by starting work has
chosen the session's direction on the human's behalf.

**Check:** `manual`

<a id="s2"></a>
### S2 — Gated autonomy

Within a session the housekeeping runs autonomously — syncing, tidying,
bringing living documents current. Starting the *next piece of work* does not.
Begin it only if it is genuinely decision-free; if it needs a judgement from
[G2](#g2), is too large to start without agreeing its shape, or is ambiguous,
stop and ask.

**Why.** Autonomy is not one setting. Actions that are cheap to reverse and
actions that commit direction have very different costs when they are wrong,
and treating them alike means choosing between an agent that asks about
everything and one that asks about nothing.

**Check:** `manual`

<a id="s3"></a>
### S3 — Keep a state artefact

One artefact answers *where do we stand*. Wind-down brings it current; bring-up
reads it before anything else.

**Why.** Four rules already read it and none of them requires it to exist.
[D3](#d3) publishes the decided-versus-built gap beside it, [D4](#d4) makes it
the first thing read before writing, [C1](#c1) names *where we stand* among the
questions an artefact must answer, and [S1](#s1)'s bring-up reads it fresh. A
session arriving at a repository without one reconstructs the position from
commits and open branches — and a reconstruction is exactly the plausible guess
the premise says an agent will make without flagging that it guessed.

**Binding.** Usually one file — `STATUS.md`, or a section of the
operating-rules artefact where a separate file would be ceremony. What matters
is that it is the same place every time, because a position that moves is a
position nobody reads.

Name a **single** clearest next step rather than everything outstanding. A list
of everything outstanding is a roadmap, and a roadmap answers a different
question ([C1](#c1)); an agent handed several candidates chooses among them on
the decider's behalf, which is [G2](#g2) reached through a document rather than
broken by an agent. This is a binding and not the rule because it is how the
artefact is written well, not a condition for having one —
[adapting.md](adapting.md) is where it earns its keep, in a project long enough
for the position to be the handoff.

**Check:** `automated` in part — `artefacts` fails when the role is bound to a
file that is not there, and `accounting` fails when it is left unbound with no
adaptation saying why. Neither can tell whether the artefact is *current*. That
is [E2](#e2), and it stays a review question.

---

## W — Work

<a id="w1"></a>
### W1 — A task carries its own definition of done

A task states, before it starts, what would make it finished: the problem or
goal and why it exists, the scope, and either the decisions to be made or
testable acceptance criteria. It is done when those criteria have been
**verified**, not when the work feels complete. Agents write tasks too, and are
held to the same bar.

**Why.** [H2](#h2) says hand work back only at high confidence and
[H3](#h3) says verify by exercising it. Neither says confident *of what*.
Without criteria fixed in advance, "done" is settled afterwards by whoever is
tired — and an agent will supply a plausible standard that the work it has just
produced happens to meet.

**Check:** `manual`

---

## P — What never enters the repository

<a id="p1"></a>
### P1 — Real secrets and personal data never enter the repository

No credential, token, key or personal datum is ever committed. Not in code, not
in fixtures, tests, logs, examples or documentation. Use fake values, and make
them obviously fake.

**Why.** Almost every other rule here protects something recoverable: a bad
decision can be superseded, a stale document corrected, a wrong merge reverted.
This one is different. A pushed secret is compromised the moment it exists in
the history, and reverting the commit does not change that. In a method whose
premise is that an agent writes with a person's own credentials, this is the
failure class with no undo.

**Check:** `automated` — secret scanning on the trunk, and a scan of fixtures
and examples for values shaped like real credentials.

---

## A — Adaptation

<a id="a1"></a>
### A1 — This is a starting point, not a doctrine

The catalogue is meant to be taken as a basis and reshaped. A rule that does
not fit your project should be narrowed, replaced or dropped. A project that
follows every rule unchanged has probably not read them against its own
circumstances.

**Why.** A rule applied where its reasoning does not hold is worse than no
rule: it costs the same and buys nothing, and the wasted effort teaches
everyone that the method is bureaucracy.

**Check:** `n/a`

<a id="a2"></a>
### A2 — Record what you changed

When you narrow, replace or drop a rule, write down which rule, what you
changed, why, and when.

**Why.** The honest reading of an unexplained gap is that it was an oversight,
so the next session helpfully restores the rule you deliberately removed. A
recorded adaptation is a decision; an unrecorded one is a bug that regenerates.

**Check:** `automated` — every rule is either in force or listed as an
adaptation with a reason and a date; nothing is silently absent.

<a id="a3"></a>
### A3 — Scale ceremony to the stage

Match the weight of the process to what the project actually is, and revisit
that as it changes. Record deferred concerns so they are not lost, but do not
build for a scale you do not have.

**Why.** Two failure modes, mirror images. Building without deciding produces a
system nobody can explain. Deciding without building produces an impressive
body of documentation and no working thing — the more seductive failure,
because every artefact it produces looks like progress. A decision phase with
no end condition is the usual way in.

**Check:** `manual`
