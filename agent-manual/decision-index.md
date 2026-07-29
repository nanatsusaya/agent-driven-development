<!--
Copy to «decisions»/README.md.

The coherence check reads this file. It expects a table whose first cell carries
the four-digit number and whose last cell is the status. It checks both
directions: every decision file appears here, and every row except a `Planned`
one has a file behind it. The status here must match the status inside the file
— a disagreement means one of the two is lying to the next session.
-->

# Decisions

One file per decision, numbered `NNNN-title.md`. A decision is immutable once
`Accepted`, **unless** a decider authorises an amendment, recorded in that
decision's *Amendments* section; otherwise a later decision supersedes an
earlier one.

Every decision file must appear in this table with a status.

| # | Title | Status |
|---|---|---|
| 0001 | «Title» | Accepted |
| 0002 | «Title» | Planned |

Link the number to the file once the file exists — `[0001](0001-slug.md)`. The
status, not the link, is what the check reads: every row except a `Planned` one
must have a file behind it. `Planned` means ticketed and not yet written, so it
is the one status allowed to stand alone.

Status values: `Proposed` · `Accepted` · `Superseded` · `Planned` (ticketed, not
yet written).

> **`Accepted` means the *decision* is recorded and binding — not that it is
> *implemented*.** Implementation progress is tracked in «state artefact».

## What earns a decision record

Anything a later change would otherwise silently reverse, and anything whose
reasoning is not obvious from the result:

- «technology and tooling choices»
- «where authority for a fact lives»
- «anything with legal or privacy consequences»
- «anything outward-facing»
- «deliberate constraints — what we refuse to do, and why»

Routine implementation work does not. If in doubt: could a future agent undo
this without noticing a decision was being made? If yes, it needs a record.

## The expected set

«Optional but valuable: name the decisions you expect to need, and say why the
list is that long and no longer. A closed list makes an addition earn itself,
and stops the log growing decisions that exist only to be recorded.»
