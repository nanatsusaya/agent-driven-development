# Templates

Starting points, not fixtures. Copy one, delete what does not apply, and rewrite
the rest in your own words.

| Template | Becomes | Role |
|---|---|---|
| [`method.json`](method.json) | `method.json` | the declaration the check reads |
| [`operating-rules.md`](operating-rules.md) | `CLAUDE.md` or `AGENTS.md` | `operating-rules` |
| [`decision-record.md`](decision-record.md) | `docs/adr/NNNN-slug.md` | one entry under `decisions` |
| [`decision-index.md`](decision-index.md) | `docs/adr/README.md` | the index under `decisions` |
| [`status.md`](status.md) | `docs/STATUS.md` | `state` |
| [`method-log.md`](method-log.md) | `docs/method-log.md` | `method-log` |
| [`pull-request.md`](pull-request.md) | `.github/PULL_REQUEST_TEMPLATE.md` | — |
| [`issue-templates/`](issue-templates) | `.github/ISSUE_TEMPLATE/` | — |

## Why the operating-rules template restates the rules

Rule [C3](../method/rules.md#c3) says the documentation has to be
self-supporting: the agent working a task has your repository and nothing else.
An operating-rules file that says *"follow the rules at github.com/…"* is a
fetch that can fail, be blocked or be skipped, and it costs tokens on every
task. So the template spells the rules out.

That looks like it breaks [C2](../method/rules.md#c2) — one authority per fact,
and here is a second copy. It does not, for one specific reason: the copy is not
meant to stay identical. Your file is the authority for *your* project, in your
words, adapted to your circumstances. `method.json` records where you diverged,
and the coherence check tells you when the catalogue moves under you. A tracked,
declared divergence is a decision. An untracked identical copy is the thing C2
warns about.

If you would rather not maintain the relationship at all, delete `method.json`
and keep the file. Step 1 of [adopting](../method/README.md#adopting-it) is a
legitimate stopping point.
