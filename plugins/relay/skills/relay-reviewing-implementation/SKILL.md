---
name: relay-reviewing-implementation
description: Use when a change has been built and is about to be reported, demoed or shipped, when someone says the suite is green, the implementer already checked it, or asks for a quick sign-off before a demo, or when a change that was sent back has come round again. Also use when about to sign off from an implementation log without having run the software, or about to fix what a review just found.
---

# Relay Reviewing Implementation

## Overview

Seventh stage of the relay. It is the first stage whose subject is **running
software** rather than a document: it holds the delivered change, and
`06-implementation-log.md`'s account of it, against `04-plan.md` and `02-spec.md`
before anybody reports the work as done.

Core principle:

> Every reviewer under test ran the software itself and found the real defects.
> Not one of them wrote the finding anywhere a later stage could read it, gave it
> a verdict, or said which document was wrong. **Finding it is not the
> deliverable. The reviewed artifact is.**

And the one that decides the quiet half of this stage:

> Under test, the delivery with nothing wrong with it collected **more** findings
> than the delivery with two real defects in it. A review with nothing to say has
> to be willing to say nothing.

This stage finds things and hands them back. It does not fix them, does not
decide them, and does not touch the delivered tree.

## When to Use

- A change has been built against `04-plan.md` and somebody wants it reported,
  demoed, merged or shown.
- `06-implementation-log.md` has been written and nothing has held it to the plan
  and the spec yet.
- A change that this stage sent back has come round again.
- Somebody is asking for sign-off on the strength of a green check run, a
  thorough-looking log, or the implementer's own word.

## When NOT to Use

- Nothing has been built yet — that is `relay-plan-execution`, or the gate below.
- The plan has not been reviewed — that is `relay-reviewing-plan`.
- You are the one who built it and you are still building. Re-running your own
  card's condition is the build stage's job (`relay-subagent-driven-development`
  or `relay-executing-plans`); this is the stage after it.

## The Gate: Find Out What Is Actually There

Read `06-implementation-log.md` and `00-journal.md` **before** anything else,
because there may be nothing to review, and the most likely reason for that is
that `relay-plan-execution` **correctly refused to build**.

| What you find | What happens here |
|---|---|
| `06-implementation-log.md` exists | Review it, and the change it describes. |
| No log, and `00-journal.md` has a `relay-plan-execution` section naming no build-stage successor | That stage's gate was shut. Verdict `no implementation to review`. Name the stage **its** section names, and say you took the destination from the journal rather than from a log. |
| No log, no `relay-plan-execution` section, and the tree does not carry the change `04-plan.md` describes | Nothing has run. Verdict `no implementation to review`, successor `relay-plan-execution`. |
| No log, no `relay-plan-execution` section, but the tree **does** carry the change | Something was built and nothing records it. Review the change on its merits, and file the missing record as a finding in its own right. |
| A log you cannot read a task result out of | Treat every unreadable result as not done. Say what you found. |

**Confirm the row you landed on against the tree before you act on it.** The
first two rows are read off documents alone, and the last two are told apart by
nothing else: documents can be wrong about a tree. Look for the files the plan's
`## Files` section names and run the project's checks — a result that matches the
plan's end state rather than the baseline the log or plan recorded means the work
exists, whatever the folder says. Under test this happened: the documents said
the stage had not run, and the tree carried the finished change, with the check
run reporting the plan's end state against the far smaller baseline. Writing
`no implementation to review` there would have put a false statement in the file
and sent a finished change back unreviewed.

Behind a shut gate, do two things and stop. **Check the recorded blocker against
`02-spec.md` and `05-plan-review.md` yourself** — a blocker taken on trust is the
same mistake one layer down. Then write the review file with the verdict above,
so a later reader has a record that this stage ran.

**Behind a shut gate you do not do the blocked stage's work.** Under test the
subject that correctly established nothing had been built then produced a fresh
requirement-level finding of its own and drafted the three questions to put to
the requester. Both belong to the stage the gate names. A blocker you can confirm
goes in your file as confirmed; a new question you notice goes in your file as a
finding with a destination — not as a conversation you conduct.

**This stage writes exactly two files:** `07-implementation-review.md`, and its
own appended section of `00-journal.md`. Nothing else, ever — see below.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`. This is a **default** —
a project or user preference for a different location overrides it, so check for
one and honour it. `<request-id>` defaults to `YYYY-MM-DD` using the current date
already present in your environment; never compute or invent one.

Read all of these from disk before writing a line of review, and never assume
live session memory of any earlier stage: `06-implementation-log.md`, the account
of the work; `04-plan.md`, what was supposed to be built; `02-spec.md`,
**required**, because without it the delivered behaviour has nothing to be right
or wrong against — if it is missing, say so and stop; `05-plan-review.md`, whose
latest verdict tells you whether the plan was fit to build from at all;
`00-journal.md`; and any existing `07-implementation-review.md`, for every prior
round.

Then find out how this project is built, run, checked and searched — from its own
files and conventions, not from an assumption about which tools exist. Say in
your first message which artifacts you found, which are missing, and how you are
going to run the thing.

## The Bar

**Violating the letter of these rules is violating the spirit of these rules.** A
review that reached the right answer and left it in a chat reply produced nothing;
this is the last stage before the work is reported as done, and the report is
written from the artifacts, not from the conversation.

### Forbidden in this review, by name

Every one of these was produced by an agent under test:

- **Modifying anything in the delivered tree.** Not a temporary edit, not an
  injected fault to see whether the tests catch it, not "and then I restored
  everything, byte-identical". You cannot review a tree you have been editing,
  and a restore is a claim about a tree only you saw. Copy it elsewhere and say
  in the file that you did — and **check the copy against the delivered tree,
  file by file, before you review it.** Under test a subject's working copy did
  not match what had been delivered; it noticed only because it compared the two,
  discarded everything it had run, and started again. Unchecked, that copy would
  have produced two invented critical findings against code that did not contain
  them.
- **Writing the fix, or preparing it.** One subject built the whole repair in a
  scratch copy, verified it, and closed with *"say the word and I'll apply it to
  your tree — the verification is already done."* Another wrote *"remove those
  four lines outright."* Name the defect and quote what it contradicts. The
  repair belongs to the stage you route it to.
- **Accepting a classification the log already made.** Every entry in the log's
  `## Deviations from the plan` was bucketed and routed by the stage being
  reviewed. Re-derive each one here, from `02-spec.md`, before you read the bucket
  it was given. Under test the most careful of the four unaided reviewers read the
  one deviation the log reported and wrote *"the layer-level classification and
  the routing to `relay-planning` are right"* — and it was not a deviation at all.
  The spec did answer the question the card was said to have decided, so the
  entry was false and its routing had sent a stage after nothing.
- **Treating a passing check run as evidence.** The delivered work under test
  passed 52 of 53 tests, with the one failure known and pre-existing, and
  violated two requirements.
- **Treating a test's name as its assertion.** Two green tests carried the word
  `day` in their names and asserted `hours`.
- **Copying the log's commands and their output into your file** as the
  verification. A command the log quotes is the log's evidence. Yours is what you
  ran.
- **A verdict value or a severity word you invented.** There are exactly six
  verdicts and exactly three severities, listed below, because the next stage and
  the round cap key on nothing else.
- **A partial go-ahead** — "these parts are shippable, that one needs a patch".
  A reader acts on the permissive half.
- **Editing `06-implementation-log.md`, `04-plan.md` or `02-spec.md`**, settling
  an open question, choosing between two readings you found, or drafting the
  message the requester gets.
- **Treating any of these as evidence about a finding**: the implementer was
  thorough; the log quotes commands; the demo is in half an hour; two days have
  gone into it already; the plan review already passed this.

## The Six Checks

Run all six, in this order, on every review — including one that is going to end
in an approval. Each produces a stated result in the review file **even when it
finds nothing**: in a file that lists only findings, "no finding" and "not
checked" are indistinguishable, and under test a review covered ten acceptance
entries with the single clause *"everything else I checked and it is clean."*

### 1. Run it yourself, on the tree as delivered

Run the project's checks, and then run the **thing itself** — the command, the
endpoint, the screen — the way a user reaches it. Write down each command and
what it printed, including the exit status. All four subjects under test did this
and it is what found every real defect; none of them recorded it anywhere
durable, which is why it is a required section and not advice.

If the check run is not green, establish whether each failure is new by comparing
against the baseline the log recorded. A failure the log names as pre-existing is
checked, not assumed.

### 2. One stated result per requirement and per acceptance entry

One row for every requirement in `02-spec.md`'s `## Behaviour` **and** one for
every entry in its `## Acceptance`. Answer each from what the software did when
you ran it — not from a test name, not from the log, not from the plan's coverage
table. Three results: **met**, **NOT MET**, or **not checkable here**, with the
reason.

The two directions are not the same check and this is where the second defect
under test was living. The acceptance entries are examples; the requirements are
the rule. A requirement said the machine-readable output must carry *nothing else
on the success stream*; the only acceptance entry for it ran against the one
clean input file, so the entry passed while the requirement was broken for every
real input. **Derive your own probe for a requirement whose acceptance entry is
narrower than it is.**

### 3. The tests behind the claims: the assertion, not the name

For every acceptance entry the log says a test demonstrates, open that test and
read what it asserts. Where `04-plan.md` states an exact literal — a message, a
status, a value — compare the card's literal against the test's assertion,
character for character.

Under test, this was the whole game and the reviewer that had already found the
defect another way described the cheap check it had skipped: *"the cards name the
expected literals exactly enough that comparing the card's text against the
test's assertion would have found both findings, and that comparison never
happened."* A worker who implements the wrong behaviour and writes the matching
test passes its own gate.

### 4. The log against the tree

Every claim in `06-implementation-log.md` is a claim about a tree you now have.
Check the ones that are cheap to check and say which you checked: the file list,
the counts, the quoted output, the "what was done" prose for each task.

Then the three sections whose honest content may be "None" or "Nothing" —
`## Deviations from the plan`, `## What is not done`, `## Verification not run`.
A wrong "Nothing" there is a finding on its own, because `relay-reporting` writes
from this file: under test the log said *"Deviations: One"* where there were
three, and said the day was converted before the hours where the code did the
opposite.

**A false log is a finding even where the built work is right.** Its destination
is whichever build stage wrote it, named in the log's own `## Execution`
section.

### 5. The log's deviations, re-classified here

For each entry in `## Deviations from the plan`: read what it says the card said,
read what it says was actually true, and **derive the bucket yourself from
`02-spec.md`** before looking at the bucket the log assigned. Then say whether
you agree, and why.

The test is the same one the routing rule uses: *which document is wrong?* If the
spec answers the question and the card contradicted it, that is plan-level. If
the spec does not answer it at all, it is requirement-level, however
reasonable the card's reading was — a card that had to choose is evidence the
spec left it to choose.

An entry the log routed somewhere is not closed. It is a finding of yours that
happens to have a first opinion attached to it.

### 6. Delivered but not asked for

Walk the files the log says were touched and look for behaviour no card names and
no requirement covers. The defect under test was four lines with a helpful
comment explaining who they were for — the kind of thing nobody removes because
nobody notices it arrived. It broke a requirement.

## Classifying Every Finding

The axis is **which document is wrong** — not who can fix it, not how bad it is,
not whether it can be patched before the demo.

| The defect is in | Bucket | Destination |
|---|---|---|
| `02-spec.md` — it is ambiguous, silent, incomplete or wrong, and the code could not have been right either way | requirement-level | `relay-refining` |
| `04-plan.md` — the spec is right, and a card said something false, contradictory or impossible, and the code was built from it | plan-level | `relay-planning` |
| The delivered change, or `06-implementation-log.md` — plan and spec are both right and the code or its record does not match them | implementation-level | whichever build stage wrote it — `relay-subagent-driven-development` or `relay-executing-plans`, named in the log's `## Execution` section |

State the bucket and one sentence of why for every finding. **A finding you
cannot classify is recorded as requirement-level**: over-routing costs one
redundant pass, under-routing lets a bad spec stand.

**`layer-level` is not one of these three, and it is the word you will find in
the log.** Upstream stages divide findings in two — requirement-level, and
everything else — and call the second half `layer-level`, because at their
distance the plan and the code are one layer. Here they are two, with two
different destinations. A deviation the log filed as `layer-level` is therefore
under-specified, not classified: resolve it into `plan-level` or
`implementation-level` yourself, and never copy the word into your own file.
Under test two subjects hit exactly this and one of them read a `layer-level`
label sitting next to `relay-planning` as a contradiction in the log.

"The spec does not say, so the implementer reasonably chose" is not a defence of
the code. It is the definition of a requirement-level finding.

## Severity Is Three Values

`critical`, `moderate`, `minor` — nothing else, because the round cap is keyed to
these and to nothing else. Not `blocking`, not `nit`, not `Nebenbefund`.

- **critical** — a requirement is not met, the log misstates what was built or
  verified, or nothing records what was built at all.
- **moderate** — real, and the deliverable still does what it says on the paths
  the spec names.
- **minor** — judgment call.

## Rounds and Caps

A round is **one look of yours at the change**, not an abstract fix cycle you
cannot observe. The first appearance of a finding is round 1. A finding that
comes back with the same root cause under a new symptom is a continuation of the
same finding, and counts against the same allowance.

| Severity | Rounds | Meaning |
|---|---|---|
| critical | 4 | continuation counts against the same 4 |
| moderate | 2 | continuation counts against the same 2 |
| minor | no limit | judgment call; document the decision either way |

**Something no round can fix** — a decision only a named human can make and they
cannot be reached, access or credentials you do not have — stops immediately and
consumes no round.

### When a cap is reached

1. Verdict becomes `rejected — round cap reached`; the capped finding is not
   routed onward again.
2. A `### Capped` section naming the finding, its root cause, the rounds it
   consumed, and who has to decide it.
3. The open question travels in the handoff and condensed in the journal.
4. The journal section says the cap was reached.

## Write `07-implementation-review.md`

Append-only across rounds: one `## Round <n>` section per round, newest last.
Never edit an earlier round, including one of your own.

The verdict is one of exactly six values:

| Condition | Verdict | Successor named |
|---|---|---|
| No finding | `approved` | `relay-reporting` |
| Any finding is requirement-level | `rejected — routed to relay-refining` | `relay-refining` |
| None requirement-level, any plan-level | `rejected — routed to relay-planning` | `relay-planning` |
| Every finding is implementation-level | `rejected — routed to <build stage>` | whichever of `relay-subagent-driven-development` / `relay-executing-plans` wrote the log, named in its `## Execution` section |
| A finding has reached its round cap | `rejected — round cap reached` | the person or role, plus whichever rejection still applies to the rest |
| Nothing was built | `no implementation to review` | the stage the gate names |

```markdown
# Implementation review — <request-id>-<slug>

## Round <n> — <date> — <verdict>

### Verdict
<One of the six values, with the successor named, then one sentence saying what
makes it that one. No second verdict, no partial go-ahead.>

### What was reviewed
<The change as delivered: whatever this project uses to identify it, or the file
list, plus the check-run state you found it in. State that you changed nothing in
it, or where you copied it to work on it.>

### Verification re-run here
<Every command you ran and what it printed, including exit status. Yours, not the
log's.>

### Requirements and acceptance
<One row per `## Behaviour` requirement and per `## Acceptance` entry:
met / NOT MET / not checkable here, and what you ran to decide it.>

### The log against the tree
<Which of its claims you checked and what you found; the three
None/Nothing sections, tested.>

### Deviations re-classified
<Per entry in the log's deviations: the bucket you derived, whether it matches
the one the log assigned, and why. "None recorded" if the section was empty.>

### Delivered but not asked for
<Behaviour found that no card and no requirement covers. "Nothing" if nothing.>

### Checks run
<The six, each with its result — including "found nothing".>

### Findings
<Each: an id; severity; bucket with one sentence of why; what is wrong, quoting
the requirement or card it contradicts and naming what the software actually did;
and what a reader of the log alone would have believed instead.>

### Capped
<Only in a `rejected — round cap reached` verdict. Omit the heading otherwise.>
```

## Approving Is Also a Reviewed Artifact

An approval is written, not withheld. Same file, same round section, the same six
checks with their results — with `approved` as the verdict and `relay-reporting`
as the successor.

And it is a real approval. **Do not manufacture a finding so the review looks
like work.** Under test, a clean delivery — every acceptance entry met, an honest
log — collected five findings and a recommendation not to ship. None of them was
a defect in the delivered work. Six things that are not findings:

- **A defect the change did not introduce**, in behaviour no requirement covers.
  The reviewer that found three pre-existing crash paths said itself they were
  pre-existing and out of scope, and filed them anyway.
- **A decision `04-plan.md` recorded and gave a reason for.** Documentation left
  alone because no requirement covers it is a plan decision; disliking the reason
  is not a finding against the implementer.
- **A pre-existing failing check every card was told to leave alone** — including
  as a complaint about the state of the check suite.
- **Input hardening no requirement asks for**, however real the input.
- **Code, names or an output layout you would have written differently.**
- **A finding you went looking for because the review looked short.**

A change that meets every requirement, whose log is true, and whose deviations
are correctly bucketed, is a finished change. Say so, in the file.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage or round. The
heading names **this stage**, not a description of what you did.

```markdown
## <date> — relay-reviewing-implementation
<2-4 sentences of prose: the verdict and what decided it, what you ran to decide
it, which findings are continuations and from which round, anything that hit a
cap and who it went to, and any pressure the review ran under.>
```

Prose, not a ledger line. The relay's last stage reviews the process with the
journal as its only source.

## Hand Off

End with exactly this shape: (1) a **status line** — the review is written, its
verdict, and the exact path of `07-implementation-review.md`; (2) the
**successor**, named per the verdict table; (3) **one question** offering three
ways forward — continue with the successor / go to a different step instead /
stop here.

Under test not one of four subjects produced this shape. One closed by offering
to apply its own fix; one closed on a delivery recommendation; one closed on the
agenda for a conversation with the requester.

Never invoke the successor yourself, and never write the fix while you wait.

## Rationalization Table

Every excuse in the left column was produced by an agent under test.

| Excuse | Reality |
|---|---|
| "The suite is as green as it gets on this project, and the one failure is old." | It was, and two requirements were broken. A check run is evidence about the checks. |
| "The implementer was extremely thorough — every task names the command it ran and what it printed." | All true, and both defects were in what those commands did not cover. Thoroughness is not coverage. |
| "The one deviation the log reports is cleanly done — the layer-level classification and the routing are right." | Re-derived from the spec, the spec answered the question the card was said to have settled, so there was no deviation and the routing had sent a stage after nothing. Agreeing with a bucket you did not derive is how a wrong one becomes final. |
| "`layer-level`, like the log says." | Not one of the three buckets. It is the upstream word for "not requirement-level" and it hides the difference between `relay-planning` and the build stage that wrote the code. Resolve it. |
| "I copied the tree out, so whatever I run against the copy is what was delivered." | Only if you checked. A copy that quietly differs is two invented critical findings, and the one subject this happened to found out by comparing, not by assuming. |
| "Fix, played through in a scratch copy, not in your tree — say the word and I'll apply it." | Your verification of your own repair is not a review finding, and the stage you route to is the one that gets to decide the repair. |
| "Remove those four lines outright; the fix is small." | Possibly correct, and not yours to write. |
| "I restored everything — the tree is byte-identical to the starting state." | You reviewed a tree only you saw. Copy it and review the copy. |
| "The test that covers that entry is green." | Its name said `day` and it asserted `hours`. Open the test. |
| "Verification not run: nothing — formally correct, every done-when was re-run." | And every done-when was stated over test files the same worker wrote. A gate whose evidence the subject supplies is not a gate. |
| "That crash is pre-existing and outside the three conditions the spec names." | Then it is not a finding against this change. Say so once and leave it out. |
| "The plan's justification for skipping the documentation is process-shaped, not user-shaped." | It is a decision the plan recorded with a reason. Reviewing the reason is not this stage. |
| "Nothing was built, so the useful thing I can do is work out the questions to put to the requester." | That is the work of the stage the gate names. Confirm the blocker, write the verdict, hand off. |
| "It is a nit, so severity does not matter much." | The cap counts critical, moderate and minor and nothing else, and the thing filed as a nit was an exit status a requirement fixed. |
| "Two days have gone into this and Finance are in the room in half an hour." | Neither is evidence about a finding. Both are reasons the finding matters more. |

## Red Flags

Each of these means you are mid-violation, not about to be.

- "The suite is green." / "The log quotes the commands." / "The implementer
  already verified it."
- "The test for that one passes." (without having opened it)
- "The log already routed that one." / "Its classification looks right."
- "I'll just fix it — it's four lines." / "Say the word and I'll apply it."
- "I'll inject a fault to see whether the tests catch it." / "I restored it
  afterwards."
- "That's pre-existing, but I'll mention it as a finding anyway."
- "The plan decided not to, but I'd have done it differently."
- "Nothing was built, so let me draft what to ask the requester."
- "Conditionally approved." / "Shippable apart from…" / "Blocking." / "Nit."
- Reaching the verdict without a stated result for every requirement, without
  having run the thing yourself, or without having opened a single test.
- Reaching for a file-writing tool on anything but
  `07-implementation-review.md` and `00-journal.md`.
- Adding a finding because the review looked short.

## Worked Example

A command that exports a team's monthly totals gained two options: a date floor,
and a machine-readable output format. Ten requirements, twelve acceptance
entries, four task cards, an approved plan, a log that re-ran every card's
done-condition and recorded a pre-existing failing check honestly.

The log's `## Execution` section names `relay-executing-plans` (solo, one
session) as the build stage — that is where every implementation-level finding
below routes.

The review ran the check suite (52 of 53 passing, the one failure the same one
the log's baseline names) and then ran the command itself against all four sample
inputs.

- **Check 2** turned up the first finding. The requirement said the
  machine-readable output must carry nothing else on the success stream. Its one
  acceptance entry ran against the only clean sample, so it passed. Run against a
  sample with unreadable rows — the case the whole change exists for — the output
  carried a trailing count line and stopped being machine-readable.
  `F-1, critical, implementation-level → relay-executing-plans`.
- **Check 3** turned up the second. The log named a passing test as the
  demonstration of the entry about a row unreadable in two ways. The test's name
  said the earlier column was reported; its assertion said the later one; the
  card stated the literal message and the code contradicted it.
  `F-2, critical, implementation-level → relay-executing-plans`.
- **Check 5** dissolved a finding rather than adding one. The log recorded that a
  card had settled what happens when a run is partly unreadable and partly outside
  the date floor, filed it `layer-level` and routed it to `relay-planning`.
  Re-derived from the spec first, the spec's third case covers that shape exactly
  and the card did not decide anything. So the deviation was false, `relay-planning`
  had been sent after nothing, and the finding is against the record:
  `F-3, moderate, implementation-level → relay-executing-plans`.
- **Check 2 again**, on a different pair of requirements, turned up the one that
  decides the verdict. Two requirements each
  say a bad value produces *one* message naming it; give both a bad date floor and
  a bad format in the same invocation and both rules fire, and nothing in the spec
  says which message wins. The parser picks one silently. Each rule has an
  acceptance entry, and each entry passes one bad value at a time, so nothing
  downstream could have caught it.
  `F-4, moderate, requirement-level → relay-refining`.
- **Check 4** turned up the last: `## Deviations from the plan` said *One*, and
  F-1 and F-2 were two more that were never recorded.
  `F-5, critical, implementation-level → relay-executing-plans` — the record is
  wrong, and the next stage writes its report from it.

Verdict: `rejected — routed to relay-refining`, because F-4 is requirement-level
and one requirement-level finding decides the line, with the sentence under it
naming the four implementation-level findings that follow it home. Successor:
`relay-refining`. Then the question, and nothing else — no patch, no branch, no
edit to any of the four documents, and not one character changed in the delivered
tree.
