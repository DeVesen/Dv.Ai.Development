---
name: relay-planning
description: Use when an approved spec has to become the plan work is handed out from, when someone asks for a task breakdown, cards for a board, or work to hand out because people are idle tomorrow, or when a plan review sent findings back to planning. Also use when about to write "TBD", "add error handling", "similar to task N", or a task whose done-condition needs a value nobody has yet.
---

# Relay Planning

## Overview

Fourth stage of the relay. It turns an **approved** `02-spec.md` into `04-plan.md` —
an ordered decomposition into tasks, each of which one person implements alone and a
different person reviews before the next starts.

Core principle:

> Every implementer sees only their own task card. A question the plan does not
> answer is not deferred — it is silently delegated to whoever opens that card. So a
> plan may not carry an open question in any form: not as a `TBD`, not as a
> fact-finding task, not as "goes in configuration", not as "the implementer
> proposes it at review".

**This stage writes exactly two files:** `04-plan.md` and its own appended section
of `00-journal.md`.

## The Gate

Artifact home: `docs/relay/<request-id>-<slug>/`, `<request-id>` = `YYYY-MM-DD` from
your environment. A `## Relay process discipline` section in the project's
always-loaded instruction file overrides home and artifact language.

Before anything else, read `03-spec-review.md`. Its **latest** `## Round <n>`
section must say `approved`. If it does not — or if `02-spec.md` or the review file
is missing — write no plan: name the stage that has to run (`relay-refining` for a
missing or rejected spec, `relay-reviewing-spec` for a missing review) and stop. Do
not review, edit, or replace the spec yourself; the gate exists to preserve an
independent look at the spec by a stage that has not already decided how to build it.

## Planning Inputs

Read `02-spec.md` from disk — never plan from live session memory of it. Open any
other file only when a specific line you are about to write needs it: the exact path
going into a task's *Files*, the exact signature going into a *Consumes*. No
codebase warm-up sweep.

**Facts vs. decisions.** When something is missing, ask: *does a document, file,
system or sample already contain the answer?*

- **Yes — a fact.** Read it, or put one targeted question to whoever has it (the
  requester or their proxy — in an agent setup, the intermediary agent holding spec
  and intake), **before** the plan is written. Never as a task at the front of the
  plan, and never code written against a runtime or interface nobody confirmed.
- **No — a decision.** Apply the test: *would two different answers change anything
  the requester can see or check?* If yes, it belongs to the spec. Report it as an
  open question; **if any task would have to implement it, the plan is not
  written** — no partial plan, no "safe" subset, no parked task. If no, it is
  planning's to take: record it in `## Decisions taken at planning` with the spec
  anchor that leaves it open.

## Structure Before Tasks

Before the first task, write `## Files and what each is responsible for`: every file
created or modified, one row each, with its responsibility and the task that touches
it. One responsibility per file; split by responsibility, not by technical layer;
follow the codebase's established patterns.

## Task Boundaries and Cards

A task is the smallest unit that carries its own test cycle and is worth a fresh
reviewer's gate: could a reviewer approve this task while rejecting its neighbour?
If not, they are one task. A two-requirement spec gets one or two tasks — do not
manufacture a decomposition.

Four slots per task, all required, because the implementer has nothing else:

- **Files** — every file this task touches, by exact, verified path, tagged
  `Create:`, `Modify:`, or `Test:` so the implementer knows what already exists
  and what they are adding.
- **Consumes** — exact names and signatures taken from earlier tasks, written out in
  full; or "nothing".
- **Produces** — exact names and signatures later tasks consume; copy them verbatim
  into those tasks' *Consumes*.
- **Done when** — checkable today, by that implementer, with only this card.

**Steps** use checkbox syntax (`- [ ] Step N: ...`), each one action of a few
minutes, following the test cycle: write the failing test, run it and confirm the
failure, implement, run it again and confirm the pass.

- An implementation step whose deliverable is code **is** the code, in a fenced
  block — never a description of what the code should do.
- A step that writes tests is **one line per test**, and that line has two parts:
  the test's own name, and the assertion in words — the state it starts from, the
  act, and the one thing it asserts. That line plus the run step's exact command
  is the whole test step:

  ```
  - [ ] Step 1: Write the failing tests
  `Rejects_UnknownStatus` — a payload whose status is "frobnicated" gets a 400
  back and writes no row.
  `Accepts_KnownStatus` — a payload whose status is "settled" gets a 200 back and
  writes exactly one row.
  ```

  Test lines are the one place where reading is not the check that counts: the
  reviewer cannot compile them, and running them can. So they stay one line each,
  and the test run in `relay-subagent-driven-development` is what proves them.
- A step that runs something names the exact command and the exact result to
  expect, literally, not "run it and check":

  ```
  - [ ] Step 2: Run the test
  Run: `dotnet test --filter FullyQualifiedName~ReconcileTests.Rejects_UnknownStatus`
  Expected: FAIL — `Rejects_UnknownStatus` not found (test not yet compiled)
  ```

  and, after the implementation step:

  ```
  - [ ] Step 4: Run the test again
  Run: `dotnet test --filter FullyQualifiedName~ReconcileTests.Rejects_UnknownStatus`
  Expected: PASS
  ```

No commit step: how the plan is executed — and whether or when to commit — is
`relay-plan-execution`'s choice, not this stage's. The step cycle stops at the
verified pass.

## Forbidden in the Plan

`TBD` in any wording; "add appropriate error handling / validation" without the
handling written out; "write tests" without the test lines; "same shape as Task N"
(its holder never sees Task N — repeat it); a reference to anything no task defines;
a fact-finding task later tasks depend on; a value that "goes in configuration"; "the
implementer proposes it at review"; a blocked or parked task; a timebox standing in
for a decomposition; a run step with no exact command or no stated expected result.
The test underneath: **read each card as the only thing you can see — could you
finish it today, alone?**

## Check Your Own Draft, Once

Three checks on the finished draft — a pass you run, **not text you write**; the
reviewer derives coverage from the cards and ignores any self-check in the plan.

1. **Coverage, both directions.** Every `## Behaviour` **and every `## Acceptance`**
   entry points at a task; every task carries a requirement.
2. **Read-it-alone** on every card.
3. **Names match**: every *Consumes* matches an earlier *Produces*, character for
   character.

Fix what you find inline, then stop — no second pass. An independent reviewer runs
next.

## Write `04-plan.md`

```markdown
# Plan — <request-id>-<slug>

## What is being built
<One short paragraph, in behavioural terms.>

**Architecture** — <2-3 sentences: how the tasks fit together, the approach in
outline>
**Tech Stack** — <libraries, frameworks, runtimes the tasks depend on; "unchanged
from the existing stack" if nothing new>
**Spec** — `02-spec.md`

## Global Constraints
<Copied verbatim from `02-spec.md`'s `## Constraints` section; "none stated" if the
spec has none. Never invented. The plan reviewer checks every card against these.>

## Files and what each is responsible for

## Decisions taken at planning
<Each: the decision, the spec anchor that leaves it open, why this answer. No entry
changes anything the requester can observe.>

## Tasks

### Task <n> — <name>
**Files** — Create: / Modify: / Test: ... (exact, verified paths)
**Consumes** — ...
**Produces** — ...
**Steps** — checkbox steps; implementation steps contain the actual code; a test
step is one line per test — its name plus the assertion in words; a step that runs
something states the exact command and the expected result
**Done when** — ...
```

The plan ends with the last task — no coverage table, no self-check section.

## Journal, Hand-Off, Re-Entry

Append 2–4 sentences of prose to `00-journal.md` under `## <date> — relay-planning`:
how the work was cut, which decisions planning took, anything that turned out to be
a readable fact.

**Enforced, not just stated:** read the file's current full content before
writing. Your edit must be a pure addition — every byte already in the file
must still be there, unchanged, afterward. Never use a full-file overwrite
tool for this file; use an append-style edit.

End with exactly: (1) status line — plan written, task count, exact path; (2) the
successor `relay-reviewing-plan`; (3) one question — continue with the successor /
different step / stop. Never invoke the successor yourself. When the gate closed,
same shape with the gate's stage as successor.

**Sent back by the review — or re-entered by the orchestrator with a list of
findings:** read `05-plan-review.md`'s findings (or the supplied finding list) and
the current plan; bring every named finding to closure. Report back one line per
finding id: `closed` (fixed, plus what changed), `cannot-close` (plus the reason —
usually the spec does not say what happens here, so it routes to the resolver at
once), or `not-a-defect` (plus why the finding does not hold). Never guess an
answer nobody can check just to mark something `closed`. Then run the one draft
pass over the whole plan and hand off again. The plan is only ever the current
text — no superseded tasks kept for traceability.

## Red Flags — Stop, You Are Mid-Violation

- "It's safe to hand out the parts that aren't affected." / "I'll park that one."
- "That goes in configuration." / "Reversible — confirm on her return."
- "The implementer can propose that at review." / "Fill in the host before hand-out."
- "Task 1 finds that out." (and later tasks are already written)
- "Same shape as Task N." / An implementation step with no actual code in it.
- "Run it and check it works" — no exact command, no stated expected result.
- "There's no review file, so I'll review the spec myself."
- A fixer response with no `closed` / `cannot-close` / `not-a-defect` line for one
  of the findings it was handed.
- Writing any file other than `04-plan.md` and `00-journal.md`.

A full worked example — an approved spec, a requirement-level gap found during
decomposition, and the refusal that replaces the plan — is in
`references/worked-example.md`.
