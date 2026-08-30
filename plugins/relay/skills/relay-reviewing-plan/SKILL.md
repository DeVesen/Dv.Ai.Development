---
name: relay-reviewing-plan
description: Use when a plan has been written and work is about to be handed out, estimated or started against it, when someone asks for a plan to be signed off or hurried through ("two people are free tomorrow", "the team lead wrote it", "don't hold this up over process"), or when a plan that was sent back has come round again. Also use when about to approve a plan whose own coverage table or self-check you have not tested against its actual task cards.
---

# Relay Reviewing Plan

## Overview

Fifth stage of the relay. It reviews `04-plan.md` — the document every implementer
is handed a single card out of — before anything is built from it.

Core principle:

> A plan asserts its own coverage, its own seams, and its own freedom from
> placeholders. All three are claims. This is the only stage that tests them
> against the actual task cards, and under test a plan whose self-check made all
> three claims had all three of them false.

And the rule that decides the hard findings:

> "The spec does not say" is not a licence for the plan. It is the definition of a
> requirement-level finding.

This stage finds things and hands them back. It does not fix them, does not decide
them, and does not write a task.

## When to Use

- `04-plan.md` exists for this request and nothing has reviewed it yet.
- Someone is about to hand out cards, estimate, staff or build against a plan.
- You are asked to approve a plan, or to approve one quickly.
- A plan that was sent back has come round again — see *Rounds and Caps*.

## When NOT to Use

- **There is no plan.** See *The Gate*. `relay-planning` writes one, and may have
  been right not to.
- **A spec is what is being reviewed.** That is `relay-reviewing-spec`.
- **Code or a delivered change is being reviewed.** That is
  `relay-reviewing-implementation`.

## The Gate: No Plan Means No Review

If `04-plan.md` does not exist, there is nothing to hold to a bar, and the most
likely reason is that `relay-planning` **correctly refused to write one** because a
requirement it would have had to implement was not decided. That refusal is that
stage's designed behaviour, not a gap you fill.

So, when the file is absent:

1. **Read `00-journal.md`'s planning section and any handoff you were given, and
   name the blocker they name** — what was undecided, and who has to answer it.
2. **Check that blocker against `02-spec.md` yourself**: that it is genuinely not
   settled there, and that it is load-bearing. A blocker the spec turns out to
   answer is itself a finding, routed to `relay-planning`.
3. **Do not invent a review of a document nobody wrote**, and do not write
   `04-plan.md` or settle the blocker so that a plan can exist. No coverage table
   over tasks that do not exist, no read-it-alone table, no seam table: record
   those checks as **not run** for want of a subject. A check with no subject is
   not a check that passed.
4. Write the review file anyway with the verdict `no plan to review`, so a later
   reader has a record that this stage ran, and hand off to the stage the blocker
   names.

**This stage writes exactly two files:** `05-plan-review.md`, and its own appended
section of `00-journal.md`. It creates no others, and it never edits `04-plan.md`
or `02-spec.md`.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`. This is a **default** — a
project or user preference for a different location overrides it, so check for one
and honour it. `<request-id>` defaults to `YYYY-MM-DD` using the current date
already present in your environment; never compute or invent one.

Read all of these from disk before writing a line of review, and never assume live
session memory of any earlier stage: `04-plan.md`, the subject; `02-spec.md`,
**required**, because without it there is no coverage check and that is the check
that finds a requirement no card carries — if it is missing, say so and stop;
`03-spec-review.md`, because a plan standing on a latest verdict that is not
`approved` is a finding, not a detail; `01-intake.md`, the requester's own words,
where a narrowed requirement is visible as a narrowing; `00-journal.md`, for what
earlier stages decided and the pressure they were under; and any existing
`05-plan-review.md`, for every prior round.

**Exception — `04-plan.md` opens with the Standalone Mode marker** (see
`relay-planning`). Then `02-spec.md`, `03-spec-review.md` and `01-intake.md`
are expected to be absent — that absence is not a finding on its own. Use the
plan's own `## Requirements (standalone...)` section as the Behaviour/Acceptance
surface everywhere below that would otherwise read `02-spec.md`, and say
explicitly, in your first message, that this substitution is in effect.

Say in your first message which you found and which are missing. These files are
the resume mechanism: after a context loss, re-reading them from disk is what
re-establishes state — there is no separate ledger. Then read the code
the plan is written against, where you can reach it. A file row or a signature you
could not check is an unverified claim; say so rather than recording it as read.

## The Bar

**Violating the letter of these rules is violating the spirit of these rules.** A
review that reached the right verdict by a route that skipped a check got lucky,
and the plan is the last document where a wrong answer costs a conversation instead
of a rewrite with tests around it.

### Forbidden in this review, by name

Every one of these was produced by an agent under test:

- **A verdict value you invented.** One subject wrote `conditionally approved`;
  another wrote a verdict with a second destination bolted on in brackets. A
  downstream stage keys on the verdict. There are exactly six values, listed in
  *Write `05-plan-review.md`*, and nothing goes in that line but one of them.
- **Severity words of your own** — `blocking`, `significant`, `nit`. There are
  three values, because the round cap is keyed to them and to nothing else.
- **A partial go-ahead**, in any form: a section naming which cards can start in
  the morning, a verdict that splits the task list into "clean, start now" and
  "needs a patch first". A reader acts on the permissive half. Under test one
  review closed with a heading titled *What can start clean at 09:00*.
- **Writing the fix.** *"Fix: add `floor` … and have Task 8 carry it through."* /
  *"Recommend treating this the same way D-3 was treated — pick a reasonable
  default and record it as a delegated decision."* Name the defect and what the
  card's holder is left to guess; the repair is `relay-planning`'s.
- **Classifying by who can fix a finding, or by what it costs the schedule**,
  rather than by which document is wrong. See *Classifying Every Finding*.
- **Accepting the plan's coverage table as the coverage check**, or its
  `## Self-check` as evidence that anything was checked.
- **Editing `04-plan.md` or `02-spec.md`**, writing a corrected requirement or task
  anywhere, settling an open question, choosing between two readings you found, or
  drafting the message the requester gets.
- **Treating any of these as evidence about a finding**: the plan's author knows
  the codebase best; implementers are idle tomorrow; the requester is unreachable;
  the author already flagged this one himself; the last review round changed
  nothing.

## The Eight Checks

Run all eight, in this order, on every review — including one that is going to end
in an approval. Each produces a stated result in the review file **even when it
finds nothing**: in a file that lists only findings, "no finding" and "not checked"
are indistinguishable.

### 1. Coverage against the cards, then one run end to end

One row per requirement in `02-spec.md`'s `## Behaviour` (or, in Standalone
Mode, the plan's own `## Requirements (standalone...)` section) **and one row
per entry in its `## Acceptance`**. For each, name the **task step or done-when that actually
carries it** — not the task the plan's coverage table names. Three results per row:
the step that carries it; **DROPPED**, no step carries it; **NARROWED**, a step
carries less than the requirement says.

That distinction is the whole check. Under test a plan's table mapped a requirement
to a card that only sent a one-way message, while the requirement needed something
to receive a reply and write a mark, and no card anywhere did either. The row was
not short. It was false.

**Then walk one run end to end**, carrying the actual data from card to card in the
order the plan runs them. Card-by-card reading cannot do this, and **both subjects
under test missed the same defect because neither did it**: the orchestrating card
released each selected booking and then notified every booker, while the spec said
a booking the API refuses to release gets no message at all. Every card was
defensible alone; the built thing would tell people their booking was released when
it was not.

Then the reverse direction, cheap once the rows exist: a task carrying no
requirement is work nobody asked for. Finally, compare your table against the
plan's own — the gap between them belongs in the review.

### 2. Read it alone

One row per task. The plan's own bar, applied by somebody who did not write it:

> Could the person holding this card finish it today, alone, with nothing but this
> card?

A task fails if finishing it needs a value, a file, a sample, a decision or a name
that is not on the card and not in a card already handed out. Forms that failed
under test: *"Add appropriate handling for the remaining refusal reasons"*; a
done-when requiring a channel *"confirmed by Facilities"* that nobody had named; a
done-when that only says the file compiles.

The wording is not the test. A done-when that reads like a done-when still fails it
if its holder cannot reach the thing it names.

### 3. Seams, character for character

Every task's `Consumes`, against the `Produces` of an earlier task. Compare the
name, the parameters, the return shape and the type names **literally**. A name in
a `Consumes` and in no earlier `Produces` is a reference to something no task
defines, and the implementer holding that card cannot discover the real name.

Three forms appeared under test: a renamed function with a changed return type and
parameter name; a type consumed by name that no task declares at all; and the
reverse — a card whose steps plainly need an earlier card's function while its
`Consumes` line says nothing about it.

### 4. What the plan decided — and what it should have read instead

Every row of `## Decisions taken at planning`, against the plan's own test:

> Would two different answers change anything the requester can see or check? If
> yes, it is the spec's and not the plan's.

Three failing shapes, all observed:

- **A behavioural rule for a case the spec does not cover**, labelled *"reversible"*
  and *"flagged for her return"*. That label is a finding, not a mitigation. And
  check it: a decision claimed reversible through a configuration key the plan never
  defines is not reversible at all.
- **A decision the spec does answer**, taken anyway.
- **A fact asserted instead of read.** The predicate is observable: *is there a
  document, a file, a system or a sample that already holds this answer?* If yes,
  it was a fact, and not going and reading it is the finding.

**The third shape is the one this check exists for, and it is the one that gets
waved through.** Under test the unpressured reviewer — which caught everything else
— cleared a decision that named an API field it had never looked at, asserted from
*"the field naming in the docs index"* and hedged as *"a one-line change if it turns
out to be called something else"*. The reviewer filed it as *"internal wiring, cited
source, explicitly reversible"* and moved on, while filing a different card's
uncited assumption as a finding in the same review. A source cited is not a source
read; if the flag is named differently, the requirement resting on it is not
implemented, and the honesty of the hedge does not change that. Ask of every
asserted fact: **did anybody actually open the thing?**

### 5. The files section against the cards, in both directions

`## Files and what each is responsible for` must be present **and true**. Three
checks, all cheap, all skipped when the section merely exists:

- **Every row's file appears in the `Files` slot of the task that row names.**
- Every file in any task's `Files` slot has a row.
- No row names a responsibility no card implements.

**The first direction is the one both subjects skipped.** Both found the file that
appeared on a card and in no row — the easy direction, because the card is where
you are already reading. Neither checked the other way, and the row they both
walked past made one task responsible for the run order and for what happens to the
whole run when a step throws, while that task's card never mentions the file and a
different task quietly builds it. Nobody owns the abort behaviour, and no card
holder can discover that.

### 6. Task boundaries

Using the plan's own test: could a reviewer meaningfully approve this task while
rejecting the one next to it? If two can only be judged together they are one task;
if a reviewer would have nothing to check, it is not a task.

Judge the cut, not the style. A thin task a reviewer can genuinely gate is a task,
and merging it into its neighbour is a preference. Under test both subjects were
right not to raise a boundary finding on a proportionate decomposition — but
neither recorded having looked. Record the result either way.

### 7. A requirement the plan found undecided

Decomposing a spec is the sharpest reading it ever gets, so a plan routinely
surfaces a gap that `relay-refining` and `relay-reviewing-spec` both missed. Two
things can then have happened, and only one of them is fine:

- The plan **stopped** and routed it. Confirm that, and it is not a finding against
  the plan.
- The plan **planned past it** — decided it, labelled it reversible, flagged it for
  the requester's return, and carried on. That is a finding, and it is
  requirement-level.

**This is the check that failed under pressure.** Handed a plan that defined an
undefined, load-bearing term itself and labelled the choice reversible, the
pressured subject took the definition apart correctly — it saw that the rule would
release rooms people were sitting in — and then declined to treat it as a finding,
in these words:

> *"Technical incompleteness → I fix or block; business-risk judgment the author
> already knowingly owns and dated → I surface, I don't override."*
>
> *"Overriding that with a hard block would be me relitigating a decision the author
> already owned and dated — that's not my job as reviewer, especially under this
> deadline."*

Both sentences are reasonable and both are the failure. Raising it is not
overriding the author; it is naming which document owes the answer. An honest label
on a decision is evidence the author knew it was not theirs, not evidence that it
was. **The spec being silent is what makes it requirement-level.** So the question
is never "is the spec silent":

> Do two answers change what somebody outside the team observes? If yes, the spec
> owes an answer, whoever is available to give it.

### 8. Code content, not placeholder

Every step whose deliverable is code — a step producing or changing a test or an
implementation — must contain the code itself, in a fenced block, not a
description of what the code should do. Read every such step and confirm there
is actually code there, and that it reads as a real attempt rather than a
stand-in ("write the appropriate check", a comment where a body should be).

This check is structural, not semantic — it does not ask whether the code is
correct against the spec; that is `relay-reviewing-implementation`'s job, run
against the real thing once it exists. It asks only whether a reader could
transcribe this step today without inventing anything. A step that reads like a
step but has no code behind it fails this check the same way a done-when that
cannot be reached fails Check 2.

## Classifying Every Finding

Every finding names its bucket **and one sentence of why**. An unclassified finding
is requirement-level.

The axis is **which document is wrong**. It is not who can fix it, it is not how bad
it is, and it is not what it costs the schedule.

- **Requirement-level** — the defect is in `02-spec.md`: a requirement is ambiguous,
  undefined, contradictory, or not what the intake confirmed, and the plan could not
  have been right about it. Destination: `relay-refining`.
- **Layer-level** — the spec is right and `04-plan.md` has the defect: a requirement
  no card carries, a broken seam, a placeholder, a false coverage row, a files row
  belonging to no card, a decision that belonged to the spec. Destination:
  `relay-planning`, which has a re-entry path for exactly this.

**In Standalone Mode**, there is no `02-spec.md` and no `relay-refining` to
send a requirement-level finding to — the plan's own `## Requirements
(standalone...)` section stands in for the spec, and it is `relay-planning`'s
to fix either way. Classify every finding exactly as above regardless — the
label still tells `relay-planning` whether the fix is a planning defect or a
requirement to take back to the requester — but both classifications share
one destination and one verdict value: `rejected — routed to relay-planning
(standalone)` (see *Write `05-plan-review.md`*).

Unlike the spec review one stage up, **most findings here are genuinely
layer-level** — there is a real layer below the spec now, and it is the one being
read. That expectation is correct, and it is also the trap: it makes the one
requirement-level finding in ten look like an outlier to be talked out of.

### "Can it be fixed without asking anyone" is not the axis

Under test the pressured subject sorted all eight of its findings by exactly that
question, and said so:

> *"I checked each one against 'can this be resolved by editing the plan document,
> or does resolving it require a fact only Dana has.' All eight resolve by document
> edit."*

Seven of the eight were layer-level anyway, so the answer looked right. The eighth
was the undefined term the whole feature turns on, and that test is what let it
through — because a plan can always be *edited* to say something, whoever decides
what it says. Naming who has to answer a finding is useful and belongs **inside**
the finding. It is not the classification and it is not a second destination.

## Severity Is Three Values

`critical`, `moderate`, `minor` — not your own words, because the round cap is
keyed to these and nothing else.

| Severity | Test |
|---|---|
| critical | A card cannot be finished as written, **or** the thing built would fail an acceptance entry, **or** a contract rule is broken, **or** evidence a claim needs is missing |
| moderate | A real defect that does neither of those |
| minor | Cosmetic, or cheaper to fix than to argue about |

Apply the test rather than a feeling about scale, and never let a low-severity word
carry a high-severity finding. Under test one subject invented the scale
`blocking / significant / nit` and filed under *nit* an acceptance entry no card
carries at all — which is the critical test, word for word.

## Rounds and Caps

A plan can arrive here more than once for the same underlying issue. Before writing
any finding, read `00-journal.md` and every prior round in `05-plan-review.md`, and
decide per finding whether it is new or a continuation.

> The test is the root cause, not the wording. Ask: **would the answer that closes
> it be the same answer as last time?** If yes it is the same finding, however
> reworded and whatever number it now carries. A task rewritten and still resting on
> a value nobody has is a continuation.

A continuation does not start a fresh count; say which round it started in. **A
finding's first appearance is round 1**, and each further look at the artifact is
the next round — you never watch a fix happen, only the result of one, so the count
is of your own passes.

| Severity | Rounds | Meaning |
|---|---|---|
| critical | 4 | continuation counts against the same 4 |
| moderate | 2 | continuation counts against the same 2 |
| minor | no limit | judgment call; document the decision either way |

**Something no round can fix** — a decision only a named human can make *and that
human cannot be reached at all*, a credential you do not have, access you do not
have — stops immediately and consumes no round. That predicate is narrow. A finding
needing the requester's answer is **not** it: `relay-refining` reaches requesters,
and an absent requester is the ordinary case, not an exemption.

### When a cap is reached

Not a further rejection. All four of:

1. **The verdict becomes `rejected — round cap reached`**, and the capped finding is
   *not* routed onward again. The cap exists to end that loop.
2. **A `### Capped` section** naming: the finding, its root cause in one sentence,
   the rounds it consumed with their dates, and **who has to decide it — a person or
   a role, never a stage.** With no name, name the role.
3. **The open question travels in the handoff message**, which the requester can
   forward, and condensed in the journal section. No new file for it.
4. **The journal section says the cap was reached**, on which finding, and that the
   chain stops there.

**The verdict is one value; routing is per finding.** A cap changes where the capped
finding goes and nothing else: every other finding in the same round travels as
usual and the remaining checks still run. Say every destination, or a reader is left
holding findings with nowhere to take them.

And **never downgrade a capped finding to make the cap go away** — no critical
reclassified as moderate, no merging it into another, no approving with it noted.

## Write `05-plan-review.md`

Append-only across rounds: one `## Round <n>` section per round, newest last, and
never edit a section written by an earlier round. A prior round's wording is the
evidence for the continuation test.

The verdict is one of exactly six values, chosen by an observable condition. The
`## Round <n>` heading carries that value and nothing else — no bracket, no
qualifier, no second destination.

| Condition | Verdict | Successor named |
|---|---|---|
| No finding | `approved` | `relay-plan-execution` |
| `04-plan.md` carries the Standalone Mode marker, and any finding exists (not capped) | `rejected — routed to relay-planning (standalone)` | `relay-planning` |
| Any finding is requirement-level (not Standalone Mode) | `rejected — routed to relay-refining` | `relay-refining` |
| Every finding is layer-level (not Standalone Mode) | `rejected — routed to relay-planning` | `relay-planning` |
| A finding has reached its round cap | `rejected — round cap reached` | the person or role, plus whichever of the rejections still applies to the rest |
| `04-plan.md` does not exist | `no plan to review` | the stage the recorded blocker names |

The Standalone row is checked first, before the requirement/layer split below
it — a Standalone plan never produces a `relay-refining` verdict, because
there is no `02-spec.md` for that stage to own.

A requirement-level finding decides the verdict on its own, and the layer-level
findings in the same round are **recorded now and travel to `relay-planning` after
the spec is settled** — not in parallel with it. This does not apply in
Standalone Mode, where both kinds already share one destination. `relay-planning`'s re-entry runs
the whole plan back to its bar in one pass; a pass that starts before the
requirement is decided is a pass that gets redone. Say that ordering explicitly, so
the layer-level findings are not read as having nowhere to go.

Every heading below is **required**, in this order.

```markdown
# Plan review — <request-id>-<slug>

## Round <n> — <date> — <verdict>

### Verdict
<One of the six values, written out, with the successor named, then one sentence
saying what makes it that one. No second verdict, no qualifier in brackets, no
partial go-ahead, no list of what can start tomorrow.>

### Coverage
<A row per requirement in `## Behaviour` and per entry in `## Acceptance`: the task
step or done-when carrying it, or DROPPED, or NARROWED — <how>. Then the reverse
direction, then the gap between this table and the plan's own.>

### Run-through
<One paragraph: the data as it passes card to card in run order, and where it stops
matching what the spec says happens.>

### Read it alone
<A row per task: handable, or what is missing from the card.>

### Seams
<A row per consumed name: its declared source, and whether that task's `Produces`
contains it literally. Plus any card whose steps need an earlier card's output that
its `Consumes` does not declare.>

### Checks run
<One line each for the decisions boundary, the files section in both directions,
task boundaries, and code content on every code step. A check that found nothing
says so in as many words; a check with no subject says "not run" and why.>

### Findings
<Each: an id; severity by the stated test; classification with one sentence of why;
what is wrong, quoting the plan; and what the holder of that card is left to guess.
For a continuation, the round it started in. For anything only the requester can
answer, the question as you would put it and who has to answer it.>

### Capped
<Only in a `rejected — round cap reached` verdict. Omit the heading otherwise.>
```

`### Capped` is the one heading that is not always present. In every other verdict
— `approved`, either rejection, and `no plan to review` — the heading is **absent**,
not present saying "not applicable". Under test a review that had correctly reached
`no plan to review` still wrote the heading in to say it did not apply.

## Approving Is Also a Reviewed Artifact

An approval is written, not withheld. Same file, same round section, the same
coverage, run-through, read-it-alone and seam tables, the same *Checks run* lines —
with `approved` as the verdict and `relay-plan-execution` as the successor. Silence is
not an approval and neither is "no findings"; the stage that builds from this has to
be able to read what was tested.

And it is a real approval. **Do not manufacture a finding so the review looks like
work.** Five things that are not findings: a task boundary you would have drawn
differently, where a reviewer could still gate each side; a name, a path or an
output layout you would have chosen differently; a decision that is genuinely
planning's, correctly anchored and actually read rather than assumed; a one-task
plan for a small spec, whose `Consumes` and `Produces` are legitimately "nothing";
a step written in more detail than you would have written it. A plan that carries
every requirement and every acceptance entry to a card somebody can finish alone is
a finished plan, and its author's style is not yours to review.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage or round. The heading
names **this stage**, not a description of what you did — under test a subject
headed its section *"plan review"*, and the relay's last stage matches sections to
stages by that name.

```markdown
## <date> — relay-reviewing-plan
<2-4 sentences of prose: the verdict and what decided it, which findings are
continuations and from which round, anything that hit a cap and who it went to, and
any pressure the review ran under that a later reader would want to know about.>
```

Prose, not a ledger line. The relay's last stage reviews the process with the
journal as its only source.

## Hand Off

End with exactly this shape: (1) a **status line** — the review is written, its
verdict, and its exact file path; (2) the **successor**, named per the verdict
table; (3) **one question** offering three ways forward — continue with the
successor / go to a different step instead / stop here.

Under test neither subject produced this shape. One ended on a list of which cards
could start in the morning; the other ended on a routing table with no next step and
no question. A review that ends without a named successor and a question is a review
somebody reads for the parts they like.

Never invoke the successor yourself, and never write the fix while you wait.

## Rationalization Table

Every excuse in the left column was produced by an agent under test.

| Excuse | Reality |
|---|---|
| "Technical incompleteness → I fix or block; business-risk judgment the author already knowingly owns and dated → I surface, I don't override." | Two categories, and the second one is where requirement-level findings go to die. An honest label is evidence the author knew the question was not theirs. |
| "Overriding that with a hard block would be me relitigating a decision the author already owned and dated — that's not my job as reviewer." | Naming which document owes the answer is not overriding anybody. It is the entire job. |
| "I checked each one against 'can this be resolved by editing the plan document, or does resolving it require a fact only Dana has.'" | A plan can always be edited to say something, whoever decides what it says. That test let through the one finding the whole feature turns on. |
| "I did shape the verdict around the deadline — instead of a binary approve/reject I split the task list into 'clean, start now' and 'needs a document patch first'." | That is a partial go-ahead wearing a verdict's clothes, and the cards you called clean are the ones your own findings rewrite. |
| "Conditionally approved — the plan document needs three edits; nothing here needs the requester." | `conditionally approved` is a value no stage reads. There are six, listed by name, and inventing a seventh is how a rejection gets handled as a note. |
| "Blocking / significant / nit — three nits." | The round cap counts critical, moderate and minor. Your own scale is a cap nobody can apply — and the thing you filed as a nit was an acceptance entry no card carries. |
| "Rejected — routed to `relay-refining` (plus layer-level work for `relay-planning`)." | Two destinations in the verdict line is a reader's decision, not a verdict. One value on the line; the ordering goes in the sentence under it. |
| "Most of the layer-level findings don't depend on the requirement question, so they can be fixed in parallel." | The re-entry pass runs the whole plan back to the bar in one go. A pass that starts before the requirement is settled is a pass that gets redone. |
| "Fix: add `floor` to `ReleaseOutcome` and have Task 8 carry it through." / "Recommend treating this the same way D-3 was treated — pick a default and record it as reversible." | Possibly correct, and not yours to write. Name the defect and what the card's holder is left to guess. |
| "It's internal wiring, it cites a source, and it's explicitly reversible — correctly the plan's decision to take." | It cited a source it never opened. A source cited is not a source read, and the requirement resting on that field name is not implemented if the name is wrong. |
| "It admits it guessed the field name and says it's a one-line change if wrong." | Then it was a fact somebody could have read in a minute, and not reading it is the finding — including because that same fact may decide whether a requirement-level question exists at all. |
| "The plan's coverage table maps that requirement to Task 4, so it's carried." | Task 4 only composes and sends a message; the requirement needs something to receive a reply and write a mark, and no card does either. The row was not short, it was false. |
| "Every card is defensible on its own." | They were, and the run was broken: every booker got told their booking was released, including the ones whose release the API refused. Walk one run through the cards in order. |
| "It's recorded as reversible and flagged for her return." | A reversibility label is a finding, not a mitigation. Check it too — a decision reversible through a config key the plan never defines is not reversible at all. |
| "The file table is missing one filename — doesn't block anything." | That is the easy direction. The row nobody checked made a task responsible for the whole-run abort behaviour, on a card that never mentions the file. |
| "The last review round cost us two days and changed nothing, and the team lead wrote this one himself." | Then say what this one changes. Authorship is not evidence about a finding, and the findings that stop a build are not the ones that cost two days for nothing. |
| "The requester is unreachable for two weeks, so a requirement-level finding stalls everything." | Unreachable is the ordinary case and the next stage is the one that reaches requesters. It also has a cheap first step: read the fact that might dissolve the question. |
| "No `02-spec.md` in the folder, so I treated it as standalone and skipped the coverage check against a spec." | The marker at the top of `04-plan.md` is what says standalone, not an empty folder. A plan missing `02-spec.md` with no marker is a plan missing a required file, not a standalone plan — that is a finding, not an exemption. |
| "The plan's Standalone marker says the requester confirmed the Requirements section, so I took that as read." | The marker records that planning says it happened. Check it the way you check any other asserted fact — is the confirmation actually visible, or only claimed. |

## Red Flags

Each of these means you are mid-violation, not about to be.

- "The spec is silent there, so it was planning's to decide."
- "It's flagged for her return." / "Reversible." / "The author already owned it."
- "I'd be relitigating the author's decision." / "That's not my job as reviewer."
- "Can this be fixed by editing the plan, or does it need the requester?" (as the
  classification)
- "Conditionally approved." / "Blocking." / "Significant." / "Nit."
- "Rejected, but these cards can start tomorrow." / "What can start clean at 09:00."
- "The fix is to…" / "I'd recommend…" / "Pick a default and record it as reversible."
- "It cites a source." / "It's a one-line change if wrong."
- "The plan's coverage table maps it to Task N." (as the coverage check)
- "Every card reads fine on its own."
- "No `02-spec.md`, so I'll skip the coverage check." (without checking for the
  Standalone Mode marker first)
- Treating an absent marker as license to skip `02-spec.md`/`03-spec-review.md`
  instead of filing their absence as a finding.
- Reaching the verdict without a row for every acceptance entry, without having
  walked one run through the cards, or without having checked every files row
  against the card it names.
- Writing a corrected task, a corrected requirement or a schedule, anywhere; or
  reaching for a file-writing tool on anything but `05-plan-review.md` and
  `00-journal.md`.
- Adding a finding because the review looked short.

## Worked Example

A plan for releasing meeting-room bookings that went unused: eight requirements,
eight acceptance entries, an approved spec, eight task cards with a files table, a
decisions table and a self-check claiming all three of its checks pass. Review
requested at 17:00 with two implementers free from 09:00, the plan written by the
team lead, the requester on leave for two weeks, and *"don't hold this up over
process."*

**What failed under test (do not do this).** Two reviewers wrote long, sharp
reviews, catching the broken seams, the placeholder step and the missing acceptance
rows. Neither walked one run through the cards, so neither saw that every booker
would be told their booking was released including the ones the API had refused.
Neither checked a files row against the card it named, so the module owning the
whole-run abort behaviour stayed owned by nobody. One invented a verdict and a
severity scale and closed on a list of what could start at 09:00; the one that
stayed unpressured cleared a decision naming an API field nobody had ever opened.

**What this skill does instead.** Check 1 against the cards, then the run-through,
which is where the plan dies: select, release, notify each booker — including the
bookers whose release the API refused, who the spec says get no message. Then check
4 on the decisions table. Two rows are genuinely planning's. One defines a term the
spec never defines; one asserts a field name from *"the naming in the docs index"* —
a fact somebody could open in a minute, so not opening it is the finding, and the
answer may decide whether the first row is a question at all.

Then check 7 on that first row. The spec is silent about what "unused" means, and
that silence is what makes it the spec's: two answers change which rooms people find
released out from under them, which is what somebody outside the team observes.
**Requirement-level**, critical by the stated test — every selecting card implements
it, and both readings pass every acceptance entry, so a wrong answer ships green.
That finding decides the verdict on its own:

> Round 1 — 2026-08-28 — rejected — routed to `relay-refining`

Not "conditionally approved" and not "rejected, but four cards can start in the
morning" — those are the cards the findings rewrite. Handed off:

> Review written to `docs/relay/2026-08-28-no-show-release/05-plan-review.md`.
> Rejected: one requirement-level finding — the term every selecting card turns on
> is undefined in the spec and the plan defined it itself and labelled the choice
> reversible — so that goes to `relay-refining` first. Nine layer-level findings
> are recorded and travel to `relay-planning` once the spec is settled, not before,
> because the re-entry pass runs the whole plan back to the bar in one go: three
> broken seams, a requirement no card carries, a placeholder step, a files row
> whose card never mentions the file, and a run in which every booker is notified
> including the ones whose release was refused. The requirement finding has a cheap
> first step that may close it without the requester: the booking export may
> already record whether a room was entered. Continue with `relay-refining`, go to
> a different step instead, or stop here?
