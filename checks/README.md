# The coherence check

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

Six checks:

| | |
|---|---|
| `declaration` | `method.json` exists and is well formed |
| `artefacts` | every bound role exists; every unbound role is explained |
| `adaptations` | each is complete, names a real rule, and gives a reason and a date |
| `links` | relative links and anchors resolve |
| `decisions` | every decision appears in its index, with a matching status |
| `withdrawn` | no document still teaches a rule the catalogue has withdrawn |
| `language` | one spelling regime, if the project declares one |

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

**It does not follow the network.** External links are not fetched. A check that
depends on the network fails for reasons unrelated to the repository, and a
check that fails for the wrong reason gets ignored for the right ones.

## Known limitations

**The spelling scan cannot tell a foreign word from an American spelling.** It
compares against a word list, so the German word `Liter` reads as a misspelt
`litre`, and any document quoting material in another language will produce
findings. (Both are in code spans here for a reason: this paragraph is a
document stating the rule, so it necessarily contains an example of what the
rule forbids, and the scan caught it. Leave the backticks.) This
matters because rule [L2](../method/rules.md#l2) requires quoted source material
to stay unmodified — the check would push you to break a rule to satisfy it. Put
such directories in `ignore`, which is what that field is for.

**Heading anchors are approximated, deliberately permissively.** Platforms
disagree about which punctuation survives slug generation, so every plausible
slug for a heading is accepted. A link to a heading that does not exist at all
still fails; a link that resolves under one platform's rules and not another's
does not. That trade is on purpose — a false alarm teaches people to distrust
every check ([E3](../method/rules.md#e3)).

**Nothing verifies that a withdrawn rule was accompanied by its entry.**
[`CLAUDE.md`](../CLAUDE.md) requires the two to land in the same change and no
check enforces the coupling. It becomes enforceable the first time a rule is
actually withdrawn, because until then there is nothing to check against.

## Options

| | |
|---|---|
| `<project-path>` | defaults to the working directory |
| `--catalogue <path>` | use a different catalogue; defaults to `../method` relative to the script |
| `--quiet` | findings only, without the summary |

Exit codes: `0` coherent · `1` findings · `2` the catalogue itself could not be
read.

## The counter-test

```bash
node checks/check-method.test.mjs
```

34 cases, each building a throwaway project and asserting both the exit code and
which check fired. Asserting the exit code alone would pass a check that fails
for the wrong reason.

This exists because of [E3](../method/rules.md#e3). The usual way a check breaks
is not a wrong verdict but a pattern that silently matches nothing, reports
success and is believed — a failure only visible to someone deliberately trying
to trip it. The cases that matter most are the ones asserting a
**non**-finding: a withdrawn rule quoted in a blockquote, an Americanism inside
a code span, a dead link inside a fenced example. Those are the false alarms
that would teach people to distrust the check.
