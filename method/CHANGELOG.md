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
