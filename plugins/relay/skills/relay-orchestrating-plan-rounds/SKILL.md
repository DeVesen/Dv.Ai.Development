---
name: relay-orchestrating-plan-rounds
description: Use when a spec has to reach an approved plan with no person in the loop, when planning and plan review run as separate subagents that share no session or memory, when a plan review has come back with findings and something has to decide which of them go back out, or when a review-and-fix loop has already run more than once on the same plan.
---

# Relay Orchestrating Plan Rounds

## Overview

You drive a spec to an approved plan through subagents that share no memory. They
plan, review, resolve and fix; you route, count and record.

**You keep the books. You never judge the work.** You read neither plan nor spec, so
every quality call belongs to the agent that read them. Your decisions are lookups:
category to a table, `root` to the ledger, round number to the cap.

## The pipeline

Stages 1 and 2 run once, before the first plan.

| Stage | Subagent | Receives | Writes |
|---|---|---|---|
| 1 | `relay-reviewing-spec` | `02-spec.md`, `01-intake.md` | `03-spec-review.md` |
| 2 | resolver | `02-spec.md`, `01-intake.md`, the open questions | nothing — returns answers |
| 3 | `relay-planning` | `02-spec.md`; on re-entry also `04-plan.md` + findings | `04-plan.md`, journal |
| 4 | `relay-reviewing-plan` | `04-plan.md`, `02-spec.md` | `05-plan-review.md`, journal |

Every subagent reads code; none writes code. Stage 4 never gets a prior round — a
fresh read is the point, and the ledger carries continuity. Stage 2 never gets
`04-plan.md`, so the resolver reads the spec without knowing how someone already
wanted to build it.

## After Every Dispatch: Verify, Then Checkpoint

Two mandatory steps between one subagent returning and the next one being
dispatched, whenever that subagent's contract touched `00-journal.md` or a
numbered review file (`03-spec-review.md`, `05-plan-review.md`). Skip neither,
whatever the round's own outcome was — this runs on rejections and approvals
alike.

**1. Verify the write grew the file, never shrank it.** Before dispatch,
record that file's current line count (0 if it does not exist yet). After the
subagent returns, reread the file and check two things: the new count is
`>=` the old one, and the old content still appears verbatim inside the new
file — a plain substring check is enough, nothing fancier is needed. If
either check fails: **stop.** Do not dispatch the next stage. Surface it to
the user as a data-loss event — name the file, the count before, the count
after — and do not attempt to silently continue past it or silently repair
it yourself.

**2. Commit the bundle directory.** Once the check passes, commit only
`docs/relay/<request-id>-<slug>/` — `git add <bundle-dir>`, never `-A`, never
the whole repo — with a mechanical message:
`relay(<request-id>): round <n> — <stage-skill>`. You run this yourself; the
subagent that just returned should not need git access. Do this
unconditionally, every round, regardless of whether the working repository as
a whole is mid-feature-branch, carries unrelated uncommitted changes
elsewhere, or is otherwise nowhere near ready to ship — this commit is a
checkpoint of the relay process's own artifacts, not a statement about the
feature branch's readiness.

Skipping either step because "the round obviously went fine" is the exact
failure these steps exist to catch: the incident that motivated them produced
no error, no warning, and no sign anything was wrong until a much later round
noticed files the journal still referenced no longer existed on disk.

## Routing a finding

Each finding carries a `category` — an observation, not a verdict — and a `route`.
Derive the weight from the table, never from your own reading:

| category  | Weight |
|---|---|
| `coverage`, `seam`, `card`, `run` | **A** |
| `fact` with `rests_on` filled | **A** |
| `fact` without `rests_on`, `other` | advisory |

- **A — goes out every round**, including one a previous round already attempted: a
  failed attempt did not close the gap.
- **B — already attempted.** Advisory finding whose `root` matches a ledger entry:
  dropped. Match the thing, not the wording — would the fix be the same one?
- **C — first sighting.** New advisory finding: goes out once — unless its `guess`
  is `nothing`, meaning no card holder is left guessing. Then it is dropped and
  recorded like a B drop: nobody building is blocked by it.

`route: requester` skips the filter entirely and goes to the resolver.

## Gates and exits

- Spec `## Acceptance` entries carried by a card: **100 %**.
- `## Behaviour` points with a test step **or a stated reason none is possible**:
  **90 %**. The review reports both fractions and names every miss; you compare the
  numbers.
- **Four rounds.** With A findings open at the cap, the run ends, no plan approved.

Some findings leave the loop before the cap — see the ledger states in
`references/ledger.md`.

## What you write

`06-clarifications.md`, yours alone — no subagent touches it. It carries resolver
answers with their provenance, what is still open for a human, and **every finding
you dropped, with why**. Without that last block your filtering is the one decision
nobody can check. Template: `references/ledger.md`. Record formats:
`references/agent-contracts.md`.

You also run the git checkpoint after every dispatch — see *After Every
Dispatch: Verify, Then Checkpoint*, above. That commit is yours to make, not a
subagent's.

## Red flags

- Judging whether a finding is worth passing on. That call was made upstream.
- Downgrading an A finding, or dropping one because it came back.
- Giving a subagent a file it does not need "for context".
- Reaching the cap with A findings open and approving anyway.
- Skipping the post-dispatch integrity check or the git checkpoint because the
  round obviously went fine.
- Treating unrelated uncommitted changes elsewhere in the repo as a reason to
  skip or delay the bundle-directory commit.
