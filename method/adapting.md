# Adapting the method

[A1](rules.md#a1) says the catalogue is a starting point. This is what makes
that usable: which rules survive contact with which kind of project, which need
reshaping, and what tends to replace them. Nothing here is prescriptive — it is
the accumulated shape of the trade-offs, not a decision tree.

Six archetypes first, then the `method.json` vocabulary for writing an
adaptation down. The second half is optional: step 1 of
[adopting](README.md#adopting-it) is a legitimate stopping point.

## Archetypes

### Software with a build chain

Everything applies, and **E — Enforcement** applies hardest: a command chain
runs on every change, so a convention that can be written as a fitness function
should be, and "done" can be pinned to that chain being green.

- Bind `decisions` to `docs/adr/` with Architecture Decision Records. A
  recognisable form beats a bespoke one.
- [G3](rules.md#g3)'s two questions are the ones a **product owner** and a
  **software architect** ask, and saying so is the fastest way to be understood
  here. Use the names. They are the binding, not the rule — a developer
  reviewing alone wears both, and neither has to be a job title.
- [H3](rules.md#h3) needs saying out loud here more than anywhere else,
  precisely because there *is* a green build to hide behind.
- Watch [A3](rules.md#a3). This archetype makes the decision phase feel
  productive, and a decision phase without an end condition is how a project
  accumulates a complete architecture and no running code.

### A knowledge or content project with no code

The method transfers, but the enforcement layer has to be rebuilt elsewhere and
the decision machinery is usually too heavy.

- "Architecture" describes nothing here. Bind `decisions` to `docs/decisions/`,
  or drop [D1](rules.md#d1)'s record-keeping and keep a single canon document
  with dated change notes at the foot. The point is that reversals stay
  visible, and a dated note achieves that at a fraction of the cost.
- [G3](rules.md#g3) survives the move but its names do not. The two questions
  become: does this serve the reader we said we were writing for, and does it
  fit the canon or quietly contradict an entry already in it. The second is
  harder here than in code, because nothing fails when two entries disagree —
  which is the same reason [C2](rules.md#c2) becomes load-bearing below.
- Enforcement moves from commands to **structure**: stability tiers expressed
  in the layout, a status marker per section so completeness is measurable
  below file level, one named file as the authority for each contested term.
- Rules the code archetypes never need appear here — how to edit a file another
  application holds open, which encoding to write, what to verify after a
  write. Real rules, and they belong in your project layer.
- [C2](rules.md#c2) becomes load-bearing. In a body of prose the same fact
  restated in four places is the normal state, and nothing fails when the four
  disagree.

### A small project with a high correctness bar

Few decisions, but the risk is not complexity — it is a wrong value reaching
someone who acts on it.

- [C2](rules.md#c2) first. Every fact a reader will act on gets exactly one
  definition. A check that fails when such a value appears anywhere outside its
  authority is worth more than any amount of review.
- [H3](rules.md#h3) means looking at the real rendered result, not at a passing
  build.
- Keep the decision set explicitly short and say why. An open-ended list
  invites decisions that exist only to be recorded.
- Consider a rule of your own: no unsourced fact enters the repository. An
  empty field is recoverable; a plausible invented one is not.

### A long-running effort across many sessions

The distinguishing problem is continuity across dozens of cold starts.

- **S — Sessions** and **M — Method memory** carry the most weight, and they
  are the two clusters most often skipped as overhead. The method log is what
  stops the same correction being made four times.
- The `state` artefact becomes the handoff. It needs a single named next step,
  not a roadmap — the roadmap answers a different question.
- [D3](rules.md#d3) matters more the longer the project runs, because the gap
  between what has been decided and what exists widens and stops being visible.
- Consider a calendar-driven maintenance list. Anything whose trigger is the
  passage of time rather than a change will otherwise never happen: an agent
  has no sense of how long something has been sitting.

### A team rather than one maintainer

Several rules change shape when more than one person is involved.

- [G1](rules.md#g1) gets easier and stronger: the ordinary approving-review
  requirement already provides the boundary. The zero-approvals binding is for
  the solo case and should not be carried over.
- [M1](rules.md#m1) stops being optional bookkeeping. With one maintainer the
  method log competes with memory; with several it is the only place the
  reasons behind a rule are shared, and without it reviewers enforce the same
  rule differently and nobody notices for months.
- [G2](rules.md#g2) needs an addressee. "Ask the human" is unambiguous alone
  and useless in a team — say in the operating rules **which** decisions belong
  to whom, or an agent will ask whoever is nearest, or nobody.
- [G3](rules.md#g3) may split across people, and that is the one place where
  treating it as two questions is right: direction with whoever owns the goal,
  coherence with whoever owns the structure. Say which, for the same reason as
  G2. Left unsaid, both reviewers assume the other asked the other question.
- [C2](rules.md#c2) gets harder to hold. Parallel work is how a fact acquires a
  second authority: two people write the same thing in two places in the same
  week, and neither sees the other. This is where converting the rule into a
  check pays back fastest.

### Solo, early, no audience yet

The failure mode here is process, not chaos.

- Keep **G**, **H** and [C3](rules.md#c3) in full. They are cheap and they are
  what makes the rest possible. [G3](rules.md#g3) is what stops the solo gate
  becoming a formality: reviewing your own agent's work is worth doing when the
  two questions are direction and coherence, and worth almost nothing when it
  degenerates into skimming a diff you already know the shape of.
- Defer most of **D** and **E** honestly, with
  [`"change": "deferred"`](#declaring-an-adaptation) and a named trigger —
  first external user, first collaborator, first thing that would be expensive
  to reverse. Deferred with a trigger is a decision; dropped by silence is not.
- Get something working early. [A3](rules.md#a3) exists for this archetype
  above all: at this stage a complete method with nothing built is the more
  likely failure, not the safer one.

## The four roles

The catalogue talks about artefacts by **role**, never by filename, because the
right filename depends on the project.

| Role | Answers | Changes |
|---|---|---|
| `operating-rules` | How is work done here? | rarely |
| `decisions` | What was decided, and why? | append-only |
| `state` | Where do we stand? | often |
| `method-log` | Why does the way we work look like this? | occasionally |

A fifth question — *what is to be done?* — is normally answered by an issue
tracker rather than a file, and continuously. It is not a role the check knows
about, because it usually lives outside the repository.

Binding a role means naming the file or directory that plays it. That is what
`method.json` records:

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

A role you do not use is bound to `null` and listed as an adaptation with the
reason. That is the difference between a considered omission and a gap.

## Naming what lives outside the repository

`artefacts` covers everything the method needs *in* the repository. Most
projects also depend on something outside it, and three of those are named by
rules: the review boundary itself ([G1](rules.md#g1)), where tasks and their
definitions of done live ([W1](rules.md#w1)), and whatever scans for
credentials ([P1](rules.md#p1)). Nothing in the repository said where any of
them were.

```json
"authorities": {
  "gate": "https://github.com/your-org/your-repo/settings/branches",
  "tasks": "https://github.com/your-org/your-repo/issues",
  "secrets": null
}
```

The whole block is optional; so is any line in it. Declaring one buys two
things. The next session stops guessing where the work is tracked, and where
the check admits it cannot decide a rule locally, it can say *where* to verify
instead of only *that* you should.

**Nothing is fetched.** These are addresses a person reads, not instructions an
agent retrieves. That distinction is what keeps them compatible with
[C3](rules.md#c3): an instruction you must go and get before you can work is
not self-supporting, because the fetch can fail, be blocked or be skipped and
costs something on every task. A line in a local file recording where the issue
tracker is costs nothing and fails never.

The cost is honest: a pointer nobody maintains rots, and no check will catch it,
because following it would make the check depend on the network. Declare the
ones you would actually notice going stale.

## Declaring an adaptation

Every rule is in force unless the project says otherwise. To say otherwise:

```json
{
  "rule": "D2",
  "change": "dropped",
  "reason": "No formal decision records; the canon document carries dated change notes instead.",
  "decided": "2026-07-27"
}
```

`change` is one of **`dropped`** (does not apply here at all), **`narrowed`**
(applies to less than it normally would), **`replaced`** (something else serves
the same purpose — say what), or **`deferred`** (it will apply, but not yet —
say what triggers it).

The kind decides what happens to the rule's automated check, so it is not a
label chosen for tone. `dropped`, `replaced` and `deferred` switch the check
off: the rule does not apply, or is met by a mechanism the check knows nothing
about, and findings from it would not be defects. **`narrowed` keeps the check
running**, because a narrowed rule is still in force — only its scope shrank.
Where the narrowing genuinely puts documents outside the rule, name them in
`ignore` rather than reaching for a kind that switches the whole check off.

The check verifies that every rule is accounted for and that every adaptation
carries a reason and a date. Whether the reason is a *good* one stays a review
question; that is [E2](rules.md#e2). The report names every check an adaptation
switched off, so a rule that stopped being verified cannot do so quietly.

## When a rule keeps failing to fit

If you find yourself writing the same adaptation into every project, the rule
is probably in the wrong layer — too domain-specific for a catalogue that
claims to be domain-independent. That is worth
[raising](https://github.com/nanatsusaya/agent-driven-development/discussions).
