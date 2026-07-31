# Changes

What changed, and what an adopter has to do about it. The check reports a
version difference but cannot say which rules moved; this file is the answer to
that question.

Only changes that reach an adopter are listed. Wording, examples and internal
comments are not.

**Two things are versioned here, and they are separate sequences.** A bare
number — `0.3`, `0.2` — is the **catalogue**, the version in
[`VERSION`](VERSION) and the one your `method.json` pins to. A heading that says
*checks* is the **tools**, versioned in `package.json`. They are written down
together because a check that starts deciding differently changes what your
green run means, exactly as a changed rule does; splitting them across two files
would mean two places to look for one answer.
[`README.md`](README.md#what-each-version-number-means) says which number
carries which claim.

A rule identifier is **never** reused, and no version renumbers one. Where a
rule is withdrawn, [`withdrawn.md`](withdrawn.md) carries the entry and a check
fails on documents still teaching it — this file does not replace that
mechanism.

## 0.4

Thirty-two rules in eleven clusters. None added, none withdrawn, none
renumbered — every identifier you already refer to still means what it meant.
One rule gained a *Binding*.

### Plugin

**The plugin is `0.4.0`, and carries an explicit version again.** For part of
0.3 it carried none, so the commit SHA decided and every commit reached
installed users. Now it carries the release number, and you get an update when
a release is cut.

That is the strategy that failed once — two procedures changed under a version
that stayed at `0.2.0`, and everyone who had installed the plugin went on
running the replaced ones. It is safe to return to it because the coupling is no
longer a habit: `checks/plugin-version.mjs` fails when anything shipped inside
the plugin changed since the last release tag and the version did not, and when
the two manifests declaring it disagree.

**What you have to do.** Run `/plugin update`. If you installed during the
period with no version, you already have the current procedures and the update
is a no-op.

### Worth re-reading

**[C5](rules.md#c5) says which link syntax it reads, and stops implying you owe
it one.** The rule is unchanged: a reference points at something that exists.
What was never said is that its automated part reads ordinary inline links and
nothing else — so a project writing wiki-style `[[doc]]` links was following C5
perfectly and getting a green `links` result from a scan that had understood
none of them.

The new *Binding* says the ordinary form is what the check can decide, and that
the rule does not require it. `[[doc]]` costs a fraction of the characters, and
where documents number in the hundreds that is the difference between a corpus
an agent can hold and one it cannot. A project reading its documents far more
often than it checks them is trading correctly.

**What you have to do.** Nothing, if you write ordinary links. If you write any
other syntax, look for the new line in the report — see below — and know that
resolving those references is yours.

### Now named in the report

**How many references the link scan actually read.** Every run says so, and
**zero** is the number to look for: the scan ran, understood nothing, and
reported success. That is the silent no-op [E3](rules.md#e3) exists to prevent,
arriving as a green result — and it was reachable in one step from a legitimate
choice about link syntax.

## Checks 0.3.0

Released against catalogue 0.3. Every entry here is a change to
[the coherence check](../checks/check-method.mjs), not to a rule — no
identifier moved and no rule was added or withdrawn.

This is the first release in which the two numbers move apart. That they read
alike is history, not coupling: the tools were last versioned alongside
catalogue 0.2, and this is their next release. They have diverged already —
the catalogue is 0.4 above.

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

**An artefact bound outside the project is a finding.** `"../rules.md"` and an
absolute path both resolved and both passed an existence test, so the check
certified coherence for a project whose operating rules the repository does not
contain — the arrangement [C3](rules.md#c3) exists to rule out. Nothing is read
outside the root either before or after this change; only the binding is
rejected.

**A role that names one document is a finding when bound to a directory.**
`operating-rules`, `state` and `method-log` each name a single file.
`decisions` may be a directory or a file, because [D1](rules.md#d1)'s *Binding*
describes a directory of records and a project small enough to keep them in one
file is following the same rule.

**A role bound to an empty file is a finding.** Zero bytes passes an existence
test and supports what a missing file supports — worse than an unbound role,
because an unbound role has to be accounted for by an adaptation and this does
not. [E2](rules.md#e2) forbids judging quality and the line falls on the other
side of this: whether the artefact says anything *useful* is a review question
and stays one; whether it says anything at all is not a judgement. If you are
scaffolding a project, either write one line or leave the role unbound with an
adaptation, which is the honest form of the same state.

**The link scan stops firing on six legitimate forms, and starts seeing two it
missed.** It read `https:`, `mailto:` and `#!` as external and everything else
as a path, so `tel:`, `file:`, `ftp:`, `obsidian://`, `vscode://` and `slack://`
were all reported as broken links. Percent-encoded paths and angle-bracketed
destinations were reported broken against files that were there. In the other
direction, a link carrying a `"title"` was invisible to the scan entirely, and
reference definitions were never read at all. If you had worked around any of
this, the workaround is no longer needed; if a document has a reference
definition pointing nowhere, you will now see it.

**A `Status` heading with the value on the next line is read.** The status was
taken only from the line carrying the label, so a project using the Nygard
record — the most widespread decision-record format there is, and the one
[D1](rules.md#d1)'s *Binding* points at — had D2's only automated part decide
nothing, on every record, while the run stayed green. If your records are in
that format and one of them disagrees with the index, that is now a finding. It
was always a defect; nothing was looking.

**Two decisions sharing a number is a finding, in the files and in the index.**
Two records numbered 0001 that both agreed with the index passed in silence,
and two index rows for one number kept the last one read. A number is how the
rest of the project refers to a decision, so it cannot name two things.

**An incomplete adaptation no longer switches its rule's check off.** An entry
missing its reason or its date is already a finding, and it used to suspend the
check on the way past — the strongest possible reading of a line the check had
just said it could not read. The rule's check now runs until the entry is
complete, and the listing says which of the two happened. If you have a
half-written adaptation, expect to see the findings it was suppressing.

**A `narrowed` manual rule counts as in force again.** The figure `N rule(s) in
force are marked manual` was built from whether an adaptation existed at all,
so declaring a rule `narrowed` — a claim that it still applies — took it out of
the count while the listing above went on saying the check still runs. That
number is the one a reader uses to judge how much a green run is worth, and it
was undermined by the one adaptation kind this project built to prevent exactly
that.

**Heading slugs accept two more shapes.** A heading that is itself a link
contributes its text, not its destination. A slug with a leading or trailing
hyphen left by stripped punctuation is accepted alongside the trimmed form,
because platforms disagree about which one they generate.

**A withdrawn-rule pattern with a nested quantifier is refused.** `(x+)+`,
`(x*)*`, `(x+)*` and their relatives can take exponential time on input that
nearly matches, and the pattern is applied to every paragraph of every document
in the project — so such an entry does not fail, it hangs, with nothing saying
which pattern is responsible. Exit 2 with the entry named. The catalogue has
withdrawn no rules, so nothing existing is affected; the right moment for this
is before the first entry, which is now.
[`withdrawn.md`](withdrawn.md) states the requirement under *Format*.

**Two project paths on one command line are refused.** The last one won, in
silence: one project was checked, nothing was said about the other, and a CI
line with a stray path in it reported green about somewhere nobody looked. Exit
2, like every other unusable command line.

**A copy of the method repository inside the project is not scanned.** The
documented install command cloned into the project being checked, and the
clone's directory name is in nobody's ignore list — so the first run an adopter
made reported findings by the hundred about files that were not theirs. On a
rebuilt adopter project: 121 findings before, none after, with the skipped
directory named in the report. The copy is recognised by holding both
`method/rules.md` and `checks/check-method.mjs`, never by its name. The command
now clones beside the project, in all three documents that state it, and a
command checks that they still agree.

**A malformed `"language"` block is a finding.** It was read as
`language.spelling` and never checked, so `"language": "british"` — the obvious
mistake — produced the note saying no regime was declared, and L1 went
unverified with nothing saying the declaration had been misread rather than left
out.

### New, and optional

**`"language": { "allow": ["…"] }`.** Words the spelling scan must not report.
The scan compares against a word list, so a proper noun or a foreign word that
happens to be an American spelling of something fires — `Liter` reads as a
misspelt `litre` — and the only escape was `ignore`, which puts a whole document
outside every scan to spare one word. The exemption covers the words it names
and nothing else, and every run names them in the blind-spot section: an
exemption nobody can see is a hole. A declaration without the field is
unaffected.

### Now named in the report

**Control characters out of `method.json` are shown rather than obeyed.** Values
were printed as they came, so a string carrying ANSI sequences acted on the
terminal — and because the authorities block prints after the findings, a
declaration could scroll real findings off the screen. The exit code was never
affected, so CI could not be fooled; a person reading the run could be, and
reading the run is what `--lint` is for. Everything from outside now passes
through one filter on the way out.

**How many documents the run read, and what it never looked at.** A run over a
directory with nothing in it printed `OK · the documents scan clean` with
nothing saying it had read nothing — the most confident thing this tool says,
about no evidence at all. Every run now opens its blind-spot section with
`scanned N markdown file(s)`, names the directories skipped by default, and
names any directory it could not read. The nine skipped names are listed in
[`checks/README.md`](../checks/README.md); two of them, `vendor` and
`.obsidian`, can hold real documents.

**Which rule went unchecked when `decisions` is a single file.** The report said
the index check was skipped; it now names D2, so the blind spot is one a reader
can look up.

**A status the index invents, rather than a row that is missing.** An
unrecognised status was dropped, so the decision looked absent from an index it
was listed in and the finding named the wrong cause.

### Fixes with no effect on an adopter

**The counter-test baseline reads the catalogue's version instead of stating
it.** It stated `0.2`. From the moment the catalogue moved to 0.3, every case in
the suite emitted the version note — the exact noise the one dedicated case
exists to isolate, and that case could no longer be told apart from the rest.
Nothing an adopter runs was affected; what was affected is the argument for
trusting any of it.

### Corrected documentation

**[`withdrawn.md`](withdrawn.md) said a pattern is matched against a single
line.** It has been matched against a whole paragraph with its line breaks
folded to spaces since 0.2, which is the only way a phrase in wrapped prose can
be caught at all. Anybody who wrote a pattern from that sentence wrote it for
the wrong input.

**The agent manual now carries S3.** It referred to the state artefact in five
places and never asked for one — which is precisely the hole S3 was written to
close, left open in the layer an agent actually reads. If you copied the manual
during 0.3, add to it: the state artefact is always the same place, bring-up
reads it before anything else, wind-down brings it current, and it names a
single next step rather than everything outstanding.
[`agent-manual/README.md`](../agent-manual/README.md) now says that a change to
the catalogue is read against that directory in the same change, so the gap has
something holding it shut.

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
Fixed under [checks 0.3.0](#checks-030), where it appears as a change that can
alter your result. The same version shipped a second gap: the agent manual went
on *referring* to the state artefact without ever asking for one, which is the
rule S3 replaced. Both are closed there too.

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
