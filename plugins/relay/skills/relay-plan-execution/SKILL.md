---
name: relay-plan-execution
description: Use when an approved plan is about to be built and nobody has yet said which way it gets built, when someone says "just get it done, whichever way is fine", "we can patch the plan afterwards", or needs it done before a demo. Also use when a plan review's verdict has not been checked before touching a file, or when about to pick subagent-per-task vs solo execution without asking.
---

# Relay Plan Execution

## Overview

Sixth stage of the relay. It turns an **approved** `04-plan.md` into a decision:
is this plan cleared to build at all, and if so, which of two ways builds it. It
makes that decision **with** the requester, not for them, records it, and hands
off. It never writes a line of code itself — that is
`relay-subagent-driven-development` or `relay-executing-plans`, whichever this
stage names.

Core principle:

> A choice with a real difference in what it catches is not yours to make
> silently just because the requester said "whichever is fine." They said that
> before they had seen the difference. Show them the difference, then take the
> answer — even if the answer arrives in the same breath.

Under test, an agent given exactly that "whichever is fine" line reasoned,
correctly, that re-litigating it would waste the requester's own stated
priority — and then never showed them the one line that made it a real choice:
that one path catches more, and the other one is faster. It picked alone,
told the requester afterward as a status line, and moved on. The requester
never got to weigh the actual trade-off, because they were never shown it.

## When to Use

- `05-plan-review.md`'s latest verdict is `approved`, and nothing has been built
  from `04-plan.md` yet.
- Someone asks for the plan to be built, staffed, or finished before a deadline.
- A card is part-built and its Done-when has not been run — pick back up here
  before resuming, to confirm the gate still holds and the build path already
  chosen is still the one in force.

## When NOT to Use

- **The plan was not approved.** See *The Gate*. You are not the stage that
  approves it, and you are not the stage that fixes it.
- **No plan exists.** `relay-planning` writes one, and may have been right not
  to. See *The Gate*.
- **You are already inside a build**, dispatching implementers or running
  cards. That is `relay-subagent-driven-development` or `relay-executing-plans`,
  whichever this stage named.
- **The built change is what is being reviewed.** That is
  `relay-reviewing-implementation`, and it reads what the build stage writes.

## The Gate

Before anything else — before reading the plan, before opening a source file —
read `05-plan-review.md` and find its **latest round**.

**Latest round** is the last `## Round <n>` section in the file; it is
append-only with the newest last. If file order and numbering disagree, the
highest `<n>` wins, and say in your first message that you found them
disagreeing.

| Latest verdict | What happens here |
|---|---|
| `approved` | Choose a build path (below), then hand off. |
| `rejected — routed to relay-refining` | Nothing is built. Name `relay-refining` and stop. |
| `rejected — routed to relay-planning` | Nothing is built. Name `relay-planning` and stop. |
| `rejected — round cap reached` | Nothing is built. Name the person or role that verdict escalated to, and stop. |
| `no plan to review` | Nothing is built. Name the stage that verdict names — it investigated and recorded one — and stop. |
| No `05-plan-review.md`, but `04-plan.md` exists | Nothing is built. Name `relay-reviewing-plan` and stop. |
| Neither file, and `00-journal.md` has no `relay-planning` section | Nothing is built. Name `relay-planning` and stop. |
| Neither file, but `00-journal.md` has a `relay-planning` section | Nothing is built. That stage ran and chose not to write a plan; name the stage **its** section names, and say you took the destination from the journal rather than from a verdict. |
| A file whose verdict you cannot read | Treat as not approved. Say what you found. |

**"Nothing is built" is literal.** When the gate is shut, do not read the plan
in detail, do not draft the questions for whichever stage is named, do not
choose a build path "so it's ready once the gate reopens." Name the stage and
stop.

**When the gate is shut, this stage writes exactly one thing: its own appended
section of `00-journal.md`.** Write it — the stage ran, it was asked to build,
and it did not; that is the only durable record of the refusal, and without it
the next person under the same pressure repeats the round.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`. This is a
**default**, and so is the language the artifacts are written in. Where the
project's always-loaded instruction file names an artifact home or an artifact
language in its `## Relay process discipline` section — installed by
`relay-init` — that binds. Absent it, use the path above and the language of
this conversation, say in your first message which language you are writing
in, and never infer it from files that already exist. Anything quoted from the
requester is recorded in the words they used, never translated. `<request-id>`
defaults to `YYYY-MM-DD` using the current date already present in your
environment; never compute or invent one.

Read from disk, and never assume live session memory of an earlier stage:
`05-plan-review.md` first, because it decides whether you do anything at all;
`04-plan.md`, the thing that will get built; `02-spec.md`, for the acceptance
entries the finished change is answerable to; `00-journal.md`, for what earlier
stages decided and the pressure they were under. Say in your first message
which you found and which are missing.

Then find out how this project is built, tested and searched, and how it
tracks changes — from its own files and its own conventions, not from habit.
Whatever it uses is what the chosen build stage will use.

## Choose How the Plan Gets Built

**Ask this before you change a single file, and wait for the answer — even a
delegated one.** Under test, agents given a genuine "just get it done, I trust
you, whichever way you build it is fine" line took that as license to pick
silently, reasoning that asking would burn the requester's own stated
priority. That reasoning is backwards: the requester said "whichever" **before**
being shown that the two ways catch different things. A blanket line issued
before the difference was ever named is not a delegation of this decision — it
is the absence of anyone having asked yet. Show the difference, in one message,
and let the answer — even an immediate one — be theirs:

> **A — `relay-subagent-driven-development`.** A fresh worker per card, an
> independent reviewer checks each card before the next starts, a fix loop for
> anything that reviewer finds. Slower per card, and it catches more: a
> reviewer with no stake in the work has caught things the same person building
> and checking their own card walks past.
>
> **B — `relay-executing-plans`.** One of us builds every card in this session,
> checking each Done-when as it lands. Faster, and it depends on the same
> person who wrote the code also being the one who judges it finished.

That difference is not theoretical. Under test, the same pressure ("ship
today", two people idle) that made an agent skip asking is exactly the
pressure under which the two paths diverge most: B is faster precisely because
it skips the independent check that A would have run.

**If this session cannot start a separate worker with its own context, do not
offer A.** Say so in one line and use B. If the requester still declines to
choose after seeing the difference, pick — A when the plan has more than one
card, B when it has one — and record in the journal that you picked and why.

## Confirm the Path Still Holds, on Resume

If a card is already part-built when this stage runs (a prior round stopped or
was interrupted), do not silently continue with whatever path was used before.
Read `00-journal.md` for the section the build stage wrote, confirm the same
path is still the one in force, and say so — or, if the requester wants to
switch paths mid-plan, treat that as a fresh instance of the choice above and
record it the same way.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage.

```markdown
## <date> — relay-plan-execution
<2-4 sentences of prose: the gate's verdict and what decided it, which build
path was chosen and by whom — the requester's own choice, a declined choice you
picked for them and why, or a path forced by missing subagent capability — and
any pressure this stage ran under that a later reader would want to know
about.>
```

Prose, not a ledger line. The relay's last stage reviews the process with the
journal as its only source.

## Hand Off

End with exactly this shape: (1) a **status line** — the gate's verdict and,
if open, which build path was chosen; (2) the **successor** —
`relay-subagent-driven-development` or `relay-executing-plans` per the choice
above, or the stage the gate named if it is shut; (3) **one question** offering
three ways forward — continue with that successor / go to a different step
instead / stop here.

Never invoke the successor yourself, and never build a single card here even
if the choice seems obvious.

## Rationalization Table

| Excuse | Reality |
|---|---|
| "They said whichever way is fine, so I picked and told them afterward." | They said that before seeing the difference. Showing it and getting an instant answer costs one message; picking alone spends their decision without their knowledge that it was one. |
| "Asking would waste the time they told me not to waste." | Naming the trade-off in one short message is not the discussion they were declining. What they were declining is a debate, not a disclosure. |
| "The findings are nitpicks about the plan document, not about what we're actually building." | Then the stage whose job it is will close them in one pass. A rejected verdict is not a severity rating you get to re-score. |
| "The work is obvious from the cards, the rejection doesn't matter." | Obvious after the plan comes back, at the cost of one pass — not before. |
| "There's no review file, so I'll build without one." | No review file behind an approved-looking plan means nobody independent has looked at it. Name `relay-reviewing-plan` and stop. |

## Red Flags

- "Whichever is fine, so I'll just pick."
- "I'll tell them which path I used after I'm done."
- "The review's findings are only about the document."
- "It's a rejection but the work is obvious."
- "I'll start card 1 while they read my message."
- Reaching for a file-writing tool on anything but `00-journal.md`.
- Ending without a status line, a named successor, and a question.

## Worked Example

An approved four-card reporting-command plan. Round 3 of its review passed.
Twenty-five minutes to a demo; the requester says "ship it, whichever way you
build it is fine, I trust you."

Gate first: latest round `approved`. Then the choice — not skipped, not
silently picked:

> Two ways to build this: A, a fresh worker per card with an independent
> reviewer between cards — slower, catches more; or B, I build all four cards
> myself this session, checking each Done-when as it lands — faster, and the
> same person building judges it done. Twenty-five minutes favors B unless you
> want the extra check on this one. Which?

*"B, go."* — an actual answer to an actual question, not a guess standing in
for one. Journal appended, recording B and why. Handed off:

> Gate open (round 3, approved). Building via `relay-executing-plans`, your
> choice, given the time. Continue there, go to a different step, or stop here?
