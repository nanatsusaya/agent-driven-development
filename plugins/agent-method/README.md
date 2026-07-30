# agent-method

Five procedures for [agent-driven-development](https://github.com/nanatsusaya/agent-driven-development),
packaged as a Claude Code plugin. They cover the moments a session turns over,
which is where the seam between sessions actually bites.

| Skill | When |
|---|---|
| `/agent-method:session-start` | Session bring-up. Orients from the project's living documents and **ends with a question, never an action**. |
| `/agent-method:after-merge` | The seam after a merged change. Keep your context, re-verify the world, start the next task only if it is decision-free. |
| `/agent-method:session-end` | Session wind-down. Tidy the branches, finish or park work honestly, bring the living documents current. |
| `/agent-method:decision-record` | Writing or reworking a decision record, and the cycle it goes through. |
| `/agent-method:adopt` | Introducing the method into a project, or reviewing how well an existing one fits. |

## What the skills assume

They read the project's `method.json` for two things. Which of its files answer
which question — and which systems it keeps outside the repository, under
`authorities`: where tasks live, where the review boundary is configured. Those
are addresses to know, never things to fetch. A procedure that has to retrieve
something before it can work is not self-supporting, which is what
[C3](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md#c3)
forbids. Where there is no declaration they fall back to the conventional names.

They assume **nothing** about your stack, your domain or your tooling: anything
a procedure needs to know about your project it learns from your project. The
only command any of them names is the one in `adopt` for running this method's
own check.

They say **the decider** rather than "the human", because who decides varies —
a maintainer, whoever owns the area, the team — and a procedure that assumes
one person is useless the moment there are several.

## Rename them into your own language

The names above are English because everything committed here is English. That
is one half of rule
[L1](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md#l1).
The other half is that you talk to an agent in your own language — and a skill
name is something you type in conversation, not something you read in a
document.

So the name is yours to change. Nothing depends on it: rename the directory,
and the `name:` field at the top of its `SKILL.md`. Something short and
colloquial works better than a translation, because you type it many times a
day:

| English | Deutsch | Español | Italiano |
|---|---|---|---|
| `session-start` | `moin` | `buenas` | `buondi` |
| `after-merge` | `weiterimtext` | `seguimos` | `avanti` |
| `session-end` | `feierabend` | `hasta-luego` | `stacco` |

These are plain ASCII on purpose. Whether the runtime accepts accented
characters in a skill name is not something this repository has verified.

What the rule asks is only that the choice does not leak the other way. The
headings, the descriptions and every document stay in the one language
everybody reads.

## Installing them

None of this is required. Every procedure above is a plain Markdown file, so
copying the five directories into `.claude/skills/` works just as well. What
changes is the name you type: a skill installed that way is `/session-start`,
because the `agent-method:` prefix is the plugin's namespace and a copied
directory has none.

Installing as a plugin is three steps, not two. Adding a marketplace registers
a catalogue and installs nothing, and an installed plugin is inert in the
running session until it is reloaded.

**1. Register this repository as a marketplace.**

```
/plugin marketplace add nanatsusaya/agent-driven-development
```

**2. Install the plugin.** This opens the plugin's details, where you choose a
scope: yourself across all projects, this repository for everyone, or this
repository for you alone.

```
/plugin install agent-method@agent-driven-development
```

**3. Activate it in the running session.**

```
/reload-plugins
```

Two things that look like failures and are not. `/reload-plugins` reports
`0 skills`: that counter covers a plugin's `commands/` directory only, and these
live in `skills/`. And `/plugin` opens an interactive terminal panel, so it is
unavailable in some environments — the desktop app has a plugin browser, and a
cloud session takes an `enabledPlugins` entry in `.claude/settings.json`
instead.

## What is deliberately not in here

**The rule catalogue and the coherence check.** A plugin is copied into a cache
when it is installed, so bundling them would create a second copy of the
catalogue that drifts from the first — the exact defect rule
[C2](https://github.com/nanatsusaya/agent-driven-development/blob/main/method/rules.md#c2)
exists to prevent, shipped inside the tooling meant to enforce it.

So the catalogue stays in one place, and the check runs from a clone:

```bash
git clone https://github.com/nanatsusaya/agent-driven-development ../agent-driven-development
node ../agent-driven-development/checks/check-method.mjs <project-path>
```

Zero dependencies, Node 18 or later. The clone goes **beside** the project, not
into it: a copy of the method inside the project being checked is a directory
full of documents the reader does not own. The check recognises such a copy by
its contents and skips it, but the two are cleaner apart — the clone is not
part of your history.

That is a real convenience gap and it is recorded as one rather than papered
over.
