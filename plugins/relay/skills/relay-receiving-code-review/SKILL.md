---
name: relay-receiving-code-review
description: Use when a review finding comes back — from an independent relay reviewing stage (relay-reviewing-plan, relay-reviewing-spec, relay-reviewing-implementation, or a task reviewer inside relay-subagent-driven-development) or from a human stakeholder giving ad hoc feedback — before implementing anything it asks for. Also use when a finding is unclear and only partly understood, when a finding names a "professional" feature nothing in the codebase calls, when about to agree with a finding before checking it against the codebase, or when a prior pushback against a finding turns out to have been wrong.
---

# Relay Receiving Code Review

## Overview

**Core principle:** verify before implementing, ask before assuming, technical
correctness over social comfort. A finding is a claim about the codebase, not
an instruction to be executed on trust.

This is a technique, not a relay stage. It carries no artifact file of its own
— see *Scope* below for where its outcome actually gets written.

## When to Use

Use whenever a review finding arrives and something is about to be done in
response to it:
- A round in `relay-reviewing-plan`, `relay-reviewing-spec`, or
  `relay-reviewing-implementation` comes back with a finding.
- A task reviewer inside `relay-subagent-driven-development` returns Issues or
  a Card Validity concern.
- A human stakeholder gives feedback on code, a plan, or a spec directly, in
  conversation.

**Use this ESPECIALLY when:**
- The finding looks obviously right and agreeing feels faster than checking.
- The reviewer is more senior, more experienced, or otherwise carries
  authority that makes pushing back feel uncomfortable.
- Several findings arrive together and some are unclear.
- A deadline makes "just implement what it says" tempting.

**Don't skip when:**
- The finding is one line and looks trivial — trivial findings can still be
  wrong about this codebase.
- Time is short — verifying once costs less than implementing a wrong fix and
  then reverting it.

## When NOT to Use

- **Nothing has come back yet.** This skill starts once a finding exists, not
  before.
- **The finding is that a card contradicts the spec or the plan itself.**
  That classification and its routing belongs to whichever stage owns it —
  `relay-executing-plans`'s *When a Card Cannot Be Finished as Written* or
  `relay-subagent-driven-development`'s *When a Card Is Not Trustworthy*. This
  skill governs how to receive and respond to an ordinary finding once that
  routing question is settled, not how to settle it.

## Scope: A Technique, Called From Inside Any Reviewed Exchange

`relay-receiving-code-review` is invoked wherever a relay reviewing stage
hands back a finding, or wherever a human gives feedback directly. It is not
a numbered stage, it has no request-folder artifact of its own, and it never
opens a new file to record itself in.

What this skill produces — the verification performed, the response given,
what was implemented and what was pushed back on — is written into whichever
record the calling context already keeps:

- A finding from `relay-reviewing-plan` or `relay-reviewing-spec`: the next
  round of that same review file, per its own append-only convention.
- A finding from `relay-subagent-driven-development`'s task reviewer: the fix
  report the implementer appends to on every round.
- Ad hoc feedback received while building a card: the card's entry in
  `06-implementation-log.md`, under **Deviations from the plan** if it changed
  what got built, or folded into the ordinary verification record if it
  didn't.

## The Response Pattern

```
WHEN a finding arrives:

1. READ: the complete finding, without reacting to it yet
2. UNDERSTAND: restate the requirement in your own words — or ask
3. VERIFY: check it against the codebase as it actually is
4. EVALUATE: is it technically sound for THIS codebase?
5. RESPOND: technical acknowledgment, or reasoned pushback
6. IMPLEMENT: one item at a time, testing each
```

## Forbidden Responses

**Never:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" — before step 3 has actually happened.
- Any expression of gratitude ("Thanks for catching that").

**Instead:**
- Restate the technical requirement.
- Ask a clarifying question.
- Push back with technical reasoning if the finding is wrong.
- Just start working — actions carry more information than agreement does.

**If about to write "Thanks":** delete it, state the fix instead.

## Handling Unclear Feedback

```
IF any item in a batch of findings is unclear:
  STOP — implement nothing yet
  ASK for clarification on the unclear items

WHY: findings can be related. Understanding three of six and guessing at the
rest produces an implementation built on a partial picture.
```

**Example:**

A round returns six findings. Four are clear, two are not.

- Wrong: implement the four clear ones now, ask about the other two later.
- Right: "Findings 1, 2, 3, and 6 are clear. Need clarification on 4 and 5
  before implementing anything."

## Source-Specific Handling

### Feedback given directly, in this conversation

- Treated as trusted — implement once understood.
- Still ask if the scope is unclear.
- No performative agreement, no thanks.
- Skip straight to action, or a short technical acknowledgment.

### A finding from an independent relay review, or an external reviewer

```
BEFORE implementing:
  1. Is it technically correct for THIS codebase?
  2. Does it break existing functionality?
  3. Is there a reason the current implementation looks the way it does?
  4. Does it hold across every platform/version this codebase supports?
  5. Does the reviewer show signs of having the full context?

IF the finding looks wrong:
  Push back with technical reasoning, in the same round/report the finding
  arrived in.

IF it can't easily be verified:
  Say so: "This can't be verified without [X]. Investigate, ask, or proceed?"

IF it conflicts with a decision `02-spec.md` or an earlier round already
recorded:
  Stop, and route it exactly as relay-executing-plans / relay-subagent-
  driven-development's own card-validity handling already describes — do not
  resolve it here by picking a side.
```

**Working rule:** treat an independent finding with real scrutiny, but check
it carefully rather than dismissing it on reflex either.

## YAGNI Check for "Professional" Findings

```
IF a finding suggests "implementing this properly" (more configurability, a
more complete feature, broader error handling than the card asked for):
  Search the codebase for actual callers/usage of what's being extended.

  IF unused: "Nothing calls this. Remove it instead (YAGNI)?"
  IF used: implement it properly.
```

A finding and the person receiving it both answer to the same spec and the
same requester. Neither gets to add scope the card never asked for just
because it would look more complete.

## Implementation Order

```
FOR a batch of findings:
  1. Clarify everything unclear, first.
  2. Then, in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually.
  4. Verify no regressions before moving to the next.
```

## When to Push Back

Push back when a finding:
- Breaks existing functionality.
- Comes from a reviewer who is missing context this codebase has.
- Violates YAGNI — asks for an unused feature.
- Is technically wrong for this stack.
- Exists for a legacy or compatibility reason the finding doesn't account for.
- Conflicts with a decision the spec or an earlier round already recorded.

**How:** technical reasoning, not defensiveness. Specific questions. A
reference to a working test or a specific line of code. Route to the stage
that owns the decision (`relay-refining` for a requirement question,
`relay-planning` for a plan defect) when the disagreement is architectural
rather than local.

## Acknowledging Correct Feedback

```
"Fixed. [what changed]"
"Confirmed — [specific issue]. Fixed in [location]."
[Just fix it, let the diff show it]

Never: "You're absolutely right!" / "Great point!" / "Thanks for catching
that!" / any gratitude expression.
```

Actions carry the acknowledgment. State the fix, not the feeling about the
feedback.

## Correcting a Wrong Pushback

If pushback turns out to have been wrong:

```
"Checked [X] — it does [Y], the pushback was wrong. Implementing now."
"Verified this and the finding is correct — my read was wrong because
[reason]. Fixing."
```

No long apology, no defending the original pushback, no over-explaining.
State the correction factually and move on.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Performative agreement | State the requirement, or just act |
| Blind implementation | Verify against the codebase first |
| Batch implementation without testing each | One at a time, test each |
| Assuming the finding is right because it's a review | Check whether it actually breaks anything |
| Avoiding pushback out of discomfort | Technical correctness outranks comfort |
| Partial implementation while some items stay unclear | Clarify every item first |
| Proceeding when a finding can't be verified | State the limitation, ask for a direction |

## Real Examples

**Performative agreement (bad):**

Finding: "Remove the legacy code path."
Bad response: "You're absolutely right! Removing it now..."

**Technical verification (good):**

Finding: "Remove the legacy code path."
Good response: "Checked — this build still targets a platform version that
needs it for compatibility. The current implementation has the wrong bundle
ID, though. Fix that, or drop support for the older platform?"

**YAGNI (good):**

Finding: "Implement proper metrics tracking here — database-backed, date
filters, CSV export."
Good response: "Searched the codebase — nothing calls this endpoint. Remove
it instead (YAGNI)? Or is there a caller I'm missing?"

**Unclear batch (good):**

Six findings arrive; four are understood, two are not.
Good response: "Understand findings 1, 2, 3, 6. Need clarification on 4 and 5
before implementing anything."

## Rationalization Table

| Excuse | Reality |
|---|---|
| "It's a review finding, it's probably right" | A finding is a claim, checked the same way any other claim about this codebase is checked. |
| "Pushing back on a more senior reviewer feels risky" | Technical correctness for this codebase outranks social comfort. State the reasoning; that is the job, not an act of defiance. |
| "I understand most of the batch, I'll start on those" | Findings can be related — partial understanding produces a wrong implementation on the parts that looked clear. |
| "Saying thanks costs nothing" | It reads as agreement before verification happened. State the fix instead. |
| "This finding wants it done properly, so I'll add the configurability" | Grep for a caller first. Unused means remove, not extend. |
| "I can't verify this easily, I'll just implement it and see" | Say the limitation out loud and ask, rather than guessing and finding out from the next round. |
| "I was wrong about my pushback, better explain myself thoroughly" | State the correction factually and move on — a long explanation is the same performance as the agreement this skill forbids, aimed the other way. |

## Red Flags

- "You're absolutely right!" or any close variant.
- Any expression of gratitude toward a reviewer.
- Implementing before checking the finding against the actual codebase.
- Starting on the clear items in a batch while some remain unclear.
- Agreeing with a finding because pushing back feels uncomfortable.
- Adding scope a finding gestured at but nothing in the codebase calls.
- A long apology or defense after a wrong pushback, instead of a factual
  correction.

## Quick Reference

| Step | What happens | Done when |
|---|---|---|
| READ | Take in the whole finding | No reaction written yet |
| UNDERSTAND | Restate it, or ask | The requirement is stated in one's own words, or a question is asked |
| VERIFY | Check against the actual codebase | The claim is confirmed or contradicted by something concrete |
| EVALUATE | Judge fit for this codebase | A verdict exists: sound, wrong, or unverifiable |
| RESPOND | Acknowledge or push back | The response is technical, not performative |
| IMPLEMENT | Act on it, one item at a time | Each item is tested before the next starts |
