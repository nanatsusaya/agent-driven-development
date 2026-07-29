# CLAUDE.md

Guidance for AI agents working in this repository.

## What this is

A published ruleset describing how to run projects with AI agents, alone or in
a team, built on one premise: **within a session an agent remembers; across
sessions, only the repository does.** The normative content is
[`method/rules.md`](method/rules.md); everything else explains, applies or
enforces it.

**This repository is documentation, not a project run by the method.** It has
no decision records, no status artefact and no method log, and it declares no
`method.json`. The catalogue is written for other people's projects; applying
it here would produce ceremony nobody reads. Do not add that machinery, and do
not treat the check under [`checks/`](checks/README.md) as a gate on this
repository — it is a tool for adopters.

Two things follow for anyone writing here. The premise is about the **seam
between sessions**, never about working memory: within a session an agent
accumulates context and should keep it. And **nothing in the catalogue may
assume a single maintainer** — where a rule needs a solo-specific form, that
goes in its *Binding*, marked as such.

## Commands

```bash
npm run lint    # line width, this repository's links and spelling, documented counts
npm test        # the counter-tests for all three checks
```

Zero dependencies, Node 18 or later. There is nothing to install. Both must be
green before work is handed back. To run the full check, point it at a project
that has a `method.json`: `node checks/check-method.mjs <path>`.

## Structure

| Where | What |
|---|---|
| [`method/`](method/README.md) | the catalogue and its guides — the normative content |
| [`checks/`](checks/README.md) | the coherence check, two house-style checks, and a counter-test for each |
| [`agent-manual/`](agent-manual/README.md) | what a project copies and rewrites — `operating-rules.md` is the manual, the rest are the shapes it refers to |
| [`plugins/agent-method/`](plugins/agent-method/README.md) | the five session procedures, as a Claude Code plugin |

## Writing conventions

- **Never name or allude to another project.** The catalogue is generalised on
  purpose: every rule stands on its own reasoning, and evidence takes the form
  of the failure a rule prevents, never a case study. This applies to real
  projects, employers and anything recognisably derived from one.
- **A rule enters the catalogue only if it holds independently of domain** — for
  a software product as much as for a knowledge base with no code in it. When in
  doubt, it belongs in [`method/adapting.md`](method/adapting.md) instead. The
  bar is deliberately hard; it is what keeps the catalogue small.
- **Rule identifiers are permanent and never reused**, including for a rule that
  was withdrawn. Projects refer to rules by identifier, so a renumbering
  silently changes what a project claims to follow.
- **Withdrawing a rule requires an entry in
  [`method/withdrawn.md`](method/withdrawn.md) in the same change.** That entry
  is the whole mechanism by which adopters find out; adding it later means
  everyone who read the catalogue in between learned the old rule with nothing
  to correct them.
- **Rules are anchored by identifier, not by heading text** — `<a id="c2"></a>`
  above each heading. Rewording a rule must not break every link to it.
- **Prose is hard-wrapped at 80 columns**, and a link is never broken across
  lines. Checked by `npm run lint`. Tables, fenced code, YAML frontmatter and
  lines a single long URL pushes over are exempt; nothing else is.
- **Every fact has one authority.** The catalogue defines the rules; nothing
  else restates them. Where a document needs a rule, it links to it.
- Comments in the check explain **why**, not what — particularly why a check
  exempts what it exempts, since an unexplained exemption reads as an oversight
  and gets removed.

## Working with the owner

- **Surface decisions that belong to the owner before acting.** Number them
  `O1..On`, recommend a default for each, and **do not answer them yourself**.
  Once answered, rewrite them in place as `R1..Rn` with what was decided and
  why.
- **Stop and ask** before: changing or withdrawing a rule in the catalogue ·
  renaming a rule identifier · publishing anything (pushing to the public
  remote, changing the marketplace manifest, cutting a release) · changing the
  licence or the contribution policy.
- **Verify external facts from primary sources** and cite them. This repository
  makes claims about how a plugin runtime behaves; those claims come from its
  documentation, never from memory.
- **Language:** all repository artefacts are written in **English, British
  spelling** (`colour`, `licence` as a noun, `analyse`, `-ise` rather than
  `-ize`). Direct conversation with the owner is in **German**. Identifiers
  mirroring an external interface keep that interface's spelling.

## Guardrails

- **Never weaken a check to make it pass.** If the check is wrong, fix the
  check and add the case to the counter-test. If the repository is wrong, fix
  the repository. Widening an exemption to cover a real finding is the one
  change that destroys the value of every other check.
- **A new or changed check is counter-tested before it is trusted** — fed
  deliberate violations, and shown to pass on the legitimate cases nearest to
  them. Add both to
  [`checks/check-method.test.mjs`](checks/check-method.test.mjs).
- **If a claim is checkable by a command, run the command before writing the
  claim** — and run it unpiped, so a failure can actually fail.
- **Report outcomes faithfully**, including failures and skipped steps.
