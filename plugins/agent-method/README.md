# agent-method

Five procedures for [agent-driven-development](https://github.com/nanatsusaya/agent-driven-development),
packaged as a Claude Code plugin.

```
/plugin marketplace add nanatsusaya/agent-driven-development
/plugin install agent-method@agent-driven-development
```

| Skill | When |
|---|---|
| `/agent-method:moin` | Session bring-up. Orients from the project's living documents and **ends with a question, never an action**. |
| `/agent-method:weiterimtext` | The seam after a merged change. Keep your context, re-verify the world, start the next task only if it is decision-free. |
| `/agent-method:feierabend` | Session wind-down. Tidy the branches, finish or park work honestly, bring the living documents current. |
| `/agent-method:decision-record` | Writing or reworking a decision record, and the cycle it goes through. |
| `/agent-method:adopt` | Introducing the method into a project, or reviewing how well an existing one fits. |

## About the names, and the language rule behind them

Three of them are German: *moin · weiterimtext · feierabend* — roughly *morning
· carry on · knocking-off time*.

That is not an oddity, it is the method's language rule applied to itself.
[L1](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md)
splits two decisions that are easy to conflate:

- **Everything committed is written in one language** — one spelling standard,
  machine-checked. Here that is English: these skills, their descriptions and
  every document in the repository.
- **Conversation with a person happens in that person's own language.** A skill
  name is typed by a person in conversation, so it sits on that side of the
  line.

Rename the folders to whatever you type — nothing depends on them. What the
rule asks is that you do not let the choice leak the other way, into the
artefacts.

## What the skills assume

They read the project's `method.json` to find out which of its files answer
which question, and fall back to the conventional names when there is no
declaration. They contain **no** stack, domain or tooling specifics: anything a
procedure needs to know about your project it learns from your project.

## What is deliberately not in here

**The rule catalogue and the coherence check.** A plugin is copied into a cache
when it is installed, so bundling them would create a second copy of the
catalogue that drifts from the first — the exact defect rule
[C2](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md)
exists to prevent, shipped inside the tooling meant to enforce it.

So the catalogue stays in one place, and the check runs from a clone:

```bash
git clone https://github.com/nanatsusaya/agent-driven-development
node agent-driven-development/checks/check-method.mjs <project-path>
```

Zero dependencies, Node 18 or later. That is a real convenience gap and it is
recorded as one rather than papered over.
