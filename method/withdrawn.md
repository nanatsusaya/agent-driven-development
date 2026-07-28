# Withdrawn rules

When a rule changes or is withdrawn, updating the place where it was defined is
not enough. Copies of it survive in procedural files, templates and instruction
documents, and those copies are invisible from inside the document being
edited. [M2](rules.md#m2) requires that the withdrawal leave behind something
that fails wherever the old version is still taught.

This file is that something. The coherence check reads it and scans every
document in a project for text matching the recorded patterns.

## What the check does with this file

For each entry below, the check searches the project's documents for the
pattern. A match is a failure, reported with the remediation text so the reader
learns what to write instead rather than only that they were wrong.

Three kinds of text are **exempt** from matching:

- fenced code blocks
- inline code spans
- **blockquotes**

The blockquote exemption is the load-bearing one. A decision record amending an
earlier decision has to quote the superseded wording verbatim
([D2](rules.md#d2)), and a check that failed on the quotation would make the
two rules contradict each other. Quoting the old rule for the record is
correct; asserting it is not.

## Format

Each entry is a level-3 heading `### W<n> — <short label>`, followed by four
fields. Identifiers are never reused.

```markdown
### W1 — the direct-commit exception for mechanical changes

- **Pattern:** `direct(ly)? (commit|push).{0,40}(status flip|mechanical)`
- **Withdrawn:** 2026-07-27
- **Reason:** an exception whose boundary the agent decides is not a boundary
- **Instead:** every change reaches the trunk through review (G1), without exception
```

**Pattern** is a JavaScript regular expression source, matched
case-insensitively against a single line. Write it to catch the *claim*, not
one phrasing of it — but narrow enough that it does not fire on a passing
mention. The counter-test in [E3](rules.md#e3) is not optional here: a pattern
that matches nothing reports success and is believed.

**Instead** is shown verbatim in the failure message. Write it as the sentence
you would want the person reading the failure to act on.

## Entries

*None yet.* This catalogue has not withdrawn a rule since it was published.

The first entry will be added the first time one is withdrawn, and the entry is
part of that same change — not a follow-up task ([C4](rules.md#c4)).
