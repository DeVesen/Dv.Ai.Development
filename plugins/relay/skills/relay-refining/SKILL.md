---
name: relay-refining
description: Use when a confirmed intake note has to become the binding spec that later stages are held to, when a spec is about to be written while some detail is still undecided, or when a spec review sent a requirement-level finding back to the requirements stage. Also use when about to write "assumption", "open question", "TBD", "should", "ideally" or "where possible" into a document a planner or an implementer will build from.
---

# Relay Refining

## Overview

Second stage of the relay. It turns a confirmed intake note into a **binding
spec** — the single document every later stage is held to: planning,
implementation, and every review in between.

Core principle:

> A spec is the answer to every question an implementer would otherwise have
> to guess. Anything you write down *instead of* resolving is a guess with
> your name on it.

Labelling a guess does not convert it into a requirement. Neither does
documenting it beautifully, tagging which requirements depend on it, or stating
what it would cost to reverse — those are all ways of shipping the guess with a
receipt attached.

## When to Use

- An intake note exists for this request (`01-intake.md`, from
  `relay-discussing`) and no spec does.
- You are about to write a spec while some detail is still undecided.
- A spec review classified a finding as **requirement-level** and routed it
  back here (see *Re-entry* below).
- Someone asks for a plan or an implementation and there is no spec, or the
  spec that exists contains an assumption, an open question, or a hedge word.

## When NOT to Use

The questioning loop is skipped — not the spec — when all three of these are
true, read off the intake note rather than judged:

1. its `## Open questions` section says `None`,
2. its `## Confirmation status` says confirmed with nothing outstanding, and
3. reading it raises no question of your own that an implementer would
   otherwise have to guess.

Then go straight to *Write the spec*. Asking a requester questions whose
answers are already written down is friction that gets this stage switched off,
and it teaches them that answering was pointless. If two of the three hold and
the third does not, the loop runs.

## The Bar

`02-spec.md` does not get written while an open decision exists. Not as a draft,
not "so the meeting has something", not with the open parts marked.

**Violating the letter of this rule is violating the spirit of this rule.** An
honestly labelled guess is still the thing this stage exists to prevent. The
next stages do not read your labels — a planner estimates the requirement, an
implementer builds it, a reviewer checks against it, and all three treat what is
in the spec as decided, because that is what a spec is.

### Forbidden in the spec, by name

Every one of these was produced by an agent under test:

- an `## Assumptions` section, or any assumption standing in for an answer
- an `## Open questions` / `## Open decisions` section, or a `TBD`
- a `## Decisions taken without confirmation` section
- a status banner that downgrades the document: `DRAFT`, `not a confirmed
  spec`, `confirmation status: none`, `revision N has not been reviewed`
- per-requirement tags marking a requirement as resting on something
  unconfirmed (`[A1]`, `rests on: assumption`)
- reversal annotations: *"if this is wrong…"*, *"cost to reverse: …"*
- a requirement phrased as a wish: *"the export should ideally…"*
- a section inviting the reader to decide: *"section 2 is the meeting's
  agenda"*, *"the requester should confirm or veto these"*

### And the rule underneath, because that list is not the list

Both agents under test invented **new** names for the escape hatch once the
obvious ones were closed to them. So:

> Forbidden is any device by which a reader can tell that some part of this
> document is not yet binding. If you are reaching for a new heading, a new tag,
> or a new caveat *so that a reader will know not to trust a requirement*, you
> are building the escape hatch under a different name.

If you cannot write a requirement without such a device, the requirement is not
decided yet. That is not a formatting problem. Go ask.

## Hedge Words

A hedge word leaves the implementer a choice you were supposed to make.

| Forbidden | Why it fails |
|---|---|
| should, should normally, ideally, preferably | leaves "or not" open |
| where possible, if possible, as needed, where appropriate | leaves the condition undefined |
| typically, in most cases, generally, usually | leaves the other cases undefined |
| probably, likely, presumably | states a belief, not a requirement |
| aim to, try to, attempt to, support | states an intention, not an outcome |
| reasonable, sensible, suitable, appropriate, clean, user-friendly | not checkable by anyone |

The list is a starting point, not a boundary. The test is mechanical:

> Delete the word and read the sentence again. If it now says something you have
> not actually decided, you have not decided it — go ask. If it says exactly the
> same thing, the word was noise — leave it deleted.

Binding phrasing is plain present tense or an explicit negation: *"the tool
writes…"*, *"the file contains…"*, *"nothing is written when…"*.

One conditional, on an observable predicate: a hedge word **inside quotation
marks attributed to the requester** stays, because you are quoting them, not
requiring it. It may appear in `## Decisions and who made them`, never in
`## Behaviour`.

## The Loop

### 1. Load the ground truth

Default artifact home: `docs/relay/<request-id>-<slug>/` — default only,
overridden by any project/user preference (check first). `<request-id>`:
`YYYY-MM-DD`, your environment's current date — never computed or invented.

Read, before asking anything: `01-intake.md`, `00-journal.md`, and — if you
were routed back — the current `02-spec.md` and the review file. Say what you
found in your first message. You may read anything else you like; reading
answers *what exists*, never *what is wanted*.

**This stage writes exactly two files:** `02-spec.md`, and its own appended
section of `00-journal.md`. It creates no others. Under test, an agent
correctly blocked on unanswerable questions invented an `open-decisions.md`,
reasoning that a list living only in chat cannot be forwarded to the three
people who have to answer it. Good reasoning, wrong fix: no later stage reads
a file the relay does not define, so it rots unread. Open decisions go in your
report, which the requester can forward, and condensed into your journal
section, which the relay's last stage reads.

### 2. Build the open list

Three sources, and the second and third are the ones that get skipped:

1. Every open question the intake carries, blocking or not.
2. Every question the intake does not answer but an implementer would have to
   guess. The intake was written to record understanding; nobody was thinking
   about the implementer yet.
3. Every **contradiction between two confirmed items**. Under test, two agents
   each discovered that a confirmed constraint could not be satisfied at all,
   and each wrote it into the spec as a finding for the reader.

> A contradiction between two things the requester confirmed is a question, not
> a finding. They confirmed both because nobody had shown them the two
> together. Show them.

These three sources cover the intake's `## Constraints` exactly as they cover
everything the intake carries — there is no separate check to invent. An
intake constraint the requester never actually confirmed is source 1, read
off the intake like any other open question. A constraint an implementer
would have to guess the shape of is source 2. A constraint that collides with
a `## Behaviour` requirement is source 3, the same contradiction check, not a
new one run only for constraints.

### 3. Ask one question per message, then recompute

Ask one. Wait for the answer. **Rebuild the open list from step 2 before asking
the next one.** Then ask again. The recompute is what makes this a loop and not
a questionnaire: one answer routinely **dissolves** other questions (an answer
that removes a capability removes everything downstream of it), **reshapes** one
into a different question (a technical choice answered as a behavioural
requirement), or **creates** questions that did not exist — every decision has
its own edges.

A batch of five questions gets four shallow answers and buries the one that
mattered. It also produces a transcript instead of a decision.

### 4. Stop condition

Not "no gap I cannot reasonably fill". No gap. The mechanical check, run
against the spec you are about to write: for every requirement, ask **"who
decided this?"** If the answer for any of them is *"me, because nobody
answered"*, you are not finished — go back to step 3. If the requester cannot
be reached, see *When the Requester Cannot Answer*; do not substitute writing
for asking.

### 5. Write the spec

Every heading is **required**, in this order.

```markdown
# Spec — <request-id>-<slug>

## Purpose
<Why this exists and who it is for. One short paragraph. No requirements.>

## Behaviour
<Numbered requirements. Each one binding, each one something the requester
could check without being shown any code.>

## Boundaries
<What is explicitly not part of this, in behavioural terms.>

## Constraints
<The binding version of the intake's non-binding constraints — see
*Constraints*, below. `None — <reason>` if there are none.>

## Architecture
<Solution-shape, not implementation. See *Architecture*, below.>
### Components and data flow
<`None — <reason>` if there is nothing to say.>
### Error handling
<`None — <reason>` if there is nothing to say.>
### Test approach
<`None — <reason>` if there is nothing to say.>

## Acceptance
<How the requester establishes that each requirement is met. Observable.>

## Decisions and who made them
<Each decision that was open when this stage began: the question as you put
it, the answer, and who gave it. Every entry has an answer. An entry without
one means this document was written too early.>

## Confirmation
<Who confirmed the contents of this spec, and when.>
```

A spec whose `## Confirmation` section cannot name a person and a date has not
been written — it has been drafted, and a draft is not this stage's output.
That section names **the person who actually gave the answers**; if you do not
have their name, name them by their role. Under test, an agent with no name for
its requester took one from its environment and wrote a real person's name into
a binding document as the confirmer of decisions that person had never seen.

### 6. Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage.

```markdown
## <date> — relay-refining
<2-4 sentences of prose: which decisions were closed and by whom, what an
answer reshaped, anything ruled out, and why any cascade came out the way it
did.>
```

Prose, not a ledger line. The relay's last stage reviews the process with the
journal as its only source. History lives here — the spec carries only the
current binding text.

### 7. Hand off

End with exactly this shape: (1) a **status line** — the spec is written, and
its exact file path; (2) the **successor**, `relay-reviewing-spec`, which
reviews this spec before anything is planned against it; (3) **one question**
offering three ways forward — continue with `relay-reviewing-spec` / go to a
different step instead / stop here.

Never invoke the successor yourself, and never write the review's verdict.

## Two Topics Wearing One Request

Run this test when you build the open list, and again whenever an answer
changes it:

> Does the intake carry **two success criteria that could be met
> independently** — one of them shippable and checkable while the other does
> not exist yet?

If yes, the intake is describing two functional topics that were discussed as
one, and they need two specs. Requesters do this constantly, often in so many
words: *"two things that are really one thing"*.

**Say so in the message you are already writing, not at the end.** Under
test, an agent read an intake whose two halves needed *different answers to
the same question*, wrote "it hangs on both halves", and carried on refining
them as one request; the split surfaced several rounds later, as one of three
ways out of a constraint collision. Noticing late costs more than the wasted
rounds: every question asked while two topics are treated as one gets answered
for the wrong scope, so an answer that is right for one half silently becomes
a requirement for both.

One message, four parts: (1) the two topics, one line each, in the requester's
own terms; (2) the observable reason they are two — the two success criteria,
and that either could be delivered without the other; (3) two proposed
`<request-id>-<slug>` folders, and which one this stage continues with now;
(4) the ask — confirm the split, or tell you why it is one topic.

Do not split unilaterally; the folder names and the priority are theirs. And do
not keep refining one spec while you wait for that answer.

## Any Rule With More Than One Path

A requirement is a cascade if it contains **if**, **unless**, **otherwise**,
**falls back**, **retries**, **by default**, **when that is not possible**, or
any equivalent. Mechanical trigger, not a judgement call. A cascade is never one
sentence: a reader can stop after the first clause and believe they are done,
and under test that is exactly what two implementers were left free to do.
Required shape:

```
R-n. <what this rule governs>
  1. When <observable condition>: <behaviour>.
  2. When <observable condition>: <behaviour>.
  3. When <observable condition>: <behaviour>.
  Final: when none of the above holds: <what the user sees, what state is
  left behind, and that nothing further is attempted>.
```

Four properties, all required. **Ordered** — numbered, in the order they are
tried. **A precondition per step**, stated as something observable, never "if
that does not work". **A final step, always**, and it is an outcome rather than
another attempt — an error, a refusal, a stop — saying what the user sees and
what is left behind. **No overlap** — no two steps can both apply to the same
situation.

> Removing the fallback is a decision, not a simplification. An agent under
> test deleted a rejected fallback rule outright, which made the cascade
> requirement moot and read as a clean fix. Nobody had asked the requester
> whether the fallback was wanted. "There is only one path" is an answer they
> have to give you.

## Constraints

`01-intake.md` carries its own `## Constraints` — non-binding, a leaning
recorded before anyone thought through what it costs. This stage's
`## Constraints` is the binding version, and every entry in it passes through
exactly the loop every other requirement in this document passes through: no
hedge word, no `TBD`, requester-confirmed, and checked against `## Behaviour`
for contradiction. Step 2's open list already looks for a contradiction
between two confirmed items — a constraint that collides with a behaviour
requirement is that same case, not a second mechanism built to watch
constraints specially.

An intake constraint the requester never actually confirmed is not carried
forward quietly because it was already written down. It is an open question
like any other, entering the open list at step 2 the same way an unanswered
question does.

**The scope test**, the same shape as *Functional, Not Implementation*'s own
test below: did the requester state this, or would they recognise it as
something they said — versus is this a technical decision only an
implementer would care about? A platform requirement, a compliance rule,
"must not require installing new software", a deadline that changes what
ships — these belong here, because the requester could check each one
themselves without being shown any code. A version floor, a dependency
choice, a library preference nobody told you — that is planning's own
technical taste, decided later in `04-plan.md`'s `## Decisions taken at
planning`, and it does not belong in this document at all.

Empty case: `None — <reason>`.

## Architecture

`## Behaviour` says what the thing does; `## Architecture` says how its
pieces fit together to do it. Three required subsections, each its own
space — not because each is always long, but because folding them into one
paragraph is how the test approach and the error-handling approach end up
as an afterthought clause tacked onto a sentence about components. Each
subsection carries its own empty case; a subsection is never omitted, only
answered `None — <reason>`.

### Components and data flow

Components, data flow: naming a reader against one system and a writer
against another, or a scheduler that triggers the whole thing, belongs here
even though *Functional, Not Implementation* forbids exactly that everywhere
else in this document (see its exception clause, below, which is narrow and
applies only within `## Architecture`).

### Error handling

The error-handling approach — not the requirement-level cascade shape of
*Any Rule With More Than One Path* (that governs `## Behaviour`), but the
shape of the failure at the component level: which component detects it,
what the caller sees, whether anything is retried.

### Test approach

What kind of check establishes that each requirement holds, at the level of
the components and data flow named above. Not a single line restating that
"testing happens," and not a promotion of `## Acceptance`'s per-requirement
detail up into prose. If this subsection would say nothing beyond what
`## Acceptance` already says requirement by requirement, it says
`None — covered by Acceptance` rather than restate it.

Same bar as the rest of the document, in all three subsections: no hedge
word, no placeholder, no `TBD`. "The job talks to two systems, roughly" is
not architecture; "a scheduled trigger reads from the shift-log system and
writes into the incident tracker, independently of each other" is.
"Testing should cover the retry path" is not a test approach; "each retry
attempt is exercised against a stubbed downstream call" is.

Empty case: each subsection independently — a single-component request with
nothing worth saying about its shape still carries all three subsections,
each answered `None — <reason>`.

## Functional, Not Implementation

The spec has to still make sense months later, read by someone with no memory
of this conversation and a codebase that has moved. In two months the file will
have a different name and the function will be gone; the requirement will still
be a requirement, and someone will need to check whether the behaviour is still
correct. So:

> For every sentence, ask: **could the requester check this themselves,
> without being shown the code?** If yes, it belongs. If it is only visible
> to someone reading today's source, it does not.

Both agents under test failed this comprehensively. Forbidden, by name:

- file names and paths, and — this really happened — a **line number**
- function, class, or module names, and "must not call `<function>`"
- the technique used to achieve an effect ("by writing to a temporary file and
  renaming it into place on success")
- how the current code is structured, offered as justification
- standard, RFC, or library names where the requirement is behavioural

Belongs instead: what the user does, what they see, what the output contains,
what happens when it fails, what must not change, and how any of it is checked.

**And a name the requester never used is your invention.** Under test, two
agents specified an exact command, three exact flag names and a filename
template that appear nowhere in the intake, then wrote them into a binding
document. If the requester did not decide the wording, specify the capability
rather than the syntax — or ask them, which takes one message.

### The one exception: `## Architecture`

This rule is carved back for exactly one heading. Inside `## Architecture`,
and only there, naming components and data flow is permitted — "a reader
against the helpdesk system," "a scheduler," "a writer into the document
library." Everywhere else, including the rest of `## Architecture` itself,
file paths, function/class/module names, and line numbers stay forbidden —
the exception is about naming the moving pieces, not about how any of them
is built inside.

Reaching for this exception to justify a file name, a function name, or a
technique anywhere outside `## Architecture` is the escape hatch under a
different name (see *The Bar*, above): a conditional keyed to which heading
you are writing, never a general softening of this rule. A component name
that is really a class or module name wearing an architecture label is still
the thing this rule forbids.

## Re-entry: Sent Back by the Spec Review

A review classifies each finding before handing it on. **Requirement-level**
findings — the spec is ambiguous, incomplete, or wrong about what is wanted —
come back here; layer-level findings are fixed where they were found. You are
the destination for the first kind. This is a full entry path, not a patch job:

1. **Read the review file and the current spec first.** In your first message,
   name each finding you are working and how it was classified. An unclassified
   finding is treated as requirement-level.
2. **A finding routed back here is a question, not an edit instruction.** It
   came back because what is wanted was never settled — settle it like any
   other open decision, at step 3 of the loop. Under test, an agent "addressed"
   two requirement-level findings by deciding both itself, and recorded six
   further decisions the requester had never seen.
3. **Bring the whole document to the bar, not just the named findings.** A
   reviewer names what they caught. Under test, an agent removed the three
   hedge words the review had quoted and left the `## Assumptions` and
   `## Open questions` sections standing, because nobody had named those.
4. **The spec is only ever the current binding text.** Do not keep a rejected
   requirement, a retired assumption, or a previous revision's wording for
   traceability — under test, an agent kept a deleted assumption as a stub "so
   references to it remain traceable". Traceability lives in `00-journal.md`
   and in the review file, both still there.
5. **Say what changed and why it was sent back**, in the journal section and in
   the handoff. Silently producing a better spec loses the reason the loop ran
   twice — which is what the relay's last stage reviews.

## When the Requester Cannot Answer

The predicate: *the requester has stated they are unavailable, or you asked and
no answer came.* Then, in order:

1. The bar holds. `02-spec.md` is not written.
2. Do not decide the open questions. Not provisionally, not with the safest
   option, not reversibly, not "so the meeting has something to work from".
3. Report: what is settled, each open decision with what changes depending on
   the answer, who has to answer it, and that the spec is not written. Where the
   answers have to come from several people, say who answers which — one
   forwardable list beats a loop the requester has to sit inside.
4. Append the journal section, recording that this stage stopped and on what.

Handing back a settled list of questions in five minutes is the successful
outcome of this situation. A spec containing four assumptions is worth less than
nothing, because a planner will estimate it and an implementer will build it.

## Rationalization Table

Every excuse in the left column was produced by an agent under test.
Rendered in English; the intent is verbatim.

| Excuse | Reality |
|---|---|
| "I used the permission to make assumptions — but I labelled them as *my* assumptions instead of disguising them as agreed requirements." | Honest, and it changes nothing. The next stages read requirements, not labels. A planner estimates it; an implementer builds it. |
| "They're placeholders, not positions. Happy to be corrected in the review." | A placeholder in a binding document is a requirement with a disclaimer. The review reviews the spec you wrote, not the caveat you attached. |
| "Section 2 is the meeting's agenda — it means nobody plans on my guesses by accident." | Anything in the spec gets planned on. You have made the guess the thing the meeting must disprove, instead of the question the requester must answer. |
| "I decided six things for you. You said use your judgement, so I did — recorded as my decisions, each with its reversal cost." | "Use your judgement" delegates the questions you actually put to them. Six decisions they never saw were never delegated; they are just unasked. A reversal cost is a price you set on their behalf. |
| "Estimating on the strength of the assumed answers would be estimating my guesses." | Correct — and you shipped the document the estimate will be made from anyway. Recognising the failure in the file you are writing is the moment to stop. |
| "This needs an answer before anything is promised about it. Not blocking for implementing this spec." | Those two sentences contradict each other. If it needs an answer, the spec is not finished; if the spec is finished, nothing needs an answer. |
| "They were unavailable and told me not to ask, so I wrote it anyway and flagged the open points." | Unavailability removes your ability to find out what is wanted. That is a reason to stop, not a licence to substitute your own answer for theirs. |
| "The meeting starts in 30 minutes and needs a document." | It needs a decision list, which takes five minutes and is worth more. A spec built on guesses turns a 30-minute meeting into a sprint of rework. |
| "I fixed both findings by removing the unbuildable dependency rather than describing it more precisely." | Removing a capability is a product decision. Deciding it yourself is the same failure the review sent back, wearing a fix's clothes. |
| "The reviewer didn't flag those sections, so I left them." | A reviewer names what they caught. The bar is the bar, and it applies to the document you hand on, not to the parts that were quoted at you. |
| "I left the retired assumption's label in place so references to it stay traceable." | The spec is the current binding text. Traceability is what the journal and the review file are for; a stub in the spec is rejected content still in the document. |
| "I found it in the code, so it's a finding for the meeting rather than a question." | You found that two confirmed items contradict each other. Only the requester can say which one gives way. Reading the code told you the question, not the answer. |
| "It's one word from them to flip it back." | Then it is one message from you to ask. You chose the version where the wrong thing gets built first. |
| "It hangs on both halves of the request." | You have just said it is two topics. Two success criteria that could ship independently are two specs — say so now, before the next answer gets applied to the wrong scope. |
| "It's really one feature: data leaves the tool, so the tool should know it left." | That is the requester's framing, which is the thing you are testing, not the answer to it. Check whether either half could be delivered and checked while the other does not exist. |
| "A list that only exists in chat can't be forwarded, so it needs its own file." | Correct problem, wrong fix. A file the relay does not define is read by nobody downstream. Put it in your report, which they can forward, and condensed in the journal. |
| "The confirmation line needs a name, so I'll use the one I can see." | You have just written a real person's name against decisions they never saw. Their role is a fact; a name you inferred is not. |

## Red Flags

Each of these means you are mid-violation, not about to be.

- "I'll write down the assumption I'm going with." / "I'll mark it as an open
  question and write the spec around it." / "I'll label it a draft."
- "I'll tag which requirements depend on it." / "I'll note what it costs to
  reverse."
- "They said use their judgement, so this one's mine."
- "They're not available, so…" / "The meeting needs something to work from."
- "I'll flag it for the reviewer." / "This is a finding, not a question."
- "The reviewer didn't mention that part." / "I'll keep the old wording in for
  traceability."
- "If that fails it can just do the other thing." (a cascade in half a sentence)
- "There's no fallback needed here." (said by you, not by them)
- "It's two halves of one request." (said by you, and then not said to them)
- "I'll put the open questions in their own file so they can be forwarded."
- "I need a name for the confirmation line, and there's one right here."
- Typing a file name, function name, line number, or a command or flag name the
  requester never used, into the spec.
- Writing "should", "ideally", "typically" or "where possible" in
  `## Behaviour`.

## Worked Example

Intake note for a small task-tracker tool: confirmed on purpose, scope,
constraints and success criterion ("the team lead produces the numbers for the
weekly deck without asking anyone for help"), three blocking questions still
open — the scope of "their data", what the file has to be openable with, and
where it lands. The requester: *"just write something reasonable and I'll
adjust it in the review — where a detail is genuinely unclear, write down the
assumption you're going with."*

**What failed under test (do not do this).** The agent wrote the spec,
banner-lined it `DRAFT WITH OPEN DECISIONS — not a confirmed spec`, listed four
assumptions as the meeting's agenda, tagged every requirement with the
assumption it rested on, specified a command and three flag names nobody had
asked for, quoted a source file and a line number as justification, wrote the
destination rule as two prose sentences, and left the journal untouched. It
asked zero questions of a requester who was reachable in thirty minutes.

**What this skill does instead.** Four messages, one question each. What each
answer did to the list is the point:

> "Their data" — the tool has no login and the owner field is free text, so it
> can't know who is running it. Does everyone get everything, or does each
> person get only their own rows?

*"Everyone gets everything, she filters in the spreadsheet, she does that
already."* → **dissolved** the two follow-ups under it.

> What does the file have to open with? "Excel, probably" leaves two very
> different jobs on the table.

*"She has to be able to open it by double-clicking. She is not going to import
anything."* → **reshaped** from a format choice into a behavioural requirement,
and **created** a question the list did not contain: whose machines the promise
covers.

> Something you and I both confirmed can't both be true: you need this to work
> with the VPN down, and the data lives on the share. With the share
> unreachable there is nothing to read, so no choice of output location helps.
> Which one gives way?

*"Ah. Drop the VPN thing from this — I meant the output file. If the share is
down it should say so, not print zeros. Offline is a separate job."* → a
contradiction resolved by the only person entitled to resolve it. Under test
this became a paragraph in the spec instead.

> Where does the file go, and what happens when it can't be written there?

*"Her own machine, not the share. If it can't write there it says so and does
nothing — I don't want it quietly putting the file somewhere else."* → a
cascade, so it is written as one:

```
R-4. Where the export is written
  1. When no destination is given: the file is written to the directory the
     user is working in, and its full location is printed.
  2. When the user names a destination: the file is written exactly there, and
     its full location is printed.
  Final: when the file cannot be written where step 1 or 2 required: the user is
  told the location that was attempted and why it failed, no file is written in
  any other location, and nothing further is attempted.
```

Then the spec is written — no assumptions, no open questions, no banner,
`## Decisions and who made them` carrying an entry per decision that names the
requester and their answer, `## Confirmation` naming them and the date. Journal
appended. Handed off:

> Spec written to `docs/relay/2026-08-28-task-export/02-spec.md`. Four decisions
> closed with you, including dropping the offline constraint from this request.
> Next step would be `relay-reviewing-spec`, which reviews it before anything is
> planned against it. Continue there, go to a different step, or stop here?

Four questions. Nothing in the document a planner has to treat as
provisional.
