---
name: decision-record
description: >-
  Use when writing a new decision record (an ADR, or whatever the project calls its decisions
  artefact) or fleshing out one that is still planned. Covers classifying the change — new versus
  amendment versus superseding — the required structure and house style, the branch → Proposed →
  review-with-open-questions → Accepted → merge cycle, and the index and status updates. Not for
  implementation work.
---

# Writing a decision record

*Carries out rules D1, D2, D3 and G2. The
[catalogue](https://github.com/nanatsusaya/agent-project-rules/blob/main/method/rules.md)
is the authority; this file is only the procedure.*

Authoring a decision is a repeatable procedure. Follow it exactly: decisions are
**normative** and everything built later rests on them.

Keep it a *decision record*, never a shadow implementation. If a section is
turning into a design document, the design belongs elsewhere and this file
should say which choice was made and why the alternatives were not.

**Guardrails (do not violate):**

- **Do not answer the open questions yourself.** They exist because they belong
  to the decider.
- **Do not edit an accepted decision.** See step 1.
- **Do not implement what this decision is still deciding.**

## 0. Read the ground truth first

- The state artefact — the current phase and what this decision is meant to
  unblock.
- The decisions index — the statuses and the next free number.
- The owning ticket, if there is one: its context, its scope, its criteria.
- **Every accepted decision this one depends on or touches.** Actually read
  them; do not paraphrase from memory.
- The operating-rules artefact, especially its stop-and-ask list.

## 1. Classify the change

- **A new decision** → a new record at the next free number. Numbers are never
  reused.
- **A change to an accepted decision** → **stop and ask.** An accepted decision
  is immutable except with explicit authorisation, recorded in that decision's
  *Amendments* section with the superseded wording quoted verbatim. Without that
  authorisation, a changed decision needs a **superseding** record, not an edit.
- **Superseding** → a new record naming what it supersedes; set the old one's
  status to `Superseded` in both the file and the index.

## 2. Branch and files

- Branch from the current trunk.
- Create the record with `Status: Proposed`. It stays `Proposed` only while the
  open questions are open; step 5 flips it, on this branch.
- Add its row to the index **in the same change**. An unlisted decision is
  invisible to the index check and to the next session.

## 3. Structure and house style

**Header:** status · date · who decided · what it depends on, naming the
specific sections relied on rather than only the record · what it supersedes or
amends, if anything.

**Body, in this order:**

1. **Context** — the forces, and what an earlier decision already fixed versus
   what is genuinely open. State the problem so that a reader who disagrees with
   the outcome can still see it was the right problem.
2. **Decision** — numbered subsections, each making an actual choice. Reuse
   earlier decisions instead of re-deciding their territory, and cite them.
   **Prefer formulations something could check**: a choice phrased so a command
   can decide whether it holds becomes a check, while a choice phrased as a
   principle becomes folklore.
3. **Consequences** — positive **and** negative, honestly. A record with no
   negative consequences has not been thought about, and the reader can tell.
4. **Alternatives considered** — each with a one-line "rejected because".
5. **Open questions** — `O1..On`, the choices that genuinely belong to the
   human. Recommend a default for each. **Do not answer them.**
6. **References**.

## 4. Open it for review

The change description states what, why, which ticket or decision it follows,
what it affects, and how it was verified. **Surface the open questions
prominently** — a numbered list buried in prose gets answered partially, and
nobody notices which ones were skipped.

## 5. After the questions are answered

Fold the answers into the decision sections, then convert *Open questions* into
**Resolved questions**, recording `R1..Rn` — what was decided and why.

Now flip `Proposed → Accepted` in **both** the record and the index, **on the
same branch, before the merge.** The questions are answered and the merge is
what accepts the decision, so the status the change carries in is the status
that is true the moment it lands.

Do not leave the flip for a second change afterwards. Between the two merges
the trunk would state `Proposed` about a decision that has in fact been
accepted — stale documentation, which [C4](https://github.com/nanatsusaya/agent-project-rules/blob/main/method/rules.md#c4)
calls a defect rather than untidiness — and it would cost a second trip through
review to record something that already happened.

Push to the same change under review; leave a short note that it is ready
again.

## 6. After it merges

Sync the trunk, delete the branch, and update the state artefact if this changed
what happens next.

Remember that **accepted means decided, not built.** Nothing about the status
says the thing exists.

## Before opening it for review

- Does every decision subsection make a *decision*, or does one merely survey?
- Is every dependency on another decision cited by section?
- Are the negative consequences real ones, or reassurance?
- Could any decision here have been phrased so a command could check it?
- Are the open questions genuinely the decider's to answer — and are they
  unanswered?
- Does the index row exist, with the right status?

## Before it is merged

- Are the open questions now **Resolved questions**, with `R1..Rn`?
- Is the status `Accepted` in the record **and** in the index, so that nothing
  is left for a follow-up change to correct?
