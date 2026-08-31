---
name: relay-reviewing-plan
description: Use when a plan has been written and work is about to be handed out, estimated or started against it, when someone asks for a plan to be signed off or hurried through ("two people are free tomorrow", "don't hold this up over process"), or when a plan that was sent back has come round again.
---

# Relay Reviewing Plan

## Overview

Fifth stage of the relay. It reviews `04-plan.md` — the document every implementer
is handed a single card out of — with an independent eye, before anything is built
from it.

This stage finds things and hands them back. It never fixes, never decides, never
writes a task, and never edits `04-plan.md` or `02-spec.md`. **It writes exactly two
files:** `05-plan-review.md` and its own appended section of `00-journal.md`.

## Ground Truth

Artifact home: `docs/relay/<request-id>-<slug>/` (a `## Relay process discipline`
section in the project's always-loaded instruction file overrides home and
language).

Read from disk, never from session memory: `04-plan.md` (the subject) and
`02-spec.md` (**required** — without it there is no coverage check; if missing, say
so, name `relay-planning`'s gate as the problem, and stop). Open `01-intake.md` only
when a requirement looks narrower than what was asked; open `00-journal.md` and
prior rounds of `05-plan-review.md` only when the plan has been here before. If
`04-plan.md` does not exist, do not invent a review — `relay-planning` may have been
right to refuse; name the blocker its journal section records and stop.

**Derive everything from the actual task cards.** Ignore any coverage table,
self-check or "checked" note the plan carries — the plan is not supposed to contain
one, and it is never evidence.

## The Five Checks

Run all five on every review, including one that ends in an approval. Each gets one
result line in the review file even when it finds nothing — otherwise "no finding"
and "not checked" are indistinguishable.

1. **Coverage, then one run end to end.** One row per `## Behaviour` requirement
   **and per `## Acceptance` entry**: the task step or done-when that actually
   carries it, or **DROPPED** (no step carries it) or **NARROWED** (a step carries
   less than the requirement says). Acceptance entries are the TDD test surface —
   every one needs a carrying card. Reverse direction: a task carrying no
   requirement is work nobody asked for. **Then walk one run end to end**, carrying
   the data card to card in run order — card-by-card reading cannot catch a break
   between defensible cards.
2. **Read it alone.** Per task: could its holder finish it today, alone, with
   nothing but this card? A missing value, file, sample, name or decision fails it,
   whatever the wording of the done-when.
3. **Seams.** Every `Consumes` against an earlier task's `Produces` — name,
   parameters, return shape, **character for character**. A consumed name no task
   produces is a reference to something no implementer can discover.
4. **Decisions and constraints.** Each row of `## Decisions taken at planning`:
   would two different answers change anything the requester can see or check? Then
   it was the spec's, not the plan's — a "reversible" label is a finding, not a
   mitigation. A fact asserted from a source nobody opened ("per the docs index") is
   a finding: **did anybody actually open the thing?** Also check the cards against
   `## Global Constraints`.
5. **Code steps.** Every step whose deliverable is code contains actual code in a
   fenced block, not a description. Structural only — correctness is
   `relay-reviewing-implementation`'s job.

## Calibration

Only flag what would cause real problems during implementation: the wrong thing
built, an implementer stuck, an acceptance entry no card fulfils. A boundary you
would have drawn differently, a name you dislike, a one-task plan for a small spec —
not findings. Approve unless there are real gaps, and do not manufacture a finding
to make the review look like work. The reverse also holds: do not skip a check to
make the review faster — a right verdict by a skipped route got lucky.

## Write `05-plan-review.md`

Append-only across rounds: one `## Round <n> — <date> — <verdict>` section per pass,
newest last, never editing an earlier round. Two verdict values:

| Condition | Verdict | Successor |
|---|---|---|
| No blocking finding | `approved` | `relay-plan-execution` |
| Any blocking finding | `rejected — routed to relay-planning` | `relay-planning` |

Per round: the verdict with one sentence of what decides it; one result line per
check (also "no finding"); then the findings — each with an id, **blocking** or
**advisory**, one sentence of what is wrong with a quote from the plan, what the
card's holder is left to guess, and a mark: **planning defect** (planning fixes it)
or **needs the requester** (travels as an open question, put the way you would ask
it — `relay-planning` takes it to the requester or their proxy before rewriting).
Never write the fix, never split the verdict into "clean, start now" and "needs a
patch first" — a reader acts on the permissive half.

**Escalation instead of round caps:** if the same root cause survives a second pass,
or a question needs a human who is not answering, stop the loop — hand the open
question to the requester or their proxy in the hand-off and say the chain waits
there.

## Journal and Hand-Off

Append 2–4 sentences of prose to `00-journal.md` under
`## <date> — relay-reviewing-plan`: the verdict, what decided it, anything
escalated.

End with exactly: (1) status line — review written, verdict, exact path; (2) the
successor per the verdict table; (3) one question — continue with the successor /
different step / stop. Never invoke the successor yourself, and never write the fix
while you wait.

## Red Flags — Stop, You Are Mid-Violation

- "Rejected, but these cards can start tomorrow." — a partial go-ahead in any form.
- "The fix is to…" / "I'd recommend…" — the repair is `relay-planning`'s.
- "Conditionally approved" or any verdict value not in the table.
- "The spec is silent there, so it was planning's to decide." — spec silence on
  something the requester would observe is what makes it the requester's question.
- "It cites a source." / "It's a one-line change if wrong." — a source cited is not
  a source read.
- "Task N is named for that requirement." — read what the card actually does.
- "Every card reads fine on its own." — without having walked one run end to end.
- Reaching a verdict without a row for every acceptance entry.
- Writing any file other than `05-plan-review.md` and `00-journal.md`.
