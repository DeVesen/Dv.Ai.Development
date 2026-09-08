---
name: relay-orchestrating-plan-rounds
description: Use when an already-approved spec has to reach an approved plan with no person in the loop, when planning and plan review run as separate subagents that share no session or memory, when a plan review has come back with findings and something has to decide which of them go back out, or when a review-and-fix loop has already run more than once on the same plan.
---

# Relay Orchestrating Plan Rounds

## Overview

You drive a spec to an approved plan through subagents that share no memory. They
plan, review, resolve and fix; you route, count and record.

**You keep the books. You never judge the work.** You read neither plan nor spec, so
every quality call belongs to the agent that read them. Your decisions are lookups:
category to a table, `root` to the ledger, round number to the cap.

## The pipeline

The spec arrives **already approved by the requester**. No spec review runs inside
this loop — your first act is to record that approval so the planner's gate can read
it.

| Stage | Subagent | Receives | Writes |
|---|---|---|---|
| 0 | none — you | the requester's approval | `03-spec-review.md` |
| 1 | `relay-planning` | `02-spec.md` | `04-plan.md`, journal |
| 2 | `relay-reviewing-plan` | `04-plan.md`, `02-spec.md` | `05-plan-review.md`, journal |
| 3 | resolver | `02-spec.md`, the round's routed findings | nothing — returns answers |
| 4 | `relay-planning` on re-entry | `04-plan.md`, `02-spec.md`, the routed findings **and stage 3's answers** | `04-plan.md`, journal |

Stages 0 and 1 run once. Then 2 → 3 → 4 → 2 loops until a verdict or the cap. A round
ends with a plan review, so round 1 is stage 1 plus stage 2, and every round after it
is stages 3, 4 and 2.

Every subagent reads code; none writes code. Four input rules, none of them a matter
of convenience:

- **Stage 1 gets `02-spec.md` and nothing else.** No plan exists yet that could
  narrow how the spec is read.
- **Stage 2 never gets a prior round.** A fresh read is the point, and the ledger
  carries the continuity.
- **Stage 3 never gets `04-plan.md`.** Findings quote the plan where it matters, so
  the resolver answers out of the spec instead of being argued into the approach
  someone already chose.
- **Stage 4 is the only stage that edits the plan.** The resolver answers and never
  fixes; the re-planner fixes and never settles what the spec left open.

### Stage 0 — recording the approval

`relay-planning` writes no plan unless the latest `## Round <n>` section of
`03-spec-review.md` reads `approved`. That gate stays. You satisfy it by recording
the approval you were handed, once, before stage 1:

```markdown
# Spec review — <request-id>-<slug>

## Round 0 — <date> — approved

### Verdict
`approved` — successor `relay-planning`. Approved directly by the requester; no
`relay-reviewing-spec` pass ran for this request.
carried by: none

### Checks run
none — this is a recorded human approval, not a review.
```

Write it only when an approval was actually handed to you. Writing this section to
unblock a spec nobody signed off forges the gate rather than passing it — with no
approval in hand, stop and ask for one.

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

Each finding carries a `category` and a `stage` — both observations, not verdicts —
and a `route`. Derive the weight from the stage, never from your own reading:

| stage | Weight |
|---|---|
| `build` | **A** |
| `acceptance` | **T** |
| `note` | advisory |
| any stage, `fact` with `rests_on` filled | **A** |
| missing `stage` | fall back to the category table below, and record the fallback |

Category table, for a finding that arrived without a `stage`:
`coverage`, `seam`, `card`, `run` → **A**; `fact` with `rests_on` → **A**;
`fact` without `rests_on`, `other` → advisory.

- **A — goes out every round**, including one a previous round already attempted: a
  failed attempt did not close the gap. An A entry is the only kind that holds a
  plan.
- **T — travels.** Goes out with the round the way an A does, and never holds the
  plan: on approval it rides to `relay-reviewing-implementation` as an
  implementation note, where one test run settles in seconds what a plan reader can
  only argue about.
- **B — already attempted.** Advisory finding whose `root` matches a ledger entry:
  dropped. Match the thing, not the wording — would the fix be the same one?
- **C — first sighting.** New advisory finding: goes out once — unless its `guess`
  is `nothing`, meaning no card holder is left guessing. Then it is dropped and
  recorded like a B drop: nobody building is blocked by it.

`route: requester` skips the weight filter entirely — rules B and C cannot reach it.
It goes out with the rest.

**Goes out** means one thing throughout: into stage 3's question set, and from there
into stage 4's fix list together with the answer stage 3 returned for it. There is no
route that reaches the re-planner without passing the resolver first.

## Gates and exits

- Spec `## Acceptance` entries carried by a card: **100 %**.
- `## Behaviour` points with a test step **or a stated reason none is possible**:
  **90 %**. The review reports both fractions and names every miss; you compare the
  numbers.
- **Every miss the coverage report names becomes a ledger entry** — with a finding
  record or without one. Open it on the miss's own wording as `root`, `category
  coverage`, and route it like any other entry of that category. Copying the
  report's wording is a transcription, not a quality call: you are not deciding
  the miss is real, the review already did. A miss named in the report and carried
  by no record is the case this exists for — it is the one gap that, unrecorded,
  no round after this one can see.
- **A question the resolver cannot answer does not stop the run.** It comes back
  `requester` or `spec-defekt`, goes into `06-clarifications.md`'s `## Open for a
  human`, and its ledger entry stays open. Recording it is not pausing on it.
- **Four rounds.** With A findings open at the cap, the run ends, no plan approved.

Some findings leave the loop before the cap — see the ledger states in
`references/ledger.md`.

## What you write

Two files across the run, plus `03-spec-review.md` once at stage 0. All three are
yours alone — no subagent touches any of them.

`06-clarifications.md` carries resolver answers with their provenance, what is
still open for a human, and **every finding you dropped, with why**. Without that
last block your filtering is the one decision nobody can check. Template:
`references/ledger.md`. Record formats: `references/agent-contracts.md`.

`00-journal.md` gets one section per round, appended under
`## <date> — relay-orchestrating-plan-rounds`. Five slots, all **REQUIRED**, every
round, including a round where a slot's answer is "none":

- **lids out** — which ledger ids went to which stage.
- **came back** — which findings returned, and the lid each mapped onto.
- **dropped** — every finding you dropped this round and the rule that dropped it.
- **caps and weights** — every change to the round cap, and every finding whose
  weight came out other than its table row says, each with the reason.
- **off contract** — every deviation from a stage's contract this round: a stage
  dispatched with less than its contract's inputs, a full check replaced by a
  narrow one, a round deliberately narrowed to fewer findings than were open.

**Enforced, not just stated:** read the file's current full content before
writing. Your edit must be a pure addition — every byte already in the file must
still be there, unchanged, afterward. Never use a full-file overwrite tool for
this file; use an append-style edit.

`relay-reviewing-process` may read `00-journal.md` and nothing else. A decision
that shaped the loop and lives only in `06-clarifications.md` or in your own
ledger did not happen as far as that stage can tell.

You also run the git checkpoint after every dispatch — see *After Every
Dispatch: Verify, Then Checkpoint*, above. That commit is yours to make, not a
subagent's.

## Red flags

- Judging whether a finding is worth passing on. That call was made upstream.
- Reviewing the spec, or sending it back. It was approved before you were called;
  reopening it undoes a decision the requester already closed.
- Writing stage 0's approval section for a spec nobody signed off.
- Letting the resolver edit `04-plan.md`, or letting the re-planner settle a question
  the spec left open. Stage 3 answers, stage 4 fixes.
- Halting the run because the resolver returned `requester`. Record it, run on, let
  the cap decide what it costs.
- Downgrading an A finding, or dropping one because it came back. A reviewer
  calling something advisory, or staging it `note`, does not make it advisory if
  its own fields say otherwise — the table decides, and it reads the fields.
- Reading a finding's text and settling its `stage` yourself. The reviewer observed
  it. A finding that arrived without one falls back to the category table and gets
  a line in the journal's *caps and weights* slot; it does not become your call.
- Giving a subagent a file it does not need "for context".
- Reaching the cap with A findings open and approving anyway.
- Ending a round with a miss named in the coverage report and no ledger entry for
  it, because no finding record came with it.
- Skipping the post-dispatch integrity check or the git checkpoint because the
  round obviously went fine.
- Closing a round with no `00-journal.md` section of your own, or with a slot in it
  left off because the answer was "none".
- Treating unrelated uncommitted changes elsewhere in the repo as a reason to
  skip or delay the bundle-directory commit.
