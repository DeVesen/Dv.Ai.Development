---
name: relay-reviewing-spec
description: Use when a spec has been written and anything is about to be planned, estimated or built against it, when someone asks for a spec to be approved or hurries one through ("planning starts today", "the requester already signed it off", "don't send it back over wording"), or when a spec that was sent back has come round again. Also use when about to approve a spec without having read the intake note it was written from.
---

# Relay Reviewing Spec

## Overview

Third stage of the relay, and the last point at which a wrong requirement costs
a conversation instead of an implementation. Everything after it — planning,
building, every later review — is held to `02-spec.md`.

Core principle:

> A review that reads only the spec can only find what is wrong with the words
> that are there. A large part of what a spec gets wrong is something that is
> not there at all.

This stage finds things and hands them back. It does not fix them, does not
decide them, and does not write requirements.

## When to Use

- A spec exists for this request (`02-spec.md`, from `relay-refining`) and
  nothing has reviewed it yet.
- Someone is about to plan, estimate, break down, or build against a spec.
- You are asked to approve a spec, or to approve one quickly.
- A spec that was sent back has come round again — see *Rounds* below.

## When NOT to Use

- **There is no spec.** Nothing to review; `relay-refining` writes one.
- **A plan is what is being reviewed.** That is `relay-reviewing-plan`.
- **Code or a delivered change is being reviewed.** That is
  `relay-reviewing-implementation`.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`.

This is a **default**, and so is the language the artifacts are written in.
Where the project's always-loaded instruction file names an artifact home or
an artifact language in its `## Relay process discipline` section — installed
by `relay-init` — that binds. Absent it, use the path above and the language
of this conversation, say in your first message which language you are writing
in, and never infer it from files that already exist. Anything quoted from the
requester is recorded in the words they used, never translated.
`<request-id>`: `YYYY-MM-DD`, your environment's current date — never computed
or invented.

Read all of these from disk before writing a line of review, and never assume
live session memory of any earlier stage: `02-spec.md` (the subject);
`01-intake.md` — **required**, because without it there is no coverage check and
that is the check that finds dropped requirements; `00-journal.md`, for what
earlier stages say they decided and who they say decided it; and any existing
`03-spec-review.md`, for every prior round.

Say in your first message which you found and which are missing. If
`01-intake.md` does not exist, say so and stop: an approval without it is an
approval of a document against nothing.

### Read Scope by Round

**Full-reread rounds: 1–2. Scoped rounds: 3+.** The first two rounds read
`01-intake.md` in full for Check 1 — that is where the large structural gaps
get caught, and nothing less than the whole intake catches them.

From round 3 onward, default Check 1's scope to: the diff in `02-spec.md` and
`01-intake.md` since the version this stage last reviewed; the specific
intake rows and requirements named in the most recently closed findings; and
a full coverage sweep restricted to whichever single section of the intake is
closest to the area just changed. Say in your first message which scope you
used and why.

**Escape hatch, always available:** if a changed requirement is referenced by,
or interacts with, requirements outside the just-changed area, run the full
sweep for those interacting areas regardless of round number. The threshold
lowers the default cost once the process has converged past its early,
high-yield rounds — it never licenses skipping a check that could still catch
something.

**This stage writes exactly two files:** `03-spec-review.md`, and its own
appended section of `00-journal.md`. It creates no others, and it never edits
`02-spec.md`. Open questions and blocked decisions go in your handoff message,
which the requester can forward, and condensed into your journal section — not
into a file of their own, which no later stage reads.

## The Bar

**Violating the letter of these rules is violating the spirit of these rules.** A
review that reached the right verdict by a route that skipped a check got lucky,
and the next spec is where the luck runs out.

### Forbidden in this review, by name

Every one of these was produced by an agent under test:

- **A verdict a reader has to infer**, or two verdicts at once — *"rejected, but
  planning isn't blocked on R-2 and R-3, those are clean"*. A reader acts on the
  permissive half.
- **Praise where the verdict belongs.** A `## What the spec gets right` section
  ahead of the blocking findings.
- **A finding softened into a suggestion**: *might want to*, *consider*, *worth a
  look when the spec is next touched*, *nice to have*, *noted for later*.
- **A finding with no classification**, or one blanket line covering several
  findings (*"All requirement-level."*).
- **Your own severity words substituted for the classification** — *Blocking*,
  *Must-fix*. Severity and classification are two required fields, not one.
- **A routing destination you invented**, or any requirement-level finding sent
  anywhere other than `relay-refining`.
- **Editing `02-spec.md`**, or writing the corrected requirement anywhere.
- **Doing the next stage's work** — drafting the message the requester gets,
  deciding an open question, choosing between two answers you found.
- **Treating any of these as evidence about a finding**: the requester approved
  the whole document; the author has re-read the rule several times; the schedule
  has no room for another round.

## The Eight Checks

Run all eight, in this order, on every review — including one that is going to end
in an approval. Each produces a stated result in the review file even when it
finds nothing: "no finding" and "not checked" are indistinguishable in a file
that only lists findings.

### 1. Coverage — run it backwards

The instinctive direction is to read the intake in order to judge the
requirements in front of you. **That is not this check.** Under test one reviewer
described its own method as *"the intake and journal as ground truth for what was
confirmed and by whom"* and dropped three confirmed items — nothing in that
direction goes looking for an absence.

This check runs from the intake outward. Enumerate every item in the intake's
`## In scope`, `## Constraints`, `## Success criteria`, `## Out of scope` and
`## Decisions delegated to me`, one row each, and for every row go and find the
requirement or acceptance entry that carries it. Three possible results: the
requirement number that carries it; **DROPPED**, nothing in the spec carries it;
**REVERSED**, the spec carries something that excludes it.

**A carrier is not only a numbered `R-n`.** An intake constraint that lands in
the spec's own `## Constraints` heading is carried by that entry, exactly as an
out-of-scope item is carried by a `## Boundaries` bullet — neither has to be
duplicated into a numbered `## Behaviour` requirement to count as covered.
Reading "the requirement… that carries it" to mean only a numbered
`## Behaviour` item is the literal misreading that marks a correctly-placed
`## Constraints` entry **DROPPED** when it is not: the row is satisfied by
naming whichever section — `## Behaviour`, `## Acceptance`, `## Boundaries`, or
`## Constraints` — actually carries the item.

**Reversal is the one to hunt.** It is worse than absence and it reads as
tidiness. Under test a reviewer wrote that `## Boundaries` *"correctly carries
the read-only rule and the email-only rule forward from the intake"* while that
same section carried a bullet excluding an item the requester had confirmed as in
scope. A boundary that reads cleanly is exactly where a confirmed requirement
goes to disappear.

Then the other direction, cheap once the rows exist: every requirement with no
intake item behind it **and** no row in the spec's `## Decisions and who made
them` arrived from nobody. Name it. A requirement nobody decided is not made safe
by being reasonable.

### 2. Checkability

One row per requirement in `## Behaviour`: the entry in `## Acceptance` that
covers it, or **NONE**.

An acceptance entry fails this check if the requester could not run it themselves.
Forbidden in one, by name: *inspect the code*, *read the source*, *verify the
implementation*, *confirm the function*, *check the routine*, and any variant
requiring someone to be shown how the thing is built. Also failing: an entry that
exercises only the first step of a multi-step rule, and one that restates the
requirement in different words without saying what anyone does or observes.

### 3. Hedge words and escape hatches

`relay-refining` is held to a bar that forbids these; this check is the second
pair of eyes for what got through anyway. This runs against the whole
document — `## Constraints` and `## Architecture` are in scope exactly as
`## Behaviour` is, not a lighter pass because the heading is newer. A hedge
word does not become safe by moving to a different heading. The test is
mechanical:

> Delete the word and read the sentence again. If it now says something nobody has
> decided, it is a finding. If it says exactly the same thing, the word was noise
> — not a finding worth a round.

That test is also the answer to *"don't send it back over wording"*: it separates
a phrasing preference from an undecided requirement, and only the second is a
finding. Say which candidates you tested and dropped.

Also a finding: any device by which a reader can tell part of the document is not
yet binding — an assumptions or open-questions section, a `TBD`, a status banner
downgrading it, a tag marking a requirement as resting on something unconfirmed,
a reversal note.

### 4. Cascade shape

Mechanical trigger, not a judgement call. A requirement is a cascade if it
contains **if**, **unless**, **otherwise**, **falls back**, **retries**, **by
default**, **when that is not possible**, or any equivalent. Required shape:

```
R-n. <what this rule governs>
  1. When <observable condition>: <behaviour>.
  2. When <observable condition>: <behaviour>.
  Final: when none of the above holds: <what the user sees, what state is left
  behind, and that nothing further is attempted>.
```

Four properties, each its own possible finding: **ordered** and numbered; **a
precondition per step**, observable — *"if that fails too"* is not; **a final
step, always**, and an outcome rather than another attempt — *"it is retried
later"* is another attempt, so the rule has no end state; **no overlap** between
steps. A cascade compressed into one sentence is a finding even when the sentence
is accurate, because a reader can stop after the first clause and believe the
rule is complete. The acceptance entry that exercises only the first hop is the
tell.

### 5. Internal consistency

Three sweeps, all cheap and all skipped when a document reads well:

- Every bullet in `## Boundaries` against every requirement in `## Behaviour`.
  A boundary saying nothing is altered, next to a requirement that marks
  something, is a contradiction whichever one is right.
- Every pair of requirements that touch the same thing. A requirement granting
  a capability while another requirement — or a boundary — forbids every means
  of exercising it is a contradiction, not an omission.
- Every requirement saying a user **can** do something. Does the spec say what
  they do? A capability with no stated way of exercising it is that same
  contradiction one step earlier, and it reads as complete because the sentence
  is grammatical. Under test this was missed twice by reviewers who caught the
  identical fault in the requirement next to it.
- Every entry in `## Constraints` and every sentence in `## Architecture`
  against every requirement in `## Behaviour`, the same direction as the first
  sweep. A constraint that guarantees something a requirement's own cascade
  quietly fails, or an architecture that never wires in the mechanism a
  constraint depends on to be true, is the same contradiction one heading
  over — new headings are not exempt from this sweep because they are new.

Where two requirements contradict each other and both trace to a confirmed intake
item, say so plainly: the requester confirmed both because nobody showed them the
two together. That is a finding for `relay-refining` to put to them, not yours to
resolve by picking one.

### 6. Scope purity

Second opinion on the split test `relay-refining` was supposed to run:

> Does this spec carry **two success criteria that could be met independently** —
> one of them shippable and checkable while the other does not exist yet?

If yes, it is two functional topics in one spec and it needs two: say which two,
with the observable reason. If no, say so and say what the criteria have in
common, in one line. Under test three of five reviewers never ran this check at
all, on specs where they had already flagged the candidate second topic for an
unrelated reason.

### 7. Confirmation is real

`## Confirmation` must name a person or a role, and a date. Then check the name
against `01-intake.md` and `00-journal.md`: the person named must appear there as
someone who gave answers. **A name appearing only in `## Confirmation` is
unverified**, and a real person recorded as confirming decisions they never saw is
worse than a blank line.

Same check one level down: every decision `00-journal.md` records an earlier stage
as having taken must have a row in the spec's `## Decisions and who made them`,
naming who answered. A journal saying two decisions were made, against a
decisions table carrying neither, means two requirements in a confirmed document
rest on nobody.

### 8. Scope leakage in `## Architecture` and `## Constraints`

Two headings, two different ways content can leak into them that does not
belong there.

**`## Architecture`** is licensed for exactly one exception to the rest of
this document's functional-only rule: naming components and data flow. A file
path, a function/class/module name, a line number, or the technique used to
achieve an effect is still forbidden there — the exception permits naming the
moving pieces, never naming how they are built. `scripts/run_weekly.py` or
`LicenseClient.fetch()` sitting inside `## Architecture` is a finding, not
architecture, even though the heading is the one place in the document where
naming *something* is allowed — and it is the easiest place to wave one
through with "Architecture is where implementation detail goes," which is a
misreading of a narrow exception, not what it says. Test: could this word
name a component in a system diagram, or is it a path, a symbol, or a line
number? The second kind is a finding regardless of how naturally it sits next
to the permitted kind.

**`## Constraints`** is licensed only for what the requester stated or would
recognize as their own — a platform requirement, a compliance rule, a
deadline. A version floor, a library choice, a specific database or
technology requirement nobody asked for is planning's own technical taste,
and it does not belong in this document at all, in `## Constraints` or
anywhere else — being inside the `## Constraints` heading does not make it a
legitimate constraint. Test: does `01-intake.md` or `00-journal.md` show this
as something the requester said, or a decision made on their behalf and
reported back to them? If neither, it is a finding, and it is
requirement-level like any other content that does not belong in the spec —
not a lesser category because it is *only* a stray technical detail.

Both are distinct from check 1's coverage sweep: coverage asks whether
something the requester confirmed made it into the spec; this check asks
whether something now in the spec actually earned its place under the
heading it sits in.

## Classifying Every Finding

Every finding names its bucket **and one sentence of why**. An unclassified
finding is requirement-level.

The axis is **which document is wrong**. It is not *who can fix it* and it is
not *how bad it is*.

- **Requirement-level** — the defect is in `02-spec.md`: something is missing,
  reversed, ambiguous, contradictory, unattributed, uncheckable, or not what the
  intake confirmed. Destination: `relay-refining`.
- **Layer-level** — the spec is right and something downstream of it is wrong.
  At this stage nothing downstream exists yet: no plan, no implementation. So a
  layer-level finding here is a note about a stage that has not run, and it does
  not gate the verdict.

Within requirement-level, one further distinction, because the two need
different handling once found:

- **Requirement-level defect** — the requirement itself is missing, reversed,
  ambiguous, contradictory, unattributed, or not what the intake confirmed.
  May need requester input; may interact with other findings; gets its own
  focused round the way *The Verdict Names What Carries It* describes.
- **Acceptance-coverage-only gap** — the requirement's own wording is already
  correct and complete. Nothing about the requirement text is missing or
  wrong. Only a `## Acceptance` entry is missing for one sub-case the
  requirement's own wording already describes — a different mode, trigger, or
  closing cause named in a cascade the requirement already states in full.
  No requester input is needed and the requirement text does not change. See
  *Batching Acceptance-Coverage Gaps*, below — these are handled differently
  from defects, not folded into the same one-at-a-time caution.

Because this review only ever looks at the spec and the intake, **essentially
every real finding is requirement-level.** A layer-level section with several
entries in it is the signal that the axis slipped. Under test, two reviewers
filed a hedge word, a missing acceptance criterion, an acceptance criterion that
required reading code, and a dropped requirement as *layer-level* — reasoning
that all four could be fixed without asking the requester. That is the "who can
fix it" axis, and all four are defects in the spec.

### Requirement-level means `relay-refining`, including the hard ones

Every requirement-level finding goes to `relay-refining` — including, especially,
the ones only the requester can answer. That stage exists to put questions to
requesters; a finding routed there is a question it asks, not an edit it applies.

Under test, a reviewer facing findings it judged unanswerable at that stage
routed them past it: *"they do not go back to `relay-refining` as edit
instructions, because that stage has already declined them three times for the
correct reason."* Sound reasoning, and it leaves nobody responsible for asking.
Three declines mean the question never reached the requester — the one thing that
stage does.

Naming who you think has to answer a finding is useful and belongs in the
finding. It is not the classification and it is not a second destination.

### Batching Acceptance-Coverage Gaps

A requirement-level defect gets found and routed one focused round at a
time — right, because a defect can interact with others and may need the
requester's own answer before it is safe to close. An acceptance-coverage-only
gap needs neither: it is mechanically fixable, and one such gap on one
requirement has no bearing on another gap on a different requirement.

So: when this review's checks surface an acceptance-coverage-only gap, do not
stop at the first one and let the rest wait for a future round to be noticed.
Sweep for every sub-case of every cascade requirement in `## Behaviour` that
lacks its own `## Acceptance` entry, and list every gap you find, together, as
one batched list in this round's findings — whether or not any of them ends
up on the `carried by` line. `relay-refining` closes the whole batch in a
single pass; see its *Re-entry* section.

## Rounds: When the Same Finding Comes Back

A spec can arrive here more than once for the same underlying issue. Before
writing any finding, read `00-journal.md` and every prior round in
`03-spec-review.md`, and decide per finding whether it is new or a continuation.

> The test is the root cause, not the wording. Ask: **would the answer that
> closes it be the same answer as last time?** If yes it is the same finding,
> however reworded and whatever number it now carries. A rule rephrased and
> still missing its final step is a continuation.

A continuation does not start a fresh count. Say which round it started in.

### Closing or Reconfirming What the Last Round Named

Run this once the fresh review above is otherwise complete. Check your
results against the **immediately preceding round's** `### Coverage` and
`### Checkability` tables — not every round ever written. If either table
there named a partial or missing item — a `DROPPED`/`REVERSED` row, a `NONE`
row — that this round's own fresh checks did not independently re-surface as
one of this round's findings, it does not simply go unmentioned. State one of
two things, for that exact item: **closed**, naming the requirement or
acceptance text that now carries it; or **still open**, filed as a finding in
this round like any other requirement-level finding.

This is reconciliation, not trust — the fresh, independent review above still
runs in full regardless of what the last round's tables said. This step only
catches the case where a fresh pass, run as if for the first time, happens
not to notice something a previous round had already named. A prior round's
named gap may never simply disappear from the record without an explicit
closing statement.

### Caps

| Severity | Rounds | Meaning |
|---|---|---|
| Critical — breaks the deliverable, contract violation, evidence missing | 4 | continuation counts against the same 4 |
| Moderate | 2 | continuation counts against the same 2 |
| Minor | no limit | judgment call; document the decision either way |

**Something no round can fix** — a decision only a named human can make *and
that human cannot be reached at all*, a credential you do not have, access you
do not have — stops immediately and consumes no round.

That predicate is narrow. A finding needing the requester's answer is **not** it:
`relay-refining` reaches requesters, and that is the ordinary case. Under test a
reviewer read fourteen ordinary requirement-level findings as "needs a human
decision" and stopped the chain on all of them, consuming no round for any. Read
that way the predicate swallows every review this stage will ever write.

### When a cap is reached

Not a further rejection. All four of:

1. **The verdict becomes `rejected — round cap reached`**, and the capped
   finding is *not* routed to `relay-refining` again. The cap exists to end that
   loop; a fifth identical rejection is the failure the cap prevents.
2. **A `### Capped` section** in the review file naming: the finding, its root
   cause in one sentence, the rounds it consumed with their dates, and **who has
   to decide it — a person or a role, never a stage.** With no name, name the role.
3. **The open question travels in the handoff message**, which the requester can
   forward, and condensed in the journal section. No new file.
4. **The journal section says the cap was reached**, on which finding, and that
   the chain stops there — the relay's last stage reviews the process with the
   journal as its only source, and a loop that ran four times is the most
   valuable thing in it.

**The verdict is one value; routing is per finding.** A cap changes where the
capped finding goes, and nothing else. Every other requirement-level finding in
the same round still goes to `relay-refining` as usual, and the remaining checks
still run. Say both destinations, in the review file and in the handoff, or a
reader is left holding nine findings with nowhere to take them.

And **never downgrade a capped finding to make the cap go away** — no critical
reclassified as moderate, no merging it into another, no approving "with the
finding noted".

## The Verdict Names What Carries It

A round can produce sixteen findings and hang on three. Written at the same
length in the same shape, those three are invisible, and a report that has to be
mined for its own conclusion gets skimmed — which costs the same as not writing
it.

Two mechanisms, locked to each other:

1. **`### Verdict` names the ids it rests on.** The findings that would have to
   be closed for the verdict to come out differently — their ids, not a summary
   of them, on the `carried by:` line. Naming every finding there is the same as
   naming none. An approval writes `carried by: none` in as many words.
2. **A finding not named there may use the short form.** Id, severity,
   classification with its one sentence of why, and one sentence of what is
   wrong with the quote that shows it. Nothing else. The rest of the
   apparatus — what a reader is left to guess, the round a continuation started
   in, the question as you would put it — belongs to the findings the verdict
   rests on.

**The lock is keyed to the verdict list, not to severity.** You cannot buy
yourself less writing by calling a finding minor: the `carried by` line is
written first, and a finding on it never qualifies for the short form whatever
its severity. A `minor` finding the verdict rests on is written in full.

**This is not a summary covering several findings.** That remains forbidden, and
so does a finding with no classification. Every finding keeps its own id, its
own severity, its own classification with its own sentence, and its own quote.
What shrinks is the apparatus around the findings that are not deciding
anything — never the number of findings, and never what any one of them is
identified as.

Two ways this goes wrong, both worse than the length problem it fixes. Moving a
finding off the `carried by` line so it can be written shorter is downgrading
the verdict quietly, and it is the same act as the forbidden second verdict.
Putting a finding on it that would change nothing is padding the line until it
carries no information, which is the state this section exists to leave.

## Write `03-spec-review.md`

Append-only across rounds: one `## Round <n>` section per round, newest last,
and never edit a section written by an earlier round. A prior round's wording is
the evidence for the continuation test.

**Enforced, not just stated.** Read the file's current full content before
writing this round's section. Your edit must be a pure addition — every byte
already in the file must still be there, unchanged, afterward. Never use a
full-file overwrite tool for this file; use an append-style edit.

Every heading is **required**, in this order.

```markdown
# Spec review — <request-id>-<slug>

## Round <n> — <date> — <verdict>

### Verdict
<Exactly one of these three, written out:
  `approved` — successor `relay-planning`
  `rejected — routed to relay-refining`
  `rejected — round cap reached` — escalated to <person or role>
Then one sentence saying what makes it that one. No second verdict, no partial
go-ahead, no praise. Then, on its own line, `carried by: <ids>` — the findings
this verdict rests on, or `carried by: none` for an approval. See *The Verdict
Names What Carries It*.>

### Coverage
<One row per item in the intake's `## In scope`, `## Constraints`,
`## Success criteria`, `## Out of scope`, `## Decisions delegated to me`. Each
row: the item in a few words, and the requirement or acceptance entry carrying it,
or DROPPED, or REVERSED — <where the spec excludes it>. Then: any requirement with
neither an intake item nor a decisions row behind it.>

### Checkability
<One row per requirement in `## Behaviour`: the acceptance entry covering it, or
NONE.>

### Checks run
<One line each for hedge words, cascade shape, internal consistency, scope purity,
confirmation, and architecture/constraints scope leakage — what was checked and
what it found. A check that found nothing says so in as many words.>

### Findings
<Each finding: an id; severity (critical / moderate / minor); classification
(requirement-level / layer-level) with one sentence of why; what is wrong, quoting
the spec; and what a reader of the spec is left to guess. For a continuation, the
round it started in. For anything only the requester can answer, the question as
you would put it. A finding not named in `carried by` may instead use the short
form — see *The Verdict Names What Carries It*. A requirement-level finding that
is an acceptance-coverage-only gap is marked as such, and every one found this
round is listed together — see *Batching Acceptance-Coverage Gaps*.>

### Capped
<Only in a `rejected — round cap reached` verdict. Omit the heading otherwise.>
```

## Approving Is Also a Reviewed Artifact

An approval is written, not withheld. Same file, same round section, the same
coverage and checkability tables, the same *Checks run* lines — with `approved`
as the verdict and `relay-planning` as the successor. Silence is not an approval
and neither is "no findings"; a later stage has to be able to read what was
checked.

And it is a real approval. **Do not manufacture a finding so the review looks
like work.** A check that found nothing is recorded as having found nothing, and
that is the whole of it. Three things that are not findings: a requirement you
would have worded differently, where the delete-the-word test comes back clean; a
question the intake never raised and the requester never asked for; a capability
you think would be an improvement.

A spec that answers everything the intake confirmed, checkably and without
contradicting itself, is finished. Its author's style is not yours to review.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage or round.
**Enforced, not just stated:** read the file's current full content before
writing. Your edit must be a pure addition — every byte already in the file
must still be there, unchanged, afterward. Never use a full-file overwrite
tool for this file; use an append-style edit.

```markdown
## <date> — relay-reviewing-spec
<2-4 sentences of prose: the verdict and what decided it, which findings are
continuations and from which round, anything that hit a cap and who it went to,
and any pressure the review ran under that a later reader would want to know
about.>
```

Prose, not a ledger line. The relay's last stage reviews the process with the
journal as its only source, and this stage is where a loop becomes visible.

## Hand Off

End with exactly this shape: (1) a **status line** — the review is written, its
verdict, and its exact file path; (2) the **successor**, named — `relay-planning`
after an approval, `relay-refining` after a rejection routed back, and after a
capped verdict both the person or role the capped finding went to *and*
`relay-refining` for every finding that was not capped; (3) **one question**
offering three ways forward — continue with the successor / go to a different
step instead / stop here.

Never invoke the successor yourself. Never write the fix while you wait.

## Rationalization Table

Every excuse in the left column was produced by an agent under test.

| Excuse | Reality |
|---|---|
| "Most of the spec is genuinely good — the findings are concentrated in two requirements." | You checked the requirements that are there. Nothing in that sentence reaches the requirement that is not there. |
| "`## Boundaries` correctly carries the read-only rule and the email-only rule forward from the intake." | It also carried forward a bullet excluding an item the requester confirmed as in scope. Reading a section for what it got right is not the coverage check. |
| "Sources read: the spec, plus the intake and the journal as ground truth for what was confirmed and by whom." | That is the intake used to judge what is in the spec. Run in that direction it can never find an absence. Enumerate the intake and go looking. |
| "The requester has already read the spec end to end and is happy with it." | Someone who confirmed the intake reads the spec for agreement with it. A requirement quietly reversed against them is the precise blind spot of that reading. Their approval is evidence they missed it. |
| "The author has looked at that rule four times and each time found it correct as written." | Four readings cannot supply a decision nobody took. The check is not whether the sentence reads well; it is whether the required final step is there. |
| "We genuinely don't have another round in the schedule." | Then the cheapest item in the schedule is the question list, which takes minutes. The round you are avoiding gets paid later with an implementation attached to it. |
| "Don't send it back over wording — last time that cost two days for no behavioural change." | Fair, and the delete-the-word test tells you which is which. Send back only the hedges whose deletion exposes something undecided, and say that is what you did. |
| "These don't go back to `relay-refining` as edit instructions, because that stage has already declined them three times for the correct reason." | A finding routed there is a question it asks, not an edit it applies. Three declines mean the question never reached the requester — which is the thing that stage does. |
| "I split the findings by who can close them instead of sending them back." | Who can answer a finding is worth saying, inside the finding. It is not the classification and it is not a second destination. |
| "The findings that need nobody are the layer-level ones." | The axis is which document is wrong. A hedge word, a missing acceptance criterion and a dropped requirement are defects in the spec whoever can fix them. |
| "Fourteen findings need a human decision, so the policy says immediate stop, no round consumed." | That predicate is for what no round could close. A finding needing the requester's answer is the ordinary case; read that way the predicate stops every review ever written. |
| "Rejected — but planning isn't blocked on the two clean requirements, that slot isn't lost." | Two verdicts. The reader acts on the permissive one, and the plan comes back derived from a spec you rejected. |
| "A fifth identical rejection would just repeat the mistake, so I routed it differently." | Right about the fifth rejection, wrong about the remedy. That is what the round cap is for, and it ends with a named human, not a destination you invented. |
| "Sixteen findings, all of them real, all written up to the same standard." | Real is the bar for including a finding, not for how much of the report it gets. Three of them decide the verdict; say which three on the `carried by` line and let the other thirteen be short. |
| "Calling those four minor lets me write them up briefly." | Severity is not what unlocks the short form — the `carried by` line is, and it is written before you get to choose. Downgrading a finding to write less is downgrading the verdict quietly. |
| "I'll note it as something worth a sentence when the spec is next touched." | Nobody touches a spec on the strength of a note. Either it is a finding this round or it is not a finding. |
| "I'll draft the five questions as a message you can send straight to the requester." | That is the next stage's work. Put the questions in your findings; writing the requester's message is where a review starts deciding. |
| "There's no acceptance criterion for that one, but what it means is obvious." | Obvious to you, today, with the intake open. `## Acceptance` exists so the requester can check it with you not in the room. |

## Red Flags

Each of these means you are mid-violation, not about to be.

- "Most of the spec is fine." / "The findings are concentrated in two places."
- "I read the intake for what was confirmed." (one direction only)
- "`## Boundaries` carries the intake forward correctly."
- "They've already approved it." / "The author has been over it four times."
- "There's no room for another round." / "Planning starts today."
- "This one can't be fixed at refining, so it goes elsewhere."
- "All findings are requirement-level." (as one line, with no per-finding reason)
- "These are the layer-level ones — they don't need the requester."
- "Rejected, but this part isn't blocked."
- "I'll flag it as something to watch." / "might want to" / "nice to have"
- Writing a corrected requirement, anywhere.
- Reaching the verdict without a coverage row for every intake item.
- Adding a finding because the review looked short.
- "They're all findings, so they all get the same write-up." (with a verdict that
  hangs on three of them)
- Reclassifying a finding, or leaving it off `carried by`, so it can be written
  shorter.
- A `carried by` line naming every finding in the round.
- A prior round's Coverage or Checkability gap just isn't mentioned this round.
- One acceptance-coverage gap fixed this round, the rest left for "next time".
- Overwriting `03-spec-review.md` or `00-journal.md` instead of appending to it.

## Worked Example

A spec for a weekly digest of stale support tickets: five confirmed in-scope
items, three constraints, three success criteria. Review requested at 13:30 with
a 16:00 planning kickoff, three people waiting, the requester reported as having
approved it in chat, and *"please don't send it back over wording."*

**What failed under test (do not do this).** Two reviewers under that pressure
wrote long, genuinely sharp reviews — and both used the intake only to judge the
requirements in front of them. Neither noticed that a confirmed in-scope item
("the requester receives a copy of every digest") had no requirement at all, or
that `## Boundaries` now said *"nobody outside the set of team leads receives a
digest"*, reversing it. One praised that section in the same review. Neither ran
the scope-purity check or named a successor.

**What this skill does instead.** Check 1 first, mechanically, one row per intake
item:

| Intake item | Carried by |
|---|---|
| digest per lead, own queue only | R-1 |
| overdue = 5+ working days, no reply | R-2 |
| empty queue still gets a message | R-6 |
| requester gets a copy of every digest | REVERSED — Boundaries |
| lead can move their digest to another day | R-9 |
| working days exclude the holiday calendar | R-3 |
| must not depend on the requester's account | DROPPED |
| mail readable on a phone | R-4 |

Two rows out of eight, found in the time it took to write them, and one of them
is the constraint the intake calls the whole point of asking. Both
requirement-level: the defect is in the spec. Both to `relay-refining`, the
second as a question — *"you asked for this to keep working while you are away;
the spec has no requirement for it and one requirement works against it. What
has to be true?"* Then checks 2 through 8, each producing its line. The verdict
is one value:

> Round 1 — 2026-08-28 — rejected — routed to `relay-refining`
> carried by: F-1, F-4

The round produced eleven findings. Two of them decide it: the dropped
constraint and the reversed in-scope item. The other nine are real, classified,
quoted — and written in the short form, because closing any of them would not
have changed the verdict.

Not "rejected, but R-2 and R-3 are clean, so the 16:00 slot is not lost". Clean
requirements are clean; they are not a partial approval, and a plan derived from
a rejected spec comes back as rework whichever half it started from. Handed off:

> Review written to `docs/relay/2026-08-24-overdue-digest/03-spec-review.md`.
> Rejected: two confirmed items dropped or reversed, one cascade with no end
> state, a confirmation naming someone who gave none of the answers. All
> requirement-level, all routed to `relay-refining`, four of them questions only
> the requester can answer. Next step would be `relay-refining`, which settles
> them and rewrites the spec. Continue there, go to a different step, or stop
> here?
