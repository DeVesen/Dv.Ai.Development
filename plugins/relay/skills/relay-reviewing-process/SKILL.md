---
name: relay-reviewing-process
description: Use when a request has finished or stopped somewhere in the relay and someone asks how the run itself went — a retrospective, a post-mortem, lessons for next time, or what to do differently. Also use when about to answer "how did that go" by re-reviewing the delivered code, by reopening a decision an earlier stage already closed, or when a chain that barely started is about to be written off as having nothing to review.
---

# Relay Reviewing Process

## Overview

Ninth and last stage of the relay. Every stage before it looked at the work.
This one looks at **the run** — how the request travelled through the stages,
where the process earned its cost, where it wasted someone's afternoon, and what
the next request should do differently.

Core principle:

> Under test, seven subjects were asked to review how a finished run had gone.
> Every one of them read the whole folder. Every one of them ran the delivered
> software. Four went looking outside the project for a definition of the
> process. Two found real defects in the code that no earlier stage had caught,
> and wrote them up as the output of this stage. Not one produced a bad
> analysis. They produced **somebody else's** analysis — again, more slowly, at
> the one point in the chain where nobody was left to use it.

The pull is not laziness. It is the opposite. Every earlier stage in this relay
runs on *measure it, do not credit it* — its reviews re-run what they are handed
rather than believing it. This stage inherits that instinct and has nowhere to
point it, because the thing under review is not the software. It is the run. A
run cannot be re-executed, and no second copy of it exists to measure against.

## When to Use

- A request has reached the end of the relay, or stopped somewhere in it, and
  someone wants to know how the run went.
- Someone asks for a retrospective, a post-mortem, or lessons for next time.
- A pattern is suspected across a chain — the same kind of thing kept coming
  back, something took three rounds that should have taken one.

## When NOT to Use

Every row below was a real baseline failure, not a hypothetical:

| The request sounds like | It actually is |
|---|---|
| "Is what we shipped any good? Can we ship it?" | `relay-reviewing-implementation`. It has run the software and written `07-implementation-review.md`. If that verdict is doubted, run **that** stage again — do not answer the question here. |
| "What do we tell the requester?" | `relay-reporting`, which wrote `08-report.md`. |
| "That decision was wrong, put it right" | Not this stage, and not this chain. See **Recognition test 2**. |
| "This one never got past the spec — review it" | The chain is short, not unreviewable. Review the run that happened; **do not do the review the missing stage never did.** |
| "Something is broken, find it" | `relay-discussing`, as a new request. |

Under test, two subjects handed a chain that had gone quiet wrote the missing
stage's review instead of a process review. One produced seven findings about a
spec, three of them labelled blocking. That is the next stage's work, done by
the wrong stage, months of context too late.

## The Source Is the Journal, and Only the Journal

Default artifact home: `docs/relay/<request-id>-<slug>/`. This is a
**default**, and so is the language the artifacts are written in. Where the
project's always-loaded instruction file names an artifact home or an artifact
language in its `## Relay process discipline` section — installed by
`relay-init` — that binds. Absent it, use the path above and the language of
this conversation, say in your first message which language you are writing
in, and never infer it from files that already exist. Anything quoted from the
requester is recorded in the words they used, never translated. `<request-id>`
defaults to `YYYY-MM-DD` using the date already in your environment; never
invent one.

You read `00-journal.md`. Nothing else. Not the spec, not the plan, not the
reviews, not `08-report.md`, not the source, not the tests, and you do not run
the software.

This is not a convenience. The other nine files describe **the work**; the
journal is the only thing in the folder that records **the run** — one section
per stage, written by that stage at the moment it finished, in prose, for exactly
this reading. It is not a weaker summary of the artifacts. It is the only
recording of the thing this stage reviews.

**Listing the folder is allowed; opening what is in it is not.** Which files
exist is itself run information, and it is the one place a missing journal
section shows up: an artifact on disk whose stage wrote no section means a stage
ran and left no record of running. Say that in the review — it is a real finding
about the run, and it is the one you would have destroyed by opening the file to
fill the gap in.

### Where that leaves you, honestly

The journal is **self-reported**, each section in the voice of the stage it
describes. A stage that cut a corner and did not write it down is invisible here.
Under test, a subject who read everything found one such case: a review whose
journal entry reads complete, while the document it wrote stops half way through.

That is a real limit, and the answer is **not** to go and check. The temptation is
unbounded — under test, every subject who opened one artifact went on to open all
of them, and then the source. Instead, when the journal makes a claim this review
would have to verify, **say so in the review**, in the section that exists for it.
A named blind spot is a useful output. A quietly re-derived chain is a second
implementation review nobody asked for.

### Drift signals

You have left this stage the moment you:

- open any file in the folder other than `00-journal.md`
- open a source or test file, or run the software
- go looking outside the project for the process's own definition
- write a finding id, a severity, or the word "rejected"
- write a sentence telling someone to change the delivered behaviour

## Two Recognition Tests

Almost everything this stage gets wrong is one of two confusions, and each has an
observable question that settles it.

### Test 1 — is this about the run, or about the thing?

> **Would this still be true if the same code had been produced by one person in
> an afternoon, with no process at all?**

If **yes**, it is a fact about the software or about the request, and it is not
yours. It belongs to a stage that has already run.

If **no** — if it only exists because the work moved through stages, hands and
documents — it is a fact about the run, and it is your whole subject.

| Sentence | Survives the no-process counterfactual? | Whose |
|---|---|---|
| "A row missing its last field still crashes the reader." | Yes — one person alone would have shipped that too. | `relay-reviewing-implementation` |
| "Rounding to one decimal loses real values." | Yes. | Not this stage |
| "The defect that eventually routed back to the requirements stage was already in the spec when the spec review approved it in one round with no findings." | No — it needs a spec, a review and a routing rule to exist. | **Yours** |
| "Three plan-review rounds each found the same kind of defect: a fact asserted without being run. Nothing counted the plan's assertions, so each round could only find them one at a time." | No. | **Yours** |
| "A decision the requester would have cared about was taken at planning, and the stage that took it had no way to route it back." | No. | **Yours** |

Note the third row against the first. A process review may say *the spec review
missed something*; it may not say *and here is another bug in the code*. The
first is about the run. The second is about the thing.

### Test 2 — does this change this request, or the next one?

> **Does this sentence change what happens to the request that just finished, or
> what happens to the one after it?**

This stage's output changes the next one. This chain is closed.

The observation is allowed; the correction is not:

- ✅ "A requester-visible decision was taken at a stage with no route back to the
  requester, and she first heard about it in the closing report."
- ❌ "Therefore the decision is reversed."

Under test, one subject asked to confirm a suspicion about a settled decision did
the first correctly — then verified the decision on its merits, ran an experiment
against the delivered code, and wrote **"Required correction — the decision is
reversed"** as a critical finding. It had no such authority, and the file it wrote
it in is read by nobody who does.

If a change to what was delivered is genuinely wanted, it is a **new request** and
it enters at `relay-discussing` with its own chain. Say that, and stop.

## Process Cost, or an Ordinarily Hard Request

Both belong in the review; only one is a finding.

> **Could the process have known?**

- **It could** — the same kind of defect surfacing on three separate rounds
  because nothing counted the claims; a handoff nobody picked up; a stage doing
  another stage's job because it had no route back. That is process cost, and it
  is what this stage is for.
- **It could not** — a collision three careful readers missed, a requester who
  was away, a fact that could only be learned by building the thing. Record what
  it cost and leave it as what it was. Dressing ordinary difficulty as a process
  failure produces a review nobody trusts twice.

**Rounds are not the metric.** A review that sent a plan back three times and was
right three times is the process working exactly as intended; a review that sent
it back three times *for the same reason* is the process missing a check. Report
which one it was.

Likewise, weighing the process's own output against the size of the change —
"a thousand lines of documents for five lines of code" — is not a finding on its
own. It becomes one only when you can name what the extra passes failed to buy.
Under test, a subject who opened with that ratio then found that the "wasted"
round had produced a warning that reached the requester.

## How Much Run There Is to Review

Count the stage sections in the journal. That is the predicate.

| What the journal has | What you review |
|---|---|
| Sections through `relay-reporting` | The whole run — whatever verdict it ended on. A rejected or stopped run is often the more instructive one. |
| Sections that stop part way, last one naming where it went | The run up to there, **plus the handoff that was never picked up**. Under test, the best single finding on a chain that had gone quiet was that its last handoff named a stage and not a person. |
| One section | Still reviewable, and short: that one stage, and its handoff. Say plainly that the rest has not happened, and review none of it. |
| No sections, or no journal | Nothing was recorded. Say so, name `relay-discussing` if the request is still wanted, and **write no file**. |

A short chain is never a reason to review the stage that did not run.

## The Review, Part by Part

Every heading is required, in this order, including any whose honest content is
"Nothing".

```markdown
# Process Review — <request-id>-<slug>

## The run
<The shape, from the section headings and what they say: how many stage runs,
which stages repeated and how often, where it ended and on what. Facts, not
judgement. A reader who never saw this request should be able to picture its
path from this paragraph alone.>

## What worked, and is worth keeping
<Required, and never "nothing" — a run that reached the end has something in it
that held. Named specifically enough that a future request could do it on
purpose. "The stage under demo pressure refused three invitations to shortcut
and answered each with a measurement" is keepable; "the team did well" is not.>

## Where the process itself cost something
<One entry each: what happened, what it cost, and what the process could have
known — the "could the process have known" test, visibly applied. "Nothing" is
allowed and is sometimes the true answer on a small clean run.>

## What the next request should do differently
<The actual product of this stage. One change per entry, each traceable to
something above. Written so somebody could adopt it on Monday: a check a stage
runs, a thing a handoff has to name, a question asked earlier. Aimed at the way
work runs — never at this request, which is closed.>

## What this review could not see
<Required. The journal is self-reported and is the only source. Name what you
would have had to check to be sure, and which conclusions above are therefore
weaker than the rest. A blind spot named here is worth more than a confident
sentence that outran its evidence.>
```

## This File Has No Verdict

`relay-reviewing-spec`, `relay-reviewing-plan` and `relay-reviewing-implementation`
produce verdicts, severities, finding ids, routing and round caps. They have them
because a next stage's work is gated on the answer — a spec review's `rejected`
stops planning until it is fixed.

**Nothing is gated on this file.** There is no round two of a finished run and no
stage waiting on its verdict.

Under test, subjects imported the machinery anyway: `P-1` through `P-7`, the
relay's severity scheme, a "deliberately not filed" candidate list, an owner
column, a "required correction". A severity on a process observation is a number
nobody will act on. A finding id is a handle for a document that will come round
again, and this one will not.

So: no verdict, no severities, no ids, no rounds, no routing. Prose, and a list
of changes somebody could actually adopt.

## Length

About a page. The test: **would a person about to start the next request read all
of it?** They are the only reader who can act on it.

Under test, unconstrained reviews ran 210 to 230 lines, most of it evidence
re-derived from artifacts that already contain it. Everything this review needs
to prove is in the journal, and the journal is one file away from its reader.

## Append to `00-journal.md`

Append-only. Never edit a section an earlier stage wrote.

```markdown
## <date> — relay-reviewing-process
<2-4 sentences: what the run looked like, the one or two things the next request
should do differently, and anything this review could not see.>
```

This is the last section the journal gets. Nothing downstream reads it — a person
opening the folder later does, and without it they cannot tell whether the run
was ever reviewed.

## Hand Off

This stage has **no successor in this chain**. The chain is closed; saying "next,
`relay-…`" would reopen a request that is finished.

End with: (1) a **status line** — what the run looked like and the exact path of
`09-process-review.md`; (2) **where the proposed changes go** — they are for
whoever owns how the work runs, offered rather than routed, and this stage never
adopts them itself; (3) if the run stopped part way and the request is still
wanted, the stage that actually holds it, named as a **separate** thing from the
review; (4) **one question** offering three ways forward: take the changes to
whoever owns the process / pick up the stopped request at the stage that holds it
/ stop here.

Never invoke anything yourself.

## Quick Reference

| | |
|---|---|
| Subject | The run. Not the software, not the request. |
| Source | `00-journal.md`, and nothing else. No source, no artifacts, no running. |
| Test 1 | Would it be true with no process at all? Then it is not yours. |
| Test 2 | Does it change this request or the next? Only the next. |
| Cost vs difficulty | Could the process have known? |
| Rounds | Three rounds, three different reasons = working. Same reason = missing check. |
| Shape | Five required headings. No verdict, no severities, no ids, no rounds. |
| Short chain | Reviewable. Review the run that happened, never the stage that did not. |
| Blind spots | Named in the review, not resolved by going to look. |
| Missing section | An artifact with no section = a stage that left no record. A finding, not a gap to fill. |
| Writes | `09-process-review.md` and one `00-journal.md` section. Nothing else, ever. |

## Common Mistakes

- **Reading the folder "just to check one thing".** Under test, every subject who
  opened one artifact opened all of them, then the source, then ran the software.
  There is no small version of this.
- **Producing a better implementation review than the implementation review.**
  Two subjects found genuine, previously unknown code defects this way. Both
  findings were real; neither was this stage's, and neither would reach anyone who
  could act on it from here.
- **Reviewing the stage that never ran.** A chain that stopped after intake has
  one stage to review and a handoff. It does not have a spec for you to critique.
- **Turning an observation into a correction.** "A requester-visible decision was
  taken without her" is the finding. "So change it back" is a different stage's
  sentence, in a chain that is closed.
- **Counting rounds as failures.** Rework that found something real each time is
  the process paying for itself.
- **Manufacturing findings on a clean run.** A small request that went straight
  through has a short review, and "Nothing" under process cost is an honest
  answer. Sibling stages have repeatedly caught agents padding a clean job.
- **Writing only findings.** What held is half the output, and the half a future
  request can copy. It is also the half that disappears first under a deadline.

## Worked Example

A weekly reporting command. It ran the full relay: the spec approved in one round
with no findings, the plan rejected twice and approved on the third round, the
build carried out under twenty-five minutes of demo pressure, and the
implementation review rejecting on one finding that routed all the way back to the
requirements stage — two agreed rules collide on a command carrying two mistakes,
and nobody ever decided which wins.

**What failed under test.** Seven subjects, seven documents, none of them this
stage's. Every one read all nine artifacts; every one ran the software; four went
outside the project looking for the process definition. One wrote a shipping
assessment. One wrote "Required correction — the decision is reversed" about a
decision closed two stages earlier. Two, handed chains that had stopped early,
wrote the missing stage's review instead. The analysis was good in nearly all of
them. It was the wrong analysis in all of them.

**What this skill does instead.** The findings below are what *this* run's
journal happened to yield; another journal yields entirely different ones. What
carries over is the method, not the list — a review that recognises its own run
in this example and reaches for these conclusions has stopped reading the
journal in front of it.

One file open. From the journal alone: the run
was twelve stage executions, four of them rework, and every bounce traces to two
causes. The plan asserted facts about library behaviour without running them —
and planning *did* count the facts it had read, so an unread assertion was
structurally invisible; that is a process cost, and the change is that the count
goes the other way. The acceptance entries only ever exercise one requirement at
a time, so the collision survived every stage until the software existed; that is
also process cost, and it names a check. Against that: the spec review approved in
one round and missed a defect three later readers also missed — recorded as what
it cost, not as a failure, because nothing available at that moment would have
surfaced it. Three plan-review rounds are recorded as the process working, since
each found something real. What held is written down as carefully as what did
not: read facts became instructions on the cards, and under demo pressure that
turned three invitations to shortcut into three measurements. And the review says
plainly what it could not see — the journal is each stage's own account of itself,
so a stage that skipped something silently does not appear here.

Handed off:

> Process review written to
> `docs/relay/2026-08-28-tally-window/09-process-review.md`. The run was twelve
> stage executions, four of them rework, ending on a requirement-level finding
> routed back to `relay-refining`. Every bounce traces to two causes — facts
> asserted without being run, and acceptance entries that never exercise two
> requirements at once — and both have a concrete change attached for the next
> request. What held is recorded too: reading facts rather than assuming them is
> what let the build refuse three shortcuts under demo pressure. The review says
> what it could not see: the journal is self-reported, so anything a stage
> skipped silently is invisible here. The changes are for whoever owns how the
> work runs; this stage does not adopt them. Separately, the request itself is
> still open at `relay-refining`, waiting on one decision from the requester.
> Take the changes to whoever owns the process, pick the request back up at
> `relay-refining`, or stop here?
