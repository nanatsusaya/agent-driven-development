# agent-driven-development

**A ruleset for running real projects with AI agents. It assumes the agent has no memory — the repository is its entire world.**

## The premise

An agent working a task has the repository and nothing else. No conversation history, no memory of why a rule exists, no recollection of the decision it is about to reverse. Every session starts from zero, and the next one will too.

Most advice about working with AI agents treats that as a limitation to route around — longer context, better prompts, more memory. This ruleset treats it as the design constraint. If the agent's whole world is the repository, then the repository is not merely where the work is kept. It is the operating system the work runs on, and it has to be built like one.

That premise has consequences, and those consequences are what this repository contains.

## What follows from it

Four ideas do most of the work.

**The human is the gate.** Agents propose; a person decides. Not because agents are unreliable, but because a review boundary is the only place where stated intent gets compared against actual outcome.

**One artefact answers one question.** A fact duplicated away from its authority degrades into an assertion. Two documents that answer the same question will eventually disagree, and the agent will believe whichever one it read last.

**Decide before building.** A choice made in conversation and never written down is not forgotten — it is re-litigated by the next session, differently, and the project drifts toward whatever the most recent agent found reasonable.

**A rule that can be a check is a check.** Prose erodes. Nobody re-reads a long instruction file in the middle of a task. A rule that fails a command is a rule that survives.

## Status

This repository is being built. The ruleset, the adaptation guide, the templates, the coherence check and the Claude Code plugin land in the commits that follow this one.

## License

Copyright © 2026 Daniel Wagner. Licensed under [CC BY 4.0](LICENSE) — copy it, adapt it, rewrite it for your own needs, commercially or not. The one condition is credit.
