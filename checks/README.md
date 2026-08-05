# Checks

Seven of them, and only the first is meant for your project.
[`check-method.mjs`](check-method.mjs) is the coherence check. The other six
are [this repository's own house style](#this-repositorys-own-checks) and know
nothing about an adopting project.

## What the coherence check is asking

**Does this project's declaration match this project?** Not *does this project
obey the catalogue*. [A1](../method/rules.md#a1) expects the rules to be
reshaped, so a narrowed rule with a stated reason is a correct state. What is
not correct is a rule that vanished without anyone deciding it should.

## Running it

```bash
node checks/check-method.mjs <project-path>
```

Zero dependencies, Node 18 or later. It reads
[`method/rules.md`](../method/rules.md) and
[`method/withdrawn.md`](../method/withdrawn.md) as data, reads the project's
`method.json`, and reports where the two disagree.

Ten checks:

| Check | Asks | Rule |
|---|---|---|
| `declaration` | `method.json` exists and is well formed | — |
| `artefacts` | every bound role exists, is inside the project, is a file — `decisions` may be a directory — and is not empty | — |
| `authorities` | declared external systems name a role the method knows | — |
| `adaptations` | each is complete, names a real rule, and gives a reason and a date | [A2](../method/rules.md#a2) |
| `accounting` | an unbound role is explained by an adaptation | [A2](../method/rules.md#a2) |
| `links` | relative links and anchors resolve | [C5](../method/rules.md#c5) |
| `placeholders` | no bound artefact still carries `«template placeholders»` | [C3](../method/rules.md#c3) |
| `decisions` | every decision appears in its index once, with a matching status | [D2](../method/rules.md#d2) |
| `withdrawn` | no document still teaches a rule the catalogue has withdrawn | [M2](../method/rules.md#m2) |
| `language` | one spelling regime, if the project declares one | [L1](../method/rules.md#l1) |

**How `decisions` finds the index.** Three routes, most specific first:
`README.md`; a document named after the directory itself — `ADR/ADR.md` — which
is how a tool that cannot link to a folder makes one reachable; and failing
both, the single document in the directory carrying a status table. If more than
one document carries one, that is a finding rather than a guess, because a
wrongly chosen index makes every later finding a statement about the wrong file.
When the index was found by anything other than its name, **the report says
which document it read and why** — for the same reason.

It used to be found only as `README.md`. That was stricter than the rules it
enforces: [D1](../method/rules.md#d1)'s *Binding* asks for an index with a
status column and [D2](../method/rules.md#d2)'s *Check* for the statuses
agreeing, and neither names a file. A project holding the rule in full could
still fail, and its only way out was to declare D2 `deferred` — which reads as
the rule not being followed, over a file name.

A check tied to a rule runs only while that rule is in force, and the kind of
adaptation decides that. `dropped`, `replaced` and `deferred` switch the check
off — that is [A1](../method/rules.md#a1) working, not a hole. **`narrowed`
does not**: a narrowed rule is still in force, and treating it as though it
were not would let a project declare that it had tightened a rule while
silently ceasing to verify it. Use `ignore` to put paths outside a scan.

Every check an adaptation switched off is named in the report, in the section
that `--quiet` cannot suppress.

## What it deliberately does not do

**It does not judge quality.** A check decides whether something is present or
whether something forbidden occurs; whether the reason for an adaptation is a
*good* reason stays a review question ([E2](../method/rules.md#e2)).

**It does not stay quiet about its blind spots.** The report ends by naming the
rules it could not verify — trunk protection is a hosting-platform setting, and
most rules are marked `manual` and depend on someone reading. A check that
reports "no findings" without saying what it did not look at reads as a clean
bill of health, which is [H1](../method/rules.md#h1) broken by the tool meant to
enforce it.

**It does not follow the network.** External links are not fetched, and neither
is anything under `authorities` — the check reads that a `gate` was declared,
never whether trunk protection is switched on behind it. A check that depends on
the network fails for reasons unrelated to the repository, and a check that
fails for the wrong reason gets ignored for the right ones.

## Linting without adopting

```bash
node checks/check-method.mjs <project-path> --lint --spelling british
```

Makes a missing `method.json` something other than a finding, so that the
checks which read documents — [C5](../method/rules.md#c5),
[M2](../method/rules.md#m2) and [L1](../method/rules.md#l1) — are usable on a
project that has not adopted the method, or does not intend to. What had
nothing to run against is named in the report.

**The flag suppresses nothing.** Where a declaration is present it is read and
checked exactly as it is without the flag, so `--lint` can never report less
than the plain run. It used to say otherwise: the report claimed the
declaration, artefact, adaptation and decision-index checks had not run
whenever the flag was given, including on projects where all four had just run
and produced findings. A report that under-claims costs its reader what one
that over-claims costs — belief in a result that was sound.

Without `--lint`, a missing declaration is still a finding. Lint mode is opt-in;
it is not the check quietly relaxing.

## Known limitations

**The spelling scan cannot tell a foreign word from an American spelling.** It
compares against a word list, so the German word `Liter` reads as a misspelt
`litre`, and any document quoting material in another language will produce
findings. (Both are in code spans here for a reason: this paragraph is a
document stating the rule, so it necessarily contains an example of what the
rule forbids, and the scan caught it. Leave the backticks.) No document is
exempt as a whole — not the operating-rules artefact, not the catalogue — so a
code span or a blockquote is how any document names a spelling without using
it. This
matters because rule [L2](../method/rules.md#l2) requires quoted source material
to stay unmodified — the check would push you to break a rule to satisfy it. For
a handful of words, `"language": { "allow": ["Liter"] }` exempts those words and
nothing else, and every run names them. For whole documents of quoted material,
`ignore` is what that field is for.

**Heading anchors are approximated, deliberately permissively.** Platforms
disagree about which punctuation survives slug generation, so every plausible
slug for a heading is accepted. A link to a heading that does not exist at all
still fails; a link that resolves under one platform's rules and not another's
does not. That trade is on purpose — a false alarm teaches people to distrust
every check ([E3](../method/rules.md#e3)).

**The link scan reads three forms and no more.** `[text](dest)` with an optional
title, `[text](<dest>)`, and the reference definition `[label]: dest`. What it
does not do is match a *use* of a reference against its definition: a
`[text][label]` whose label was never defined renders as literal text and is not
reported. The definitions themselves are checked, which is where a broken path
actually lives. A bare destination containing a space — `[a](my notes/x.md)` —
is not a link under CommonMark at all, so there is nothing there to resolve;
write it `<my notes/x.md>` or percent-encode it and it is checked like any
other.

Any other link syntax — wiki-style `[[doc]]` above all — is not read, and
[C5](../method/rules.md#c5)'s *Binding* says that is a legitimate choice rather
than a violation. So every run reports **how many references it read**, and zero
is the number to look for: it means the scan ran, understood nothing and
reported success. That is the failure this whole page is written around, and it
is one step away from a reasonable decision about link syntax.

**A link inside a blockquote is scanned like any other.** Fenced examples and
code spans are exempt from every scan, and blockquotes are exempt from the
spelling and withdrawn-rule scans, because those decide what a document
*asserts* and a quotation asserts nothing. A link is different: it is a
reference a reader clicks, and a broken one is broken whoever wrote it. The cost
is that quoting a passage whose links have since moved produces findings, and
[L2](../method/rules.md#l2) says the quotation may not be edited to silence
them. Put such documents in `ignore`.

**Link targets are compared as written.** Whether `Docs/x.md` resolves to
`docs/x.md` is the file system's decision, so a link that only differs in case
passes on Windows and macOS and fails on Linux. Nothing here normalises case:
guessing would make the check disagree with the platform it runs on.

**Under an American regime, only the listed word pairs are scanned.** The
general `-ise` direction is not, because the exception list it would need
(`wise`, `precise`, `promise`, `exercise`, and a long tail) is where a wrong
entry becomes a false alarm. The report says so on every American run rather
than leaving the gap to be discovered.

**Nine directory names are never scanned, at any depth.** `.git`,
`node_modules`, `.turbo`, `dist`, `build`, `.next`, `.astro`, `.obsidian` and
`vendor`. For the first seven that is convention. The last two can hold real
documents — `.obsidian` belongs to exactly the archetype
[`adapting.md`](../method/adapting.md) addresses — so a document in either is
not scanned and any broken link in it is not reported. Every run says how many
directories it skipped and names them, and how many documents it read; there is
no way to switch the list off, and none will be added until somebody needs one.

**Symlinked directories are never walked.** The directory scan reads real
directories only, so documents reachable only through a symlink are not
scanned. A directory that cannot be read at all is named in the report.

**Nothing verifies that a withdrawn rule was accompanied by its entry.**
[`CLAUDE.md`](../CLAUDE.md) requires the two to land in the same change and no
check enforces the coupling. It becomes enforceable the first time a rule is
actually withdrawn, because until then there is nothing to check against.

## Options

| | |
|---|---|
| `<project-path>` | defaults to the working directory |
| `--catalogue <path>` | use a different catalogue; defaults to `../method` relative to the script |
| `--lint` | do not require a `method.json`; suppresses nothing else |
| `--spelling <regime>` | name the regime a declaration would otherwise give: `british` or `american` |
| `--quiet` | omit the in-force listing. The blind-spot section is always printed |

Exit codes: `0` coherent · `1` findings · `2` the catalogue itself could not be
read.

## This repository's own checks

None of them is part of the method. They enforce conventions this repository
holds itself to, and an adopting project is free to ignore all six.

```bash
node checks/line-width.mjs <project-path> [--limit 80]
```

[`line-width.mjs`](line-width.mjs) enforces the 80-column convention. It
reports; it never reformats. A reformatter run over this repository once
corrupted prose by splitting punctuation away from the links it touched, and
the damage was invisible line by line.

```bash
node checks/install-commands.mjs
```

[`install-commands.mjs`](install-commands.mjs) compares every fenced
`git clone` line in the repository against every other, and requires the clone
to land outside the project being checked. Three documents carry a copyable
install command; [C2](../method/rules.md#c2) wants one authority for a fact and
a command has to be where the reader is, so the copies stay and a command
decides whether they still agree. The clone used to land *inside* the project,
so an adopter's first run scanned the method's own documents as if they were
theirs — which is why the destination is checked and not only the agreement.

```bash
node checks/plugin-version.mjs
```

[`plugin-version.mjs`](plugin-version.mjs) fails when something that ships to
users changed since the last release tag and the plugin's version did not, and
when the two manifests declaring that version disagree. Claude Code uses the
version as a cache key, so an unbumped version means everybody who installed the
plugin keeps what they have — silently, because a cached copy looks exactly like
a current one. That happened once here, for a release.

A `README.md` under `plugins/` does not count as shipping to users: it is read
by somebody deciding whether to install, never by an agent that already has.
Requiring a version bump for a typo in prose is how a version discipline becomes
something people work around.

**It also holds the plugin README to the manifests.** That README repeats the
number for a reader deciding whether to install, and nothing kept the two
together: the prose sat at `0.4.0` while both manifests had moved to `0.5.0`.
The scan looks for one fixed sentence — *the manifests currently declare
`X.Y.Z`* — rather than for every version-shaped string in the file, because
that file legitimately contains several, one of them the account of the failure
this check exists for. Reporting a true historical sentence would be a false
alarm that could only be silenced by falsifying the record. Rewording the
sentence therefore takes it out of the scan, so **finding no such statement is
itself a finding**: the check stopping is loud rather than silent.

It compares against the working tree rather than against `HEAD`, so it answers
while the answer can still be a file edit. Where git has nothing to say — no
repository, no tags, or a release that declared no version — it says so under
*not decided here* rather than reporting success.

```bash
node checks/documented-version.mjs
```

[`documented-version.mjs`](documented-version.mjs) fails when an example
`method.json` in this repository declares a catalogue version other than the one
in [`method/VERSION`](../method/VERSION). Four documents carry a copyable
declaration, and [`agent-manual/method.json`](../agent-manual/method.json) is
the one the front page offers as the thing to start from — so a stale version
here is not untidiness, it is every adopter beginning on a pin they never chose
and being told by their first run that they are behind.

It is scoped to **this** repository on purpose. A project pinning itself to an
older catalogue is making a legitimate choice, which
[`check-method.mjs`](check-method.mjs) reports and deliberately does not fail
on; only the templates people copy have to be current.

The scan is block-scoped: a version is compared only when it sits in the same
JSON object as the method's own name. That is what keeps `package.json` and the
two plugin manifests out of it without an exemption list naming them, which
would go stale the first time somebody added a manifest. A run that recognises
no declaration at all fails rather than passing, because a rename moving the
method's name out from under the pattern would otherwise arrive as a green
result.

```bash
node checks/documented-counts.mjs
```

[`documented-counts.mjs`](documented-counts.mjs) compares the case counts
stated under [the counter-tests](#the-counter-tests) against what the runs
report. It runs both counter-tests to find out, so it costs what they cost.
That figure is the argument for trusting everything else on this page, and it
had gone eighteen cases stale before anybody read it against a run.

```bash
node checks/copied-templates.mjs
```

[`copied-templates.mjs`](copied-templates.mjs) holds each template under
`.github/` to the handbook document it is a copy of. Two pairs today:

| The handbook shape | The copy GitHub reads | Sections |
|---|---|---|
| [`agent-manual/pull-request.md`](../agent-manual/pull-request.md) | `.github/PULL_REQUEST_TEMPLATE.md` | What · Why · Verified · Open questions · Follow-ups |
| [`agent-manual/issue-templates/task.md`](../agent-manual/issue-templates/task.md) | `.github/ISSUE_TEMPLATE/task.md` | Context · Scope · Constraints · Related |

Each shape has to exist twice — the handbook is what a project copies, and only
the file under `.github/` is read by GitHub — so [C2](../method/rules.md#c2)
makes the handbook the authority and a command decides whether the copy still
agrees. That is the same trade [`install-commands.mjs`](install-commands.mjs)
makes for the three copyable install commands.

**It compares from the first heading down, and asks two different things.**
Whatever sits above that heading is exempt, and has to be: the handbook tells
its reader to copy the file, and a copy repeating that would tell every
contributor here to copy it again — and the copy may carry YAML frontmatter the
handbook has no use for, which is how GitHub is told what to call the template.
Everything below, including the guidance under each heading, is compared. That
guidance is most of both files, and it is the shape.

The second question is why this is not merely a diff. **Each pair's heading set
is held to the one decided for it**, so a change that edits both files together
and grows a shape a section is still a finding. A same-content check would pass
that perfectly, and a shape that changed with nothing saying so is exactly what
the check exists to prevent. An adopting project may add one section of its own;
the sets are exact here because this repository declares that it adds none.

**The pair list is itself a mechanism.** A pair that falls out of it is a
comparison that stops happening while the run still reports success about the
pairs that remain, so the counter-test asserts the list rather than deriving
expectations from it, and an empty list is a finding.

A file that cannot be read is a finding rather than a pass. Deleting the copy is
the cheapest way to make a same-content check agree, so "there is nothing there"
must not arrive as agreement.

## The counter-tests

```bash
npm test
```

166 cases for the coherence check and 13 for the line-width check, each building
a throwaway project and asserting the exit code — and, for the coherence check,
which check fired. Asserting the exit code alone would pass a check that fails
for the wrong reason.

Those two figures are themselves checked, by
[`documented-counts.mjs`](documented-counts.mjs) under `npm run lint`. Five
further counter-tests —
[`documented-counts.test.mjs`](documented-counts.test.mjs),
[`documented-version.test.mjs`](documented-version.test.mjs),
[`install-commands.test.mjs`](install-commands.test.mjs),
[`plugin-version.test.mjs`](plugin-version.test.mjs) and
[`copied-templates.test.mjs`](copied-templates.test.mjs) — cover those
checks in turn and are deliberately not given figures of their own. One more
advertised number would be one more thing to keep true, and nothing would be
checking it.

This exists because of [E3](../method/rules.md#e3). The usual way a check breaks
is not a wrong verdict but a pattern that silently matches nothing, reports
success and is believed — a failure only visible to someone deliberately trying
to trip it. The cases that matter most are the ones asserting a
**non**-finding: a withdrawn rule quoted in a blockquote, an Americanism inside
a code span, a dead link inside a fenced example. Those are the false alarms
that would teach people to distrust the check.

## The mutation harness

```bash
npm run mutate
```

The counter-tests answer *does the check fire on a violation?*
[`mutate.mjs`](mutate.mjs) answers the question behind it: **would anything
notice if a check stopped firing?** Each mutation breaks one protective
mechanism on purpose — a guard becomes `if (false)`, a table entry names the
wrong rule — and the counter-test that ought to notice runs against the damaged
copy. A mutation that survives is a mechanism nothing is holding to account.

It is not part of `npm run lint`, because it runs that suite once per mutation:
minutes, not seconds. Run it after changing the check.

No score is published anywhere, and that is the point of the design. A published
score is a number that goes stale without failing, which is the defect this
repository has already met twice. Instead **every** mutation in the list has to
be caught, and a survivor exits 1. A mutation nothing can catch belongs in
`KNOWN_SURVIVORS` with the reason, where it reads as a decision rather than an
oversight; the map is empty and meant to stay that way.

Five mutations survived the first run, and each one named a case that was
weaker than it looked. Two asserted a verdict that the mutant still produced by
another route. One fixture wrapped its phrase in the wrong place, so a test for
paragraph matching passed line by line as well. One guard was reachable only
through an arrangement no case built. One deletion turned a refusal into a
crash, which exits the same way. None of those five were visible in a green
suite.

## How to get it

By cloning this repository beside your project, which is what every install
command here says. **There is no npm package**, deliberately: `package.json`
carries `"private": true`.

Publishing would mean a second copy of the catalogue in a registry, drifting
from this one — the defect [C2](../method/rules.md#c2) exists to prevent, and
the same reason the plugin does not bundle the catalogue either. A published
package would also be a version promise, and the checks are versioned but not
released. That is a real convenience gap and it is recorded as one rather than
papered over.

The code is [MIT](LICENSE), so vendoring the files straight into your own
repository is the supported answer to the inconvenience, not a workaround.

## Licence

The code in this directory is under [MIT](LICENSE), not the CC BY 4.0 that
covers the rest of the repository. Take it, vendor it, change it.
