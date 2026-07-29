# Checks

Two of them. [`check-method.mjs`](check-method.mjs) is the coherence check,
described below and meant for any project adopting the method.
[`line-width.mjs`](line-width.mjs) enforces this repository's own 80-column
convention and is house style rather than method — run it if you want it.

```bash
node checks/line-width.mjs <project-path> [--limit 80]
```

It reports; it never reformats. A reformatter run over this repository once
corrupted prose by splitting punctuation away from the links it touched, and
the damage was invisible line by line.

## The coherence check

```bash
node checks/check-method.mjs <project-path>
```

Zero dependencies, Node 18 or later. It reads
[`method/rules.md`](../method/rules.md) and
[`method/withdrawn.md`](../method/withdrawn.md) as data, reads the project's
`method.json`, and reports where the two disagree.

## What it is asking

**Does this project's declaration match this project?** Not *does this project
obey the catalogue*. [A1](../method/rules.md#a1) expects the rules to be
reshaped, so a narrowed rule with a stated reason is a correct state. What is
not correct is a rule that vanished without anyone deciding it should.

Ten checks:

| Check | Asks | Rule |
|---|---|---|
| `declaration` | `method.json` exists and is well formed | — |
| `artefacts` | every bound role exists | — |
| `authorities` | declared external systems name a role the method knows | — |
| `adaptations` | each is complete, names a real rule, and gives a reason and a date | [A2](../method/rules.md#a2) |
| `accounting` | an unbound role is explained by an adaptation | [A2](../method/rules.md#a2) |
| `links` | relative links and anchors resolve | [C5](../method/rules.md#c5) |
| `placeholders` | no bound artefact still carries `«template placeholders»` | [C3](../method/rules.md#c3) |
| `decisions` | every decision appears in its index, with a matching status | [D2](../method/rules.md#d2) |
| `withdrawn` | no document still teaches a rule the catalogue has withdrawn | [M2](../method/rules.md#m2) |
| `language` | one spelling regime, if the project declares one | [L1](../method/rules.md#l1) |

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

Runs only the checks that read documents — [C5](../method/rules.md#c5),
[M2](../method/rules.md#m2) and [L1](../method/rules.md#l1) — and needs no
`method.json`. Use it on a project that has not adopted the method, or does not
intend to. Everything it did not run is named in the report.

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
to stay unmodified — the check would push you to break a rule to satisfy it. Put
such directories in `ignore`, which is what that field is for.

**Heading anchors are approximated, deliberately permissively.** Platforms
disagree about which punctuation survives slug generation, so every plausible
slug for a heading is accepted. A link to a heading that does not exist at all
still fails; a link that resolves under one platform's rules and not another's
does not. That trade is on purpose — a false alarm teaches people to distrust
every check ([E3](../method/rules.md#e3)).

**Under an American regime, only the listed word pairs are scanned.** The
general `-ise` direction is not, because the exception list it would need
(`wise`, `precise`, `promise`, `exercise`, and a long tail) is where a wrong
entry becomes a false alarm. The report says so on every American run rather
than leaving the gap to be discovered.

**Symlinked directories are never walked.** The directory scan reads real
directories only, so documents reachable only through a symlink are not
scanned and not reported as skipped.

**Nothing verifies that a withdrawn rule was accompanied by its entry.**
[`CLAUDE.md`](../CLAUDE.md) requires the two to land in the same change and no
check enforces the coupling. It becomes enforceable the first time a rule is
actually withdrawn, because until then there is nothing to check against.

## Options

| | |
|---|---|
| `<project-path>` | defaults to the working directory |
| `--catalogue <path>` | use a different catalogue; defaults to `../method` relative to the script |
| `--lint` | run the document scans only; no `method.json` needed |
| `--spelling <regime>` | the spelling regime for `--lint`: `british` or `american` |
| `--quiet` | omit the in-force listing. The blind-spot section is always printed |

Exit codes: `0` coherent · `1` findings · `2` the catalogue itself could not be
read.

## Licence

The code in this directory is under [MIT](LICENSE), not the CC BY 4.0 that
covers the rest of the repository. Take it, vendor it, change it.

## The counter-tests

```bash
npm test
```

73 cases for the coherence check and 13 for the line-width check, each building
a throwaway project and asserting the exit code — and, for the coherence check,
which check fired. Asserting the exit code alone would pass a check that fails
for the wrong reason.

This exists because of [E3](../method/rules.md#e3). The usual way a check breaks
is not a wrong verdict but a pattern that silently matches nothing, reports
success and is believed — a failure only visible to someone deliberately trying
to trip it. The cases that matter most are the ones asserting a
**non**-finding: a withdrawn rule quoted in a blockquote, an Americanism inside
a code span, a dead link inside a fenced example. Those are the false alarms
that would teach people to distrust the check.
