# Catalogue changes

What changed between catalogue versions, and what an adopter has to do about
it. The check reports a version difference but cannot say which rules moved;
this file is the answer to that question.

Only changes that reach an adopter are listed. Wording, examples and internal
comments are not.

A rule identifier is **never** reused, and no version renumbers one. Where a
rule is withdrawn, [`withdrawn.md`](withdrawn.md) carries the entry and a check
fails on documents still teaching it — this file does not replace that
mechanism.

## Unreleased

The catalogue is unchanged at **0.3**. Every entry here is a change to
[the coherence check](../checks/check-method.mjs), not to a rule — no
identifier moved and no rule was added or withdrawn. They are listed because a
check that starts deciding differently changes what your green run means, and
that is the same thing an adopter needs to be told about.

### May change your result

**The `state` role is accounted for by [S3](rules.md#s3), not
[D3](rules.md#d3).** S3 is the rule that requires the state artefact; D3
publishes the decided-versus-built gap beside it. The check asked for D3, which
went both ways: a project that unbound `state` and adapted **S3** — the correct
recording — was told S3 was still in force, and a project that adapted **D3**
passed with S3's only automated part switched off. If you unbound `state` and
explained it under D3, that declaration is now a finding: change the adaptation
to name S3, keeping your reason and date.

**A `method.json` that parses as `null`, `false`, `0`, `""`, a number or a
string is a finding.** All of those are valid JSON and all of them used to end
the run with `OK · the declaration matches the project`, because the
declaration, artefact, authority, adaptation and accounting checks were skipped
together. A truthy primitive crashed instead. Nothing legitimate is affected: a
declaration has always had to be an object.

## 0.3

Thirty-two rules in eleven clusters. One rule added. None withdrawn, none
renumbered — every identifier you already refer to still means what it meant.

### New rule

**[S3](rules.md#s3) — Keep a state artefact.** The method names four roles and
required three of them. [D1](rules.md#d1) is why a project has `decisions`;
[M1](rules.md#m1) is why it has a `method-log`; [C3](rules.md#c3) is why it has
operating rules an agent can act on. `state` was read by four rules and required
by none — [D3](rules.md#d3) publishes the decided-versus-built gap beside it,
[D4](rules.md#d4) makes it the first thing read before writing,
[C1](rules.md#c1) names *where we stand* among the questions an artefact
answers, and [S1](rules.md#s1)'s bring-up reads it fresh. A project could
satisfy the entire catalogue and leave all four pointing at nothing.

The rule requires the artefact and stops there. Naming a **single** next step
rather than a list is in its *Binding*, which is a suggestion — worth doing, and
not a condition for having a state artefact at all. Nothing about how well you
write it is normative.

**What you have to do.** If you already bind `state` to a status artefact,
nothing: you were following S3 before it was written. If you left the role
unbound, the `accounting` check already required an adaptation explaining why,
so your declaration stays coherent as it is — S3 is simply the rule that
adaptation is now against.

**No check changed.** S3 is `automated` in part through machinery that already
existed: `artefacts` fails when a bound role names a file that is not there, and
`accounting` fails when a role is unbound with nothing explaining it. Whether
the artefact is *current* stays a review question under [E2](rules.md#e2).

**Correction, written later.** That last paragraph was true of the machinery and
false of the code that shipped with it: `accounting` still named D3 as the rule
behind the `state` role, so S3's automated part never ran under its own name.
Fixed under [Unreleased](#unreleased), where it appears as a change that can
alter your result.

## 0.2

Thirty-one rules in eleven clusters. One rule added. None withdrawn, none
renumbered — every identifier you already refer to still means what it meant.

### New rule

**[G3](rules.md#g3) — The gate reviews direction and coherence, not lines.**
The catalogue referred to "review" across six rules and defined it nowhere:
[G1](rules.md#g1) said the boundary exists, [G2](rules.md#g2) said which
questions reach it, and nothing said what happens at it. G3 says the person
decides whether the change moves towards the goal and whether it fits what
already exists — and that line-level correctness is explicitly *not* theirs,
because [H3](rules.md#h3) and [E1](rules.md#e1) carry that.

Nothing you already declared becomes incoherent, and no check changes: G3 is
`manual` and necessarily so. What it may change is how you review. If your
operating rules describe review as reading everything, they now disagree with
the catalogue. In a team, decide whether the two questions sit with one person
or two, and write down which — [`adapting.md`](adapting.md) says why leaving it
unsaid means neither reviewer asks the other question.

### May change your result

**An adaptation of kind `narrowed` no longer switches its check off.** The check
previously asked only whether an adaptation existed, so a rule declared
`narrowed` — a claim that it still applies, with a smaller scope — stopped being
verified entirely. `dropped`, `replaced` and `deferred` still switch the check
off. If you narrowed a rule and relied on the silence, you will now see the
findings it was hiding. Where the narrowing genuinely puts documents outside the
rule, name them in `ignore`.

**The spelling scan no longer exempts the operating-rules artefact.** It was
skipped as a whole file, on the reasoning that a document stating
[L1](rules.md#l1) must contain the spellings it forbids. That exemption belongs
to the mention, not the file. Put a named spelling in a code span or a
blockquote; neither is scanned.

### Worth re-reading

**[G1](rules.md#g1) says what trunk protection proves, and what it does not.**
The rule is unchanged. Its **Check** is now `automated` in part: where the
required approving reviews are zero — which the rule's own *Binding* recommends
wherever one account authors and merges — the setting proves a change arrived
through a pull request, not that anyone read it.

### New, and optional

**`authorities` in `method.json`.** Three pointers to systems outside the
repository: `gate`, `tasks`, `secrets`. Nothing is fetched and nothing is
required; a declaration without the block stays coherent.
[`adapting.md`](adapting.md) has the format.

### Fixes

- A `method.json` written with a byte-order mark parses instead of being
  reported as invalid JSON.
- A catalogue defining the same rule identifier twice is refused rather than
  silently keeping the last definition.
- Every check an adaptation switched off is named in the report, in the section
  `--quiet` cannot suppress.

### Plugin

The `decision-record` procedure sets `Accepted` on the branch, before the merge,
rather than in a second change afterwards. The old order left the trunk stating
`Proposed` about a decision that had in fact been accepted.

## 0.1

First version.
