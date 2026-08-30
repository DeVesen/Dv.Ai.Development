---
name: relay-debugging
description: Use when a bug, test failure, or unexpected behaviour turns up while working a task card, including a Done-when that keeps failing for the same reason. Also use before proposing any fix, when a fix attempt did not work, when tempted to change several things at once to make a failure go away, or when a card's own failure is being explained away as unrelated or pre-existing without having run it.
---

# Relay Debugging

## Overview

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

This is a technique, not a relay stage. It carries no artifact file of its own
— see *Scope* below for where its findings actually get written.

## When to Use

Use for any technical issue met while building a card:
- A test failure, including a Done-when that fails.
- A bug surfacing in code the card touches.
- Unexpected behaviour — output, state, or a log line that doesn't match what
  the card or the spec says should happen.
- A build or integration failure blocking the card.

**Use this ESPECIALLY when:**
- A demo or deadline is close and a guess feels faster.
- "Just one quick fix" seems obvious.
- A previous fix for the same failure didn't hold.
- The failure isn't fully understood yet.

**Don't skip when:**
- The bug looks simple — simple bugs have root causes too.
- There's no time to spare — guessing and rebuilding costs more than
  investigating once.
- Someone waiting on the card says the fix looks fine — looking fine is not
  the Done-when passing.

## When NOT to Use

- **Nothing is broken yet.** Writing code from a plan's `Steps` is the build
  stage's ordinary work, not this skill's.
- **The question is which document is wrong** — the card, the plan, or the
  spec — rather than why the code misbehaves. That classification, and the
  handoff to `relay-planning` or `relay-refining`, belongs to whichever
  calling stage already owns it (`relay-executing-plans`'s *When a Card
  Cannot Be Finished as Written*, or `relay-subagent-driven-development`'s
  *When a Card Is Not Trustworthy*). This skill is for the case left over
  once the card and the spec are confirmed right and the code is wrong.

## Scope: A Technique, Called From Inside a Build Stage

`relay-debugging` is invoked from inside `relay-executing-plans` or
`relay-subagent-driven-development` while a card is being worked. It is not a
numbered stage, it has no request-folder artifact of its own, and it never
opens a new file to record itself in.

Everything this skill produces — what was investigated, the hypothesis, what
was tried, what held — is written into whichever record the calling stage
already keeps:

- Under `relay-executing-plans`: the card's entry in
  `06-implementation-log.md`, per its own **Evidence Is Written Down, Not Just
  Produced** rule — every claim names the command run and what it printed, not
  "verified" or "the tests pass".
- Under `relay-subagent-driven-development`: the ledger, plus the fix report
  the implementer already appends to on every round of its fix loop.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Phase 1 is not optional groundwork — until it's done, there is no fix to
propose.

## The Four Phases

Each phase completes before the next starts.

### Phase 1: Root Cause Investigation

**Before attempting any fix:**

1. **Read the failure completely.** Don't skip past a warning to get to the
   error. Read the whole stack trace. Note exact line numbers, file paths,
   and error codes — they often already say what's wrong.

2. **Reproduce it on purpose.** Can it be triggered reliably? What are the
   exact steps? Does it happen every time? If it won't reproduce, gather more
   data — a fix aimed at a failure nobody can reliably trigger is a guess
   wearing a fix's clothes.

3. **Check what changed.** What's different since this last worked? Diff
   against the last known-good state, recent commits, new dependencies,
   config or environment differences.

4. **Gather evidence across component boundaries.** When the system the
   failure crosses has more than one component — a request handler calling a
   service calling a datastore, a pipeline stage feeding the next — add
   diagnostic logging at every boundary before proposing anything:

   ```
   For EACH boundary between components:
     - Log what enters this component
     - Log what leaves this component
     - Verify config/state actually propagated across the boundary

   Run once. The evidence shows WHERE it breaks.
   THEN investigate that one component specifically.
   ```

   **Example.** A report endpoint returns stale totals. The path is
   `HTTP handler → aggregation service → datastore`. Rather than guessing
   which layer is wrong, log at each seam in one pass: the handler logs the
   request parameters it received; the service logs the query it built from
   them and the row count the datastore returned; the datastore's own query
   log shows what actually ran. One request through all three shows the
   handler passed the right date range, the service built a query for the
   *previous* range, and the datastore answered that wrong query correctly.
   The service is where it breaks — not the handler that looked suspicious
   first, and not the datastore that returned a technically-correct answer to
   the wrong question. **Fix at the service, where the range is
   miscomputed — not by patching the handler's output or re-querying the
   datastore twice to average away the discrepancy.** A fix at either of
   those would have hidden the same wrong query behind different symptoms.

5. **Trace data backward when the error is deep in a call stack.** Where does
   the bad value originate? What called this with that value? Keep tracing up
   until the source is found, and fix there — not at the frame where the
   symptom happened to surface.

### Phase 2: Pattern Analysis

**Find the pattern before touching code:**

1. **Find a working example.** What similar code in this codebase already
   works?
2. **Read any reference implementation completely**, not skimmed, before
   applying its pattern. Partial understanding of a pattern reproduces the
   bug in a new shape.
3. **List every difference** between the working case and the broken one,
   however small. Don't assume a difference "can't matter" — that assumption
   is exactly what's being checked.
4. **Understand what the broken code depends on** — other components,
   settings, config, environment, assumptions it makes about its caller.

### Phase 3: Hypothesis and Testing

**Scientific method, not trial and error:**

1. **Form one hypothesis.** Write it down: "I think X is the root cause
   because Y." Specific, not vague.
2. **Test it with the smallest possible change.** One variable at a time.
   Don't bundle a second unrelated fix into the same test.
3. **Verify before continuing.** Worked → Phase 4. Didn't work → form a *new*
   hypothesis, don't pile another change on top of the failed one.
4. **When genuinely unsure, say so.** "I don't understand X yet" beats a
   guess dressed as a conclusion. Investigate further before proposing
   anything.

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Write a failing test first.** Simplest reproduction that fails for the
   root cause identified — automated if the project has a framework for it,
   a one-off script if not. This must exist before the fix does.
   **REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development` for
   writing the failing test properly, if that skill is available.
2. **Implement one fix.** Address the root cause found in Phase 1. One
   change. No incidental cleanup, no "while I'm here" edits — those belong to
   a card that names them, not this one.
3. **Verify the fix**, and write down what verifying it looked like: the
   command run and what it printed, not "it works now". This is the same
   discipline `relay-executing-plans` already requires of every Done-when —
   see *Scope* above for exactly where that evidence goes.
4. **If the fix doesn't hold:** stop, and don't reach for a fourth idea
   before re-reading what the first attempt actually showed. Go back to
   Phase 1 with what was just learned.

**This skill does not add a third retry-count on top of the ones the calling
stage already enforces.** `relay-executing-plans` stops a card after its
Done-when has failed twice for the same reason; `relay-subagent-driven-
development`'s fix loop runs up to five rounds before its round-5 breaker
adjudicates. A Phase 3/4 hypothesis-and-fix cycle that doesn't hold is one use
of whichever of those budgets is already running — this skill supplies the
method for what happens *inside* each attempt, not a separate counter next to
it. When that caller's budget is spent and the failure still isn't fixed, that
is this skill's own escalation point, described next — treat it exactly as
seriously as systematic debugging's original "three failed fixes mean a wrong
architecture" threshold, inside whatever number of attempts the caller
actually allows.

**When the budget runs out without a fix, that is evidence, not defeat.** A
pattern across the failed attempts is worth naming before handing back:
- Each attempted fix revealed new shared state, coupling, or a related
  problem somewhere else.
- Each fix would have needed a larger rewrite to actually hold.
- Each fix produced a new symptom instead of removing the old one.

That pattern means the architecture, not the latest hypothesis, is what's
wrong. **Stop. Do not attempt another fix.** Write down, in whichever record
Scope above names for the calling stage: what was tried, in what order, what
each attempt showed, and why the pattern above looks architectural rather
than like one more missed hypothesis. Hand that back through the calling
stage's own route for a card that can't be finished as written —
`relay-executing-plans`'s *When a Card Cannot Be Finished as Written*, or
`relay-subagent-driven-development`'s *When a Card Is Not Trustworthy* — using
whichever of those two paths the finding actually fits: a card or spec defect
routes to `relay-planning` or `relay-refining` exactly as those sections
already describe; a genuinely architectural problem with correct code built
from a correct card is not a document defect, and gets named as exactly that
in the calling stage's log for whoever picks the card up next, rather than
forced into either routing. **No new artifact file is created for this** —
see *Scope*.

## When the Process Finds No Root Cause

If a full pass through Phases 1-3 shows the failure is genuinely
environmental, timing-dependent, or external — not incomplete investigation:

1. The process has still been completed, not skipped.
2. Write down what was investigated and ruled out.
3. Implement the appropriate handling for that class of failure (retry,
   timeout, a clear error) as the fix.
4. Note it for whoever reviews the card — this class of failure is worth a
   second look before being accepted as "just flaky."

Most failures that look like "no root cause" are an incomplete Phase 1, not a
real absence of one. Treat this outcome as rare, not as a shortcut.

## Rationalization Table

| Excuse | Reality |
|---|---|
| "This failure's simple, doesn't need the process" | Simple failures have root causes too. The process is fast precisely because the fix is simple once the cause is found. |
| "Demo's in 20 minutes, no time to investigate" | A guess that misses costs the 20 minutes and the demo. Investigating once is faster than guessing twice. |
| "I'll try this first, then look into it properly" | The first attempt sets what gets built on top of it. Do the investigation before the first change, not after. |
| "I'll add the test after confirming the fix works" | A fix without a failing test first is unproven — "it looks fixed" is not evidence it stays fixed. |
| "Changing a few things at once saves a round" | Nothing isolates which change did anything. A second bug can hide behind the first fix. |
| "The reference pattern's long, I'll adapt the gist of it" | A partially-understood pattern reproduces the bug in a new shape. |
| "I can see the problem, let me just fix it" | Seeing a symptom is not the same as knowing its cause. |
| "One more attempt" (after the calling stage's budget is already spent) | That budget being spent is the signal to stop and hand back, not a suggestion to find one more idea. |
| "This test's flaky, ignore it" | Flaky is a claim. Run it and find out — see Phase 1 step 2. |
| "It's probably X, let me just change that" | "Probably" without reproduction is a guess. Confirm with evidence before touching code. |

## Red Flags

Any of these means stop and return to Phase 1:

- "Quick fix now, investigate properly later."
- "Just try changing X and see if it works."
- "Change a few things, then run the tests."
- "Skip the test, I'll check it by hand."
- "It's probably X" — stated before reproducing it.
- "I don't fully understand this, but it might work."
- "The reference does X, but I'll adapt it differently" — without having read
  it completely first.
- Listing candidate fixes before tracing the data flow.
- "One more fix attempt" — when the calling stage's own attempt budget is
  already spent.
- Each attempted fix reveals a new problem in a different place.
- "That failure's unrelated" or "that's pre-existing" — said without having
  run it.

## Quick Reference

| Phase | Key activities | Done when |
|---|---|---|
| 1. Root Cause | Read the failure, reproduce it, check recent changes, gather cross-boundary evidence | The failure is understood: what happens and why |
| 2. Pattern | Find a working example, read the reference fully, list every difference | Every relevant difference is named |
| 3. Hypothesis | State one theory, test the smallest change that could confirm it | Confirmed, or a new hypothesis is formed |
| 4. Implementation | Write the failing test, make the one fix, verify and write down what verifying showed | The card's failure is gone and the record says how that was checked |
