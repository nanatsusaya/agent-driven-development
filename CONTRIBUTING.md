# Contributing

This is a reference that is also an argument, so disagreement is the most
valuable thing you can bring.

The catalogue was derived from a handful of projects of deliberately different
shapes and reshaped wherever a rule failed to transfer. That is a real test and
a small sample, and the gap between the two is where it is most likely to be
wrong — particularly about **teams**. The rules are written to be indifferent to
how many people are working, but they were exercised mostly against differences
in *project*, not differences in *organisation*. Experience from a team is
therefore worth more here than agreement from a solo maintainer.

## What is most useful

**A rule that did not hold up.** You applied it, it cost more than it returned,
and you can say why. This beats any amount of agreement.

**An archetype the adaptation guide misses.** If you keep writing the same
adaptation into every project of a kind not covered in
[`method/adapting.md`](method/adapting.md), the rule is probably in the wrong
layer.

**A rule marked `manual` that could be `automated`.** The honest measure of how
much of this method is in force is the ratio of checked rules to merely written
ones, and that ratio is low. Turning one rule into a check is worth more than a
page of prose.

**A check that produces false alarms.** A check that fires on correct documents
teaches people to distrust every check, and the distrust generalises to the ones
that are right. Report it as a defect, because it is one.

## What is less useful

**A rule that only holds for software.** The admission bar is that a rule works
for a project with no code in it. Rules that do not clear it are not rejected —
they belong in the project layer, and
[`method/adapting.md`](method/adapting.md) is where they go.

**A rewrite of the framing.** The premise — that the seam between sessions is
what the repository exists to carry work across — is the thing being argued for.
Arguing against *it* is welcome and belongs in Discussions; replacing it in a
pull request is a different project.

## Where to put things

| | |
|---|---|
| [Discussions](https://github.com/nanatsusaya/agent-driven-development/discussions) | arguments, experience reports, "this did not work for me" |
| Issues | concrete corrections: a broken link, a wrong claim, a check that misfires |
| Pull requests | welcome, and best opened after an issue or a discussion — so that the shape is agreed before you spend the effort |

## If you open a pull request

- **One concern per pull request.**
- **British spelling** throughout. **Prose wraps at roughly 80 columns**, and a
  link is never broken across lines.
- **No project names.** Every rule stands on its own reasoning, and evidence
  takes the form of the failure a rule prevents, never a case study — yours
  included. This is not modesty; a rule justified by an anecdote is a rule
  nobody can evaluate.
- **Run both commands and say what they returned:**

  ```bash
  npm run lint
  ```

  ```bash
  npm test
  ```

- **If you change a check, add its counter-test cases** — the deliberate
  violation it must catch, *and* the nearest legitimate case it must not fire
  on. A check without the second kind of case is a check nobody should trust.
- **If you withdraw or change the meaning of a rule**, add the entry to
  [`method/withdrawn.md`](method/withdrawn.md) in the same change. That entry is
  the whole mechanism by which adopters find out.

## Licence

Contributions are accepted under the same terms as the part of the repository
they touch: [CC BY 4.0](LICENSE) for the written method, and
[MIT](checks/LICENSE) for the code in `checks/`.
