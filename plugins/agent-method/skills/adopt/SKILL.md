---
name: adopt
description: >-
  Use to introduce the agent-driven-development method into a project, or to review how well an
  existing project fits it. Works out which of the project's files already play the four roles,
  proposes the rules that need reshaping for this kind of project, writes the method.json
  declaration with any adaptations recorded, and runs the coherence check. Ends by presenting the
  proposal for a decision — it does not adopt anything on its own authority.
---

# Adopting the method into a project

*Carries out rules A1, A2 and C1. The
[catalogue](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md)
is the authority; this file is only the procedure.*

Adoption is a proposal, not an installation. What the method looks like here is
a decision about how this project will be worked, which puts it squarely in the
human's domain.

**Guardrails (do not violate):**

- **Propose, do not impose.** Present the bindings and adaptations you intend
  and get a decision before writing anything.
- **Do not invent roles the project does not have.** A project with no decision
  records should get an adaptation, not a new empty directory.
- **Do not copy a rule you cannot justify here.** A rule applied where its
  reasoning does not hold costs the same and buys nothing, and the wasted effort
  teaches everyone that the method is bureaucracy.
- **Never claim the check passed without running it.**

## 1. Read the project first

Before proposing anything, find out what this project actually is:

- What is it, who is it for, and what would make it a failure? Scale,
  correctness, legal exposure and longevity each pull the rules in a different
  direction.
- Does it have code and a build chain, or is it a body of documents?
- How long has it been running, and how many sessions has it seen?
- What already exists: an operating-rules file, decision records, a status
  document, any kind of log?
- Is there already a `method.json`? Then this is a review, not an adoption —
  skip to step 4.

## 2. Map what exists onto the four roles

| Role | Answers | Commonly |
|---|---|---|
| `operating-rules` | How is work done here? | `CLAUDE.md`, `AGENTS.md` |
| `decisions` | What was decided, and why? | `docs/adr/`, `docs/decisions/` |
| `state` | Where do we stand? | `docs/STATUS.md` |
| `method-log` | Why does the way we work look like this? | `docs/method-log.md` |

Prefer binding a role to something that already exists over creating a file. If
a project has an informal running notes file that answers *where do we stand*,
that is the state artefact — renaming it buys nothing.

A role the project genuinely does not use is bound to `null` **and** explained
as an adaptation. Leaving it out silently is the one thing that is not allowed:
the difference between a considered omission and a gap is the record.

## 3. Work out which rules need reshaping

Read the catalogue's adaptation guide and match the project to an archetype.
Typical outcomes:

- **A project with no code** usually adapts the decision cluster — formal
  records are often too heavy, and a single canon document with dated change
  notes achieves what matters. Enforcement moves from commands to structure. It
  usually *gains* rules the catalogue does not have, about how files may be
  edited and what to verify after a write; those belong in the project layer.
- **A young solo project** usually defers the decision and enforcement clusters
  with a named trigger — first collaborator, first external user, first thing
  expensive to reverse. Deferred with a trigger is a decision; deferred without
  one is dropped with better manners.
- **A long-running project** usually needs the session and method-memory
  clusters most, and those are the two most often skipped as overhead.

For each rule you intend to change, write the reason as a sentence a stranger
could act on. "Not applicable" is not a reason.

## 4. Present the proposal and wait

Show the decider:

- which existing file plays which role, and which roles are unbound
- every rule you propose to narrow, drop, replace or defer, with its reason
- what would have to be created, and what you propose **not** to create
- anything you found that the method would call a defect — a fact with two
  authorities, a rule stated in two places, documentation that assumes knowledge
  no longer in the repository

Then stop and wait for a decision. Do not write files yet.

## 5. Write the declaration

Once the shape is agreed, write `method.json` at the project root:

```json
{
  "method": "agent-driven-development",
  "version": "0.1",
  "artefacts": {
    "operating-rules": "CLAUDE.md",
    "decisions": "docs/adr/",
    "state": "docs/STATUS.md",
    "method-log": "docs/method-log.md"
  },
  "language": { "spelling": "british" },
  "adaptations": [
    {
      "rule": "D2",
      "change": "dropped",
      "reason": "No formal decision records; the canon note carries dated change entries.",
      "decided": "YYYY-MM-DD"
    }
  ]
}
```

Then adapt the templates the project is missing — in the project's own words,
not pasted. The operating-rules file **states the rules rather than linking to
them**: an agent working a task has this repository and nothing else, and an
instruction to fetch something external is a fetch that can fail, be blocked or
be skipped.

Like every change, this goes through review.

## 6. Run the check

The coherence check lives in the method repository, has no dependencies, and
runs against any project path:

```bash
git clone https://github.com/nanatsusaya/agent-driven-development
node agent-driven-development/checks/check-method.mjs <project-path>
```

Report what it says, including what it says it could **not** verify. If it
fails, fix the project or the declaration — never silence the check by widening
an adaptation to cover a real defect.
