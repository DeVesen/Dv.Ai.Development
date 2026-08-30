---
name: relay-executing-plans
description: Use when relay-plan-execution has routed here to build an approved plan solo, in one session, with no independent per-card reviewer. Also use when a task card turns out to be wrong mid-build, when about to fix a failing test no card names, when about to keep building later cards while an earlier one is stopped, or when about to report work finished without writing down the commands that prove it.
---

# Relay Executing Plans

## Overview

Reached only by hand-off from `relay-plan-execution`, after the gate opened and
this path — one session, no independent per-card review — was chosen over
`relay-subagent-driven-development`. It turns `04-plan.md` into the change it
describes, and into `06-implementation-log.md` — the record the review after it
is held to. It is not the stage that decides what the code should do, and it is
not the stage that repairs the plan.

Core principle:

> Under test, every implementer verified honestly and then threw the evidence
> away. The commands were run, the output was read, the conclusions were right —
> and all of it went into a reply that scrolls past, while the file the next
> stage reads was never written. The work was real. The record was not.

And the second one:

> A card that turns out to be wrong gets absorbed. Every implementer handed a
> defective card reasoned about it carefully, worked around it sensibly, and told
> nobody who could fix it. The plan still says the wrong thing, and the next
> person to open that card will make the same discovery alone.

And a third, specific to building alone: **a blocked card does not make the
other cards urgent.** Under test, an agent that correctly stopped at a blocked
card then kept building the ones after it "to use the time well" — the same
instinct that looks like discipline (don't sit idle) is what quietly builds
three more cards on top of a plan already known to be wrong at card two.

## When to Use

- `relay-plan-execution` named this stage as the chosen build path.
- A card is part-built and its Done-when has not been run.

## When NOT to Use

- **You were not routed here by `relay-plan-execution`.** That stage owns the
  gate and the choice between this skill and `relay-subagent-driven-development`.
  Arriving here any other way means neither was checked.
- **The plan is what is being reviewed.** That is `relay-reviewing-plan`.
- **The built change is what is being reviewed.** That is
  `relay-reviewing-implementation`, and it reads what you write here.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`. Read from disk, never
from live session memory: `04-plan.md`, the thing you build; `02-spec.md`,
because its `## Acceptance` entries are what the finished change is answerable
to and no card is allowed to change them; `00-journal.md`, for what earlier
stages decided, including `relay-plan-execution`'s own section confirming the
gate was open and this path was chosen. Say in your first message which you
found.

Then find out how this project is built, tested and searched, and how it
tracks changes — from its own files and its own conventions, not from habit.

**This stage writes exactly two files:** `06-implementation-log.md` and its own
appended section of `00-journal.md`, plus the files `04-plan.md`'s `## Files`
section names. Nothing else. It never edits `04-plan.md`, `02-spec.md` or any
review file.

## Running One Card

**Before the first card, establish the baseline.** Run the project's checks on
the tree as you found it and write down what they report — the counts, the
statuses, the names of anything already failing. Without it you cannot tell
your own breakage from what was already there.

Then, per card, in the plan's order: build what the `Steps` say; run the
card's **Done-when**; record it.

**Read the card you are on, and do not read ahead.** A card you complete using
something you learned from a later card passes here and fails for anyone who
is ever handed it alone — the very thing choosing this path over
subagent-per-task accepted as a trade-off. **Say in the log which cards you had
already read** when you built each one; the next stage cannot otherwise tell a
self-contained card from one that survived on your memory.

**The Done-when is run, not read.** A card is done when its own condition has
been executed and the output says so — not when the code looks right, not when
the change is obviously correct, not when the person waiting says that is
enough.

**What the card names as expected is expected. Anything else is yours.** A
well-written card tells you which foreign failures to expect, by name. A
failure it does not name is your card's, and it is not made someone else's by
being inconvenient.

**Do not make a failure go away by editing a file this card does not name.** If
the card's `Files` does not list it, it is not yours this card, however small
the edit would be.

## Evidence Is Written Down, Not Just Produced

This is the finding this stage exists to fix, and it is not about honesty.
Verifying well under pressure and then not recording it produces the same gap
as not verifying at all — the next stage reads a folder, not your reply.

> Every "done" and every "met" in the log names **the command that was run and
> what that command printed** — the counts, the exit status, the failing name.
> Not "the tests pass". Not "verified". Not "as expected".

And its other half:

> A check you did not run is recorded under `## Verification not run`, with the
> reason. It is never recorded as met, and it is never left out.

## When a Card Cannot Be Finished as Written

A plan that survived review can still be wrong, because decomposing is not
building, and some things are only visible from inside the file.

**Stop at that card.** Do not carry on into cards that come after it, and do
not reorder the plan to keep busy — the order is `relay-planning`'s, and
building three more cards on a plan you already know is wrong at this one
manufactures rework, it does not save time. Building later cards while an
earlier one is stopped is not "using the 25 minutes well" — it is spending
them on cards whose own upstream assumptions may already be broken. What is
already built and verified before the stop stays built; it is a fact with
evidence behind it, not a claim.

Then classify it by **which document is wrong**, name that in the log, and
hand off to the stage that owns it:

| What you found | Where it goes |
|---|---|
| The card says something untrue about the code, names a file or artifact that does not exist, contradicts another card, or cannot be carried out as written — and `02-spec.md` is right | **`relay-planning`**. Layer-level: the plan is wrong. |
| The card is faithful to the spec, and the spec itself is ambiguous, contradictory, or silent about something the code has to do | **`relay-refining`**. Requirement-level. |
| The card is right and your code is wrong | **Nobody.** Fix it here. |

If you cannot tell which of the first two it is, treat it as requirement-level.
A redundant pass through `relay-refining` costs a conversation; a spec defect
implemented costs the build.

**Do not repair `04-plan.md`.** Naming the defect precisely is this stage's
job; rewriting the card is `relay-planning`'s.

**A Done-when you cannot run is this case, not a Done-when you may tick.** A
card that requires validating against a file that does not exist in the
project has failed its own condition, whatever else you checked by hand
instead.

**Two attempts, then stop.** If a card fails its own Done-when twice for the
same reason, stop and record it rather than going round again.

## Write `06-implementation-log.md`

No code in it — not a function body, not a diff, not a patch. It says where the
changes are, what was done, what was run, and what the run printed.

Every heading is **required**, in this order, including the ones whose honest
content is "none".

```markdown
# Implementation log — <request-id>-<slug>

## Where the changes are
<The pointer, not the content. Revision/commit identifiers and branch or
change-set name, if the project has such a thing. If not, or nothing was
made, say so and list every file created or modified with one line on what it
is responsible for.>

## Execution
<Confirms this was built via relay-executing-plans (solo, one session), per
relay-plan-execution's hand-off. Which cards you had already read when you
built each one.>

## Baseline before anything changed
<What the project's checks reported on the tree as found: counts, statuses,
and the name and message of anything already failing.>

## Tasks
### Task <n> — <name> — <done | not done | stopped>
**What was done** — <one short paragraph, in terms of behaviour>
**Files** — <the paths actually touched>
**Verification run** — <the exact command, and what it printed: the counts,
the exit status, the failing names.>
**Done when** — <the card's condition, and which line above shows it met; or
NOT MET and exactly what is missing>

## Deviations from the plan
<Per deviation: which card, what it said, what was actually true, its bucket
(plan / requirement-level), where it was routed, and whether the card was
finished. A bug of your own that you fixed is not a deviation. "None" if none.>

## What is not done
<Every card not marked done, and every acceptance entry in `02-spec.md` not
demonstrated. "Nothing" if nothing.>

## Verification not run
<Every check the plan asked for that was not run here, and why. "Nothing" if
nothing. A check with no result is recorded here, never as a pass.>
```

`## Deviations from the plan`, `## What is not done` and `## Verification not
run` are **written even when empty**.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage.

```markdown
## <date> — relay-executing-plans
<2-4 sentences of prose: what the verification actually showed including
anything already failing before you started, any card that could not be
finished as written and where it went, and any pressure this stage ran under
that a later reader would want to know about.>
```

## Hand Off

End with exactly this shape: (1) a **status line** — what was built, how many
cards are done, and the exact path of `06-implementation-log.md`; (2) the
**successor**, `relay-reviewing-implementation` — or, if a card was stopped,
the stage its deviation was routed to; (3) **one question** offering three ways
forward — continue with that successor / go to a different step instead / stop
here.

Never invoke the successor yourself.

## Rationalization Table

| Excuse | Reality |
|---|---|
| "Card 2 is blocked, but I can get 3 and 4 done while that's sorted out." | Card 3 or 4 may already be building on what card 2 was supposed to establish. Using the time on cards that might need redoing is not using it well. |
| "The findings are nitpicks about the plan document, not about what we're actually building." | The stage whose job it is will close them in one pass. |
| "One orthogonal fix — it turns the suite green and gives whoever implements this a measurable 'the suite passes'." | It changed what the software computes, with no card and no requirement behind it, and erased the baseline that lets the next person tell their breakage from the one already there. |
| "As asked, I didn't play either of them back, and I didn't touch the plan." | Half right. Not touching the plan is correct. Not naming the defect anywhere durable is how the next holder of that card rediscovers it alone. |
| "There's a flaky test in there, ignore it — it's unrelated." | Flaky is a claim somebody made. Deterministic or not is something you find out by running it. |
| "Just tell me when it's done and I'll take your word for it." | Then the log is the only thing left standing when the demo is over. Write down what the command printed. |

## Red Flags

- "I'll keep the later cards moving while this one's blocked."
- "The review's findings are only about the document."
- "While I'm here, this failing test is a one-line fix."
- "I'll note it in my reply." (as the record of a plan defect)
- "The tests pass." / "Verified." / "As expected." (as the log entry)
- "It's flaky." (without having run it)
- Changing a file the card's `Files` line does not name.
- Starting a card after an earlier one was stopped.
- Reaching the end without having written `06-implementation-log.md`, or with
  `## Deviations`, `## What is not done` or `## Verification not run` missing.
- Ending without a status line, a named successor, and a question.

## Worked Example

A four-card plan for a reporting command, routed here by `relay-plan-execution`
because a demo was 25 minutes out. Baseline before card 1: one pre-existing
failing test, named by every card, cards told to leave it alone.

Card 2's Done-when requires validating output against a schema file that does
not exist anywhere in the project. Checked twice — genuinely absent, not a
path error. **Stop at card 2.** Card 1 stays done, with its evidence. Cards 3
and 4 are **not started**, even though 25 minutes felt like enough time to
"get ahead" on them — card 3 consumes card 2's output shape, and building it
against an unverified guess about that shape would manufacture a second
rework, not save the first one.

Deviation is layer-level (the card names a file that does not exist; spec says
nothing about a schema) → `relay-planning`. Handed off:

> Implementation log written to `.../06-implementation-log.md`. One card of
> four done — the option parsing, 19/19 tests passing, alongside the one
> pre-existing failure every card names. Stopped at card 2: its Done-when
> validates against `schemas/export.schema.json`, which does not exist in this
> project. Cards 3 and 4 are not started, since card 3 consumes card 2's
> output. Layer-level defect → `relay-planning`. One check recorded as not
> run: card 2's schema validation. Continue with `relay-planning`, go to a
> different step, or stop here?
