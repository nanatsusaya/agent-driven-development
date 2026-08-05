---
name: Task
about: A unit of work, held to the same bar as the work itself
---

<!--
This is a copy. The shape lives in agent-manual/issue-templates/task.md; this is
the file GitHub reads. Everything from the first heading down is held to the
handbook by checks/copied-templates.mjs — so edit the handbook, and let the
check tell you this copy has fallen behind.

Agents write the tickets too, so hold a ticket to the same bar as the work. The
readiness line at the bottom is not ceremony: an agent given an under-specified
ticket fills the gaps by inference rather than by asking, and the inference is
invisible in the result.
-->

## Context

<!-- The problem or goal, and why it exists. Enough that someone with the
     repository and nothing else can act on it. -->

## Scope

<!-- For a decision: the choices that have to be made.
     For implementation: testable acceptance criteria, one per line. -->

- [ ] «criterion»

## Constraints

<!-- Anything that limits the solution: a decision this must respect, a legal
     or correctness requirement, a boundary not to cross. -->

## Related

<!-- Parent epic, related decisions and tickets. -->

---

**Ready** when: the scope above is concrete, the criteria are testable, and the
constraints are named.

**Done** when: the criteria are met **and verified**; work and docs changed
together; CI is green; the change is merged.
