<!--
Copy to «method-log»/method-log.md.

The rarest artefact of the four and the one most often skipped. It is also the
one that keeps the other three from decaying, because it is the only place that
records why a rule exists.
-->

# Method log

A running record of **how** we work here and why it looks like this — separate
from «decisions», which records what was decided about the work, and from
«state», which records where the work stands.

This exists because the project is maintained indirectly: work is filed as
tickets, an agent picks one up, and that agent has this repository and nothing
else — no conversation history, no memory of how a rule came to exist. **A rule
whose origin is lost gets quietly dropped by the next session that finds it
inconvenient**, and dropped in good faith, because from the outside an
unexplained rule is indistinguishable from an arbitrary one.

**What goes here:** a correction and the reasoning behind it · a workflow
experiment and its outcome · a mistake worth not repeating · a cross-check
against another source or another model.

**What does not:** routine task execution. That is what the commit history and
«state» are for.

**The test before writing an entry:** *would an agent with no memory of that
session decide worse without this?* If not, leave it out. An entry per session
turns the log into a diary, and a diary is not read.

## Entry format

```
## YYYY-MM-DD — Short title

**Trigger:** how the topic came up.
**Action:** what was actually done.
**Impact:** what changed as a result — or did not.
**Lesson:** what this suggests for next time, if anything.
```

Quote a person verbatim and in their own language when the wording is the
point. A translated quotation is a paraphrase wearing quotation marks, and the
reader cannot tell.

---

## YYYY-MM-DD — «First entry»

**Trigger:** «…»
**Action:** «…»
**Impact:** «…»
**Lesson:** «…»
