---
name: relay-planning
description: Use when an approved spec has to become the plan work is handed out from, when someone asks for a task breakdown, cards for a board, or "just get me something to hand out" because people are idle tomorrow, or when a plan review sent a layer-level finding back to planning. Also use when about to write "TBD", "add error handling", "similar to task N", or a task whose done-condition needs a value nobody has yet.
---

# Relay Planning

## Overview

Fourth stage of the relay. It turns an **approved** `02-spec.md` into `04-plan.md`
— an ordered decomposition into tasks, each of which one person implements alone
and a different person reviews before the next starts.

Core principle:

> Every implementer sees only their own task. So a question the plan does not
> answer is not deferred — it is delegated to whoever opens that card, silently,
> with nothing downstream able to catch the answer they invent.

That is why a plan may not carry an open question in any form. Not as a `TBD`, not
as a fact-finding task later tasks depend on, not as a value that "goes in
configuration", not as "the implementer proposes it at review". Each of those was
produced by an agent under test, and each ends with one person deciding alone.

## When to Use

- A spec exists for this request and `03-spec-review.md` says `approved`, and no
  plan does.
- Someone asks for a task breakdown, an estimate, cards for a board, or work to
  hand out tomorrow.
- A plan review classified a finding as **layer-level** and routed it back here
  (see *Re-entry* below).

## When NOT to Use

- **No spec, or a spec not cleared.** See *The Gate*. You are not the stage that
  fixes that.
- **Code is what is wanted.** That is `relay-plan-execution`, which also owns
  the choice of how the plan gets executed. Do not make that choice here.
- **A plan is what is being reviewed.** That is `relay-reviewing-plan`.

## The Gate

Before anything else, check whether this request has a relay history at all:
does `01-intake.md`, `02-spec.md`, `03-spec-review.md`, or `00-journal.md`
exist anywhere under this request's artifact home (default
`docs/relay/<request-id>-<slug>/`, or the project's configured location)?
Check by listing the directory — a claim that "this is standalone" is never
the check itself.

- **Any of those files exist** — the relay chain is in use for this request.
  Everything below in *The Gate* applies exactly as written, with no
  shortcut, regardless of which stage produced them or how far the chain got.
- **None of those files exist, and no such directory exists at all** — this
  is a fresh, standalone request. Skip the rest of *The Gate* and go to
  *Standalone Mode* below.

For a request already in the relay chain: `03-spec-review.md` must exist and
its **latest round** must say `approved`.

**Latest round** is the last `## Round <n>` section in the file — it is append-only
with the newest last. If file order and numbering disagree, the highest `<n>` wins,
and say in your first message that you found them disagreeing. An earlier round's
`approved` is not the latest verdict; a spec that was approved and then reopened is
not cleared, and under test that is exactly the shape a real chain produced.

| Latest verdict | What happens here |
|---|---|
| `approved` | Plan. |
| `rejected — routed to relay-refining` | No plan. Name `relay-refining` and stop. |
| `rejected — round cap reached` | No plan. Name the person or role that verdict escalated to, and stop. |
| No `03-spec-review.md` at all | No plan. Name `relay-reviewing-spec` and stop. |
| A file with no verdict you can read | Treat as not approved. Say what you found. |

### You are not the stage that is missing

Under test, two of three subjects that correctly refused to plan then **reviewed
the spec themselves and wrote `03-spec-review.md`** — a file this stage does not
own. A third offered to rewrite the spec. All three were trying to be useful, and
all three destroyed the thing the gate is for: an independent look at the spec by
a stage that has not already decided how to build it.

So, when the gate closes: do not review the spec, do not write or edit
`02-spec.md`, do not write `03-spec-review.md`, do not draft the questions for the
requester. Name the stage that has to run and stop. **This stage writes exactly
two files:** `04-plan.md` and its own appended section of `00-journal.md`.

### A second, independent gate

Even when the verdict above is `approved`, read `02-spec.md` for a `## Constraints`
heading before drawing a single task. This plan's own `## Global Constraints`
section (see *Write `04-plan.md`*) has nothing to copy verbatim without it, and
writing the constraints yourself here is planning deciding something that belongs
to the spec — the same failure *What Planning Decides, and What It Must Not*
already names, one section earlier than usual.

If the heading is missing: no plan is written. Name `relay-refining` — the section
belongs in `02-spec.md`, not here — and say plainly that the block is missing, not
merely thin. This gate is independent of the verdict gate above and checked
separately: an `approved` verdict does not excuse a missing `## Constraints`
section, and the reverse — the section present under a verdict that is not
`approved` — still blocks on the verdict gate first.

## Standalone Mode

Reached only when the existence check in *The Gate* found no relay artifacts
at all for this request. Nothing else in this skill changes: the Bar, the
forbidden list, *Structure Before Tasks*, task structure, the coverage
self-check and the `04-plan.md` template all apply exactly as written.
Standalone Mode replaces the file-reading and gating steps that assume a
relay chain already exists — it is a shorter gate, not a lighter Bar.

**No `02-spec.md` to read**, so the Behaviour/Acceptance surface the coverage
self-check needs does not exist yet. Write it yourself, as a new section of
the plan:

```markdown
## Requirements (standalone — self-derived, not independently reviewed)
<One `## Behaviour` list and one `## Acceptance` list, in the spec's own
shape — each behaviour a sentence describing what the system does, each
acceptance entry a checkable condition. Derived from the request as given
and from direct answers the requester gives, not invented past what was
actually said.>
```

**State this list back to the requester before drawing a single task**, and
wait for confirmation or correction. This is not paperwork: it is the only
check this list gets before the plan is built on it. The full relay chain
runs a separate agent, `relay-reviewing-spec`, against exactly this kind of
risk — an ambiguous, incomplete or contradictory requirement — before
planning ever starts. Standalone Mode has no one else checking this list;
skipping the confirmation step is not a faster standalone mode, it is a plan
built on zero requirement review instead of one fewer review than the full
chain.

**Mark the plan's provenance** at the very top of `04-plan.md`, above `## What
is being built`:

> **Standalone mode.** No relay chain preceded this plan. Requirements above
> are self-derived from the request and confirmed with the requester
> directly, not independently reviewed by `relay-reviewing-spec`.
> `relay-reviewing-plan` runs its standalone verdict path against this plan.

**No `## Constraints` heading to copy** for `## Global Constraints` — ask the
requester directly for any project-wide binding requirement (version floors,
naming rules, platform limits) before writing that section, and write "none
stated" if there genuinely are none. Never invent one to fill the section.

Everything from *Structure Before Tasks* onward runs exactly as in the full
chain: the file list first, task boundaries by the same test, every task's
four slots, code in steps resting only on facts actually read, the full
coverage self-check, the full self-check line for line. The forbidden list
and the rationalization table apply without exception.

**Hand off** with the same three-part shape as always; the successor is
`relay-reviewing-plan`, whose standalone verdict path is built for exactly
this plan.

## Load the Ground Truth First

This section assumes the relay chain applies. If Standalone Mode applies
instead, skip it — there is nothing on disk yet to read.

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

Read all of these from disk, and never assume live session memory of any earlier
stage: `03-spec-review.md` first (the gate), then `02-spec.md` (the subject),
`01-intake.md` (what was confirmed, in the requester's words), `00-journal.md`
(what earlier stages decided and why), and any existing `04-plan.md` and
`05-plan-review.md`. Say in your first message which you found and which are
missing. These files are the resume mechanism: after a context loss, re-reading
them from disk is what re-establishes state — there is no separate ledger.

Then read the code you are planning against, and read it before you draw a single
task. A plan whose file list was invented rather than observed is a guess about the
structure, and every task built on it inherits the guess.

## The Bar

**Violating the letter of these rules is violating the spirit of these rules.** A
plan that reads as complete, hands out cleanly, and contains one question nobody
answered has failed — and it fails invisibly, because the person who meets the
question is alone with it.

### Forbidden in the plan, by name

Every one of these was produced by an agent under test, or is the classic form of
one that was:

- `TBD`, `to be decided`, `implement later`, `to be confirmed before hand-out`.
- **"Add appropriate error handling" / "add validation"** without the actual
  handling written out — which case, what the user sees, what state is left.
- **"Write tests for the above"** with no test content: what is arranged, what is
  exercised, what is asserted.
- **"Same shape as Task N" / "similar to Task N — repeat it".** The implementer of
  that task never sees Task N. Repeat the content.
- A step that says *what* to do without showing *how*: "determine which field pair
  actually lines up in practice", "decide the matching rule and implement it".
- A reference to a type, function, method, field or file that **no task defines**.
- A **fact-finding task whose output later tasks need**, with those later tasks
  written as if the output were already known.
- **A value that "goes in configuration"** and is not in the plan. Configuration is
  a mechanism, not an answer.
- **"The implementer proposes it at review."** That is one person deciding and one
  person rubber-stamping.
- A task marked *blocked*, *parked*, *do not hand out*, or *needs input before this
  is handable*.
- An **estimate or timebox standing in for a decomposition** — "1 d (timebox)",
  "spike" — where the task is unspecified because the answer is unknown.

### And the rule underneath, because that list is not the list

Under test, no subject wrote `TBD`. Every one of them built the same hole out of
better materials. So the test is not the wording:

> Read each task as the only thing you can see. Could you finish it today, alone,
> with nothing but this card? If finishing it requires a value, a file, a sample, a
> decision or a name that is not on the card and not in a task you have already
> been handed, that task is a placeholder however it is phrased.

## What Planning Decides, and What It Must Not

The spec deliberately specifies capability over syntax — that is `relay-refining`
doing its job, not a gap. Deciding the syntax is yours. Deciding the capability is
not.

> **The test:** would two different answers change anything the requester can see
> or check? If yes, it is the spec's and not yours. If no, it is a technical
> decision belonging to planning — take it, and write it down.

Yours, and each one stated in `## Decisions taken at planning` with the spec anchor
that leaves it open: file layout and module boundaries; names of files, types,
functions, commands and flags; the order tasks run in; the exact wording of a
command line the spec described only as a capability; internal data shapes; where
a seam goes.

Not yours, whatever it costs to stop: what a user sees, what a message says
happened, what counts as an error, which of two situations is reported and which is
not, what is left behind when something fails, who receives what.

### The four ways an agent under test took a decision that was not its own

All four were labelled honestly, and the label changed nothing.

1. **Extending a rule the spec wrote as a closed cascade.** The spec's rule named
   the cases; the plan added one it did not — "when both sources fail at once, one
   message naming both", "an export older than a week counts as unavailable", "when
   the list cannot be delivered, the nearest analogue applies". One subject wrote
   that its own answer means the requester "learns nothing, which is the outcome
   she called the worst", and filed that as *worth asking*.
2. **Deciding which of two situations gets reported.** "A seat matching both an
   active and a departed record: not a mismatch." "Duplicates collapsed to one
   row." Both change what the requester reads.
3. **Setting an acceptance bar nobody agreed.** *"I had the task implement a
   defensible default and flagged one round of formatting rework as expected.
   That's me choosing a bar nobody agreed to."*
4. **Marking it reversible.** *"Reversible as config — confirm with her on
   return."* / *"recorded here so you can overrule any of them in one line."* The
   plan ships, the code gets built, and the overruling happens against working
   software.

## Facts You Can Read, Decisions Only a Person Can Make

Both feel like "something I do not know". They have opposite handling, and the
predicate is observable.

> **Is there a document, a file, a system or a sample that already contains the
> answer?**

**Yes — it is a fact.** Go and read it *now*, before you write the plan. Every
subject under test instead turned facts into the head of its own plan — sample
files nobody had, the entitling values on a named page, which host runs the
schedule, which runtime that host has. One then wrote two thousand lines of code in
a language it had picked itself, noting that if the host turned out different
"every code block has to be re-typed". If a fact is genuinely unreachable to you,
that is a one-line ask to a named person, answered before the plan is written — not
a task at the front of it.

**No — it is a decision, and it belongs to the spec.** See the next section.

## When a Requirement Turns Out Undecided

Decomposing a spec is the sharpest reading it ever gets, so this stage finds things
a review did not. Under test, all four subjects that wrote a plan found at least one
real requirement-level gap — and all four planned past it.

The finding is **requirement-level** when the spec itself is ambiguous, incomplete
or contradictory about what is wanted. Its destination is `relay-refining`, per the
relay's routing rule. Then:

1. **If any task would have to implement that requirement, the plan is not
   written.** Not partially, not with that part marked, not as "the ten tasks that
   are safe to hand out". Report the finding, name `relay-refining`, stop.
2. **The workarounds are the failure, by name.** A blocked task section. The
   question moved into configuration. A fact-finding task that "asks the question".
   The requirement implemented one way with the other way noted as rework. An
   `## Observations for the requirements stage` appendix under a finished plan.
3. **Do not write the corrected requirement**, and do not decide it "so the plan
   can be checked". You would be doing the thing the routing rule exists to
   prevent.

The open list travels in your report — which the requester can forward — and
condensed into your journal section. No new file for it.

## Structure Before Tasks

Before the first task is drawn, decide and write **`## Files and what each is
responsible for`**: every file that gets created or modified, one row each, with
what that file is responsible for and which task touches it.

Apply these when deciding the boundaries: one clear responsibility per file;
files that change together live together — split by responsibility, not by
technical layer; follow the codebase's established patterns rather than
unilaterally restructuring it, unless a file this plan already touches has
grown unwieldy on its own.

This comes first because the alternative is discovering the structure task by task,
and then two tasks own the same responsibility and neither implementer can see the
other. Under test, three of four plans named **no file at all** — one of them 1,192
lines long, with exact function signatures on both sides of every seam and not one
path an implementer could open.

## Where a Task Boundary Goes

A task is the smallest unit that **carries its own test cycle and is worth a fresh
reviewer's gate**.

> The test: could a reviewer meaningfully approve this task while rejecting the one
> next to it? If the two can only be judged together, they are one task. If a
> reviewer would have nothing to check, it is not a task.

Not smaller than that. Splitting a change three ways so three people can start at
09:00 buys an hour and costs a day of integration; the same applies to splitting one
reviewable change into "write the type" and "use the type".

## Every Task Is Handed Out Alone

Four slots per task, all required, because the implementer has nothing else.

- **Files** — every file this task creates or modifies, by exact path. A task with
  no file is a fact-finding task; see above.
- **Consumes** — the exact names and signatures it takes from earlier tasks, written
  out here in full. This is the *only* way that implementer learns what a
  neighbouring task produced. A description of the shape is not a name.
- **Produces** — the exact names and signatures later tasks will consume, written
  the same way. Copy them verbatim into those tasks' *Consumes*; if the two differ
  by a character, nothing assembles.
- **Done when** — checkable today, by that implementer, with only this card.

One subject under test did the *Consumes*/*Produces* seams superbly and named zero
files. Two named neither. Both halves are required.

## Step Granularity and Code Content

Each step is one action, small enough to finish in a few minutes — the same bar
`writing-plans` uses. Steps use checkbox syntax (`- [ ] Step N: ...`) so
progress survives a context loss mid-task. A step whose deliverable is code
**is** the code, not a description of it:

- [ ] Write the failing test — the actual test code, in a fenced code block.
- [ ] Run it and confirm it fails for the stated reason.
- [ ] Write the minimal implementation — the actual code, in a fenced code block.
- [ ] Run the test and confirm it passes.

**No fifth step.** Committing what was built is execution, not planning — it
happens during implementation, and which implementation skill does the
running (`relay-subagent-driven-development` or `relay-executing-plans`) is
`relay-plan-execution`'s choice, not this stage's (see *Write
`04-plan.md`*). A plan that tells the implementer to commit has taken a decision
that belongs one stage later.

This applies to a step whose deliverable is code. A step whose deliverable is not
code — updating documentation, adding a configuration entry, creating a data
file — still meets the existing no-placeholder bar (say what changes, not that
something should change) without forcing a test cycle onto work that has none.

Code in a step rests on a fact you have read, never on a runtime, library or
interface you picked yourself — see *Facts You Can Read, Decisions Only a Person
Can Make*. A plan is not the place to discover which stack is real.

## The Coverage Self-Check

Run this on your own draft before calling the plan done — the plan-writer's
equivalent of the checks the earlier stages run on themselves.

One row per requirement in the spec's `## Behaviour` **and one row per entry in its
`## Acceptance`**, each naming the task or tasks that carry it. Acceptance is the
half that gets dropped: two of four subjects checked requirements only, and the
acceptance entries that had no task were the phone-readability check and the
end-to-end rehearsal — the two things the requester would have run first.

**No row is left empty.** An empty row is one of exactly two things, and you must
say which:

- **A task you have not written.** Write it.
- **A requirement you cannot plan**, because it is not decided. Then the plan is not
  written — see *When a Requirement Turns Out Undecided*.

Then the other direction, cheap once the rows exist: a task carrying no requirement
is work nobody asked for. Remove it or say what it serves.

And a third line: every task's **Consumes** must match an earlier task's
**Produces**, by name, character for character. A name that appears in a *Consumes*
and in no *Produces* is a reference to something no task defines.

And a fourth line, now that steps carry real code: every signature a later task's
code uses — a function it calls, a type it constructs — must match the signature
the producing task's code actually defines, character for character. A name that
types correctly in one task's code and differently in another's is the same
defect as a *Consumes*/*Produces* mismatch, one layer down.

## Write `04-plan.md`

Every heading is **required**, in this order.

```markdown
# Plan — <request-id>-<slug>

## What is being built
<One short paragraph. What exists at the end, in behavioural terms.>

## Global Constraints
<Copied verbatim from `02-spec.md`'s `## Constraints` section — project-wide
binding requirements every task inherits implicitly. If `02-spec.md` has no
`## Constraints` section, this plan is not written — see *The Gate*. In
Standalone Mode there is no `02-spec.md`: list what the requester stated
directly, or write "none stated" — see *Standalone Mode*. Never invented
either way.>

## Files and what each is responsible for
<Every file created or modified: exact path, what it is responsible for, which
task touches it. Decided before the tasks below.>

## Decisions taken at planning
<Each: the decision, the anchor that leaves it open — a `02-spec.md` section,
or in Standalone Mode the line of the plan's own Requirements section — and
why this answer. Every entry is technical — mechanism, naming, layout,
ordering. No entry changes anything the requester can observe.>

## Tasks

### Task <n> — <name>
**Files** — <exact paths, created or modified>
**Consumes** — <exact names and signatures from earlier tasks, written out; or
"nothing">
**Produces** — <exact names and signatures later tasks consume>
**Steps** — <checkbox syntax `- [ ] Step N: ...`; each shows what is done, not
what to figure out. A step whose deliverable is code contains the actual code
— see *Step Granularity and Code Content*.>
**Done when** — <checkable today, by this implementer, with only this card>

## Coverage
<One row per requirement in `## Behaviour` and one per entry in `## Acceptance`,
each naming the task(s) that carry it. No empty rows.>

## Self-check
<Four lines: coverage complete in both directions; no placeholder under the
read-it-alone test; every Consumes matched by an earlier Produces of the same
name; every signature used in a later task's code matches the signature the
producing task's code defines, character for character.>
```

Code belongs in the plan now, not only the contract — see *Step Granularity and
Code Content* for what a code step must contain. What still does not belong is
code resting on a fact nobody confirmed: one subject under test wrote two
thousand lines of code in a language it had picked itself, against a runtime
nobody had confirmed. The failure was the invented fact, not the code — read the
fact first (see *Facts You Can Read, Decisions Only a Person Can Make*), then the
code is exactly this stage's to write. No scaffolding, no files created, no
branch, no worktree — an isolated worktree for the build, if one is used, is
whichever implementation skill gets chosen (`relay-subagent-driven-development`
or `relay-executing-plans`) to create (via `superpowers:using-git-worktrees`),
not this stage's. And **no choice about how the plan gets executed** —
subagent-per-task or inline — that belongs to `relay-plan-execution`, and
neither is a commit: every step ends when its test result is verified, not
when anything is committed.

## Append to `00-journal.md`

Append-only. Never edit a section written by an earlier stage. In Standalone
Mode there is no existing `00-journal.md` to append to — create it, and this
section is its first entry.

```markdown
## <date> — relay-planning
<2-4 sentences of prose: how the work was cut and why the boundaries fell there,
which decisions planning took and what anchors them, anything that turned out to
be a fact worth reading rather than a decision, and any pressure this stage ran
under that a later reader would want to know about.>
```

Prose, not a ledger line, and the heading names this stage. The relay's last stage
reviews the process with the journal as its only source.

## Hand Off

End with exactly this shape: (1) a **status line** — the plan is written, how many
tasks, and its exact file path; (2) the **successor**, `relay-reviewing-plan`, which
reviews this plan before anything is built from it; (3) **one question** offering
three ways forward — continue with `relay-reviewing-plan` / go to a different step
instead / stop here.

Never invoke the successor yourself. Under test, not one subject produced this
shape and two never named a successor at all — a plan that ends with a plan is a
plan somebody starts building from unreviewed.

When the gate closed instead, the same three parts apply with the stage the gate
named in place of the successor.

## Re-entry: Sent Back by the Plan Review

A review classifies each finding before handing it on. **Layer-level** findings —
the spec is right and the plan missed a task, drew a boundary wrongly, or has a
defect of its own — come back here. **Requirement-level** findings go to
`relay-refining`, not here. An unclassified finding is treated as
requirement-level.

**Exception — the plan carries the Standalone Mode marker.** There is no
`02-spec.md` and no `relay-refining` to own a requirement-level finding here;
the `## Requirements (standalone...)` section this stage wrote is this
stage's own. The review's verdict says so directly —
`rejected — routed to relay-planning (standalone)` — and both requirement-level
and layer-level findings come back here together. Still classify each one in
your first message; the label tells you whether the fix is a planning defect
or something that needs a return trip to the requester with the corrected
Requirements section, same as the confirmation step in *Standalone Mode*.

Read whatever the review actually wrote; do not assume its layout.

1. **Read the review and the current plan first.** In your first message, name each
   finding you are working and how it was classified.
2. **Bring every named finding to closure** — fixed, or explained as not a defect
   with the reason. Not "noted".
3. **Then run the whole plan back to the bar**, not just the named findings: the
   coverage self-check in both directions, the read-it-alone test on every task, and
   *Consumes* against *Produces*. A reviewer names what they caught. If you find a
   defect they missed while you are here, fix it and say you did.
4. **Do not re-decide anything the spec owns.** A layer-level finding is a
   planning defect; if fixing it seems to require deciding what the requester
   wants, it was misclassified — say so and route it to `relay-refining` rather than
   deciding it here. In Standalone Mode there is no `relay-refining` to route
   to: go back to the requester directly, the same way *Standalone Mode*'s
   confirmation step does, and update the plan's own Requirements section
   with the answer.
5. **The plan is only ever the current text.** Do not keep a superseded task, a
   retired file row, or a previous ordering for traceability. That lives in
   `00-journal.md` and in the review file, both still there.
6. **Say what changed and why it came back**, in the journal section and in the
   handoff.

## Small Requests Get Small Plans

A two-requirement spec gets a plan with one or two tasks, and that is a finished
plan. Do not manufacture a decomposition to make the stage look like work.

Three tasks where one reviewable change exists is worse than one: it multiplies
seams, and every seam needs a *Consumes*/*Produces* pair written twice. The
`## Files and what each is responsible for` section stays — with one row — because
one row is the structural decision, and a one-task plan still gets its coverage
table and its self-check.

The signal you are padding: a task whose *Done when* is "the previous task still
works", or a *Produces* nothing consumes.

## Rationalization Table

Every excuse in the left column was produced by an agent under test.

| Excuse | Reality |
|---|---|
| "Ten tasks stand on requirements the review's coverage table confirms are carried. They are safe to hand out." | You have split one verdict into two. The reader hands out the safe ten, the build starts, and the requirement nobody decided arrives with code already written around it. |
| "I wrote the plan anyway, as you asked, but I did not absorb the open findings into it." | You absorbed them by writing a document called `04-plan.md`. That slot is what the next stages build from; its provenance is not in it. |
| "That question is parked for the requester — do not let it stall the rest of the build." | The task that resolves it is the biggest one in your plan. Parking a requirement is planning past it with a label on. |
| "The set of values that decides it is configuration, so a late answer is a config edit, not a rewrite." | Configuration is where the answer will be *typed*. It is not the answer. Until someone decides it, the task using it cannot be finished by the person holding it. |
| "Reversible as config — confirm with her on return." / "Recorded so you can overrule any of them in one line." | By then it is working software with tests around it, and overruling it is a change request. One message before the plan cost a sentence. |
| "This is the nearest analogue to the rule the spec does give." | Your own note says the result is the outcome she called the worst. An analogue you picked is a requirement you wrote. |
| "I had the task implement a defensible default and flagged one round of formatting rework as expected. That's me choosing a bar nobody agreed to." | You saw it exactly. That sentence is the place to stop, not a caveat to attach. |
| "The command wording is mine by delegation, but I told the implementer to propose it at review." | Delegation to planning means planning decides. Pushing it into a card is one person deciding alone and one person nodding. |
| "The tasks are stack-agnostic on purpose — fill in the host and mail mechanism before hand-out and they read concretely." | A plan that needs filling in before it can be handed out has not been written. Which host already runs is a fact somebody can tell you today. |
| "If the host turns out different, the decomposition survives and every code block has to be re-typed — that is a plan revision, not an implementer's decision." | Then you wrote two thousand lines against a guess instead of a fact you could have read in a minute. Read the fact first — once it is read, the code is exactly this stage's to write. |
| "Sample files are the deliverable of Task 1, attributed and dated, rather than placeholders spread through later tasks." | Tidier, and still a plan whose later tasks are written as if an unknown were known. Get the sample before you decompose. |
| "Each card is self-contained — nothing refers to another card." | And nothing named a file, so no implementer could tell where their code goes. Self-contained means the paths and the names are on the card. |
| "Same shape as Task 1." | The person holding Task 2 has never seen Task 1. Write it out. |
| "There is no review in the folder, so I ran it myself before planning." | You are the stage that plans. A review by the planner is the one review that cannot be independent, and it is not your file to write. |
| "Two of the findings are closable from answers already in the journal — say the word and I'll rewrite the spec." | Two stages in one seat. The journal is evidence for `relay-refining`, and rewriting the spec is its work. |
| "Two implementers are free tomorrow and I have nothing to give them." | A settled question list takes minutes and is worth more than a day of work on a guess. Idle time is cheaper than rework nobody can see yet. |
| "The estimates matter more than the detail — I need cards for the board, not a novel." | A card whose reader cannot finish it is not an estimate, it is a wager. Detail is what makes the number mean anything. |
| "There's probably no relay folder for this one, so I'll just plan it standalone." | "Probably" is a claim; the existence check is a directory listing. Standalone Mode is for a request that has none of the four files, confirmed, not for one you didn't look for. |
| "I'll skip the standalone confirmation step — the request was detailed enough." | Detailed and unreviewed are different things. The confirmation step is Standalone Mode's entire substitute for `relay-reviewing-spec`; skipping it is a plan with no requirement review at all. |

## Red Flags

Each of these means you are mid-violation, not about to be.

- "It's safe to hand out the parts that aren't affected."
- "I'll park that one and plan the rest."
- "That goes in configuration." / "The values land around day four."
- "Reversible." / "You can overrule it in one line." / "Cheap rework."
- "The nearest analogue is…" (about behaviour the spec does not state)
- "The implementer can propose that at review."
- "Fill in the host / the path / the address before hand-out."
- "Task 1 finds that out." (and later tasks are already written)
- "Same shape as Task N." / "Repeat what Task N did."
- "Timebox, not an estimate." (because the task is unspecified)
- "There's no review file, so I'll do the review." / "I'll fix the spec while I'm
  here."
- A code step with no actual code in it — a description standing in for the
  test or the implementation.
- Code written against a runtime, library, or interface nobody confirmed — a
  fact this stage invented instead of read.
- Telling the implementer to commit — that decision belongs to whichever
  implementation skill runs the card.
- Reaching for a file-writing tool on anything but `04-plan.md` and
  `00-journal.md`.
- Finishing a task card without an exact file path in it.
- Reaching the end without a coverage row for every acceptance entry.
- Assuming standalone without listing the directory first.
- Writing `04-plan.md` in Standalone Mode without the provenance marker at
  the top, or without stating the Requirements section back to the requester
  for confirmation.

## Worked Example

An approved spec for a weekly reconciliation between a staff list and a software
vendor's licence-seat list: eight requirements, eight acceptance entries, one of
them an ordered cascade for an unreadable source. The spec deliberately leaves the
wording of one command to planning, in the requester's own words. Three
implementers idle from 09:00, the requester on leave for a week, "just get me
something I can hand out".

**What failed under test (do not do this).** Four subjects wrote plans — one of
them 1,192 lines, one 2,986 with complete source code in it. Between them: no file
path an implementer could open (three of four), *"Same shape as Task 1"* handed to
someone who cannot see Task 1, five behavioural rules the spec does not contain
decided at planning and labelled reversible, sample files nobody had made the head
of the plan, a runtime invented and then coded against, a coverage table over
requirements but not acceptance, and no successor named. Every one of them also
found the same real requirement-level gap — two of the three reported categories
were indistinguishable as written — and every one planned past it.

**What this skill does instead.** The gate first: latest round `approved`, so
planning is open. Then the reading, and the sharp reading finds the gap: the spec
asserts every mismatch is exactly one of three kinds, and two of the three describe
the same rows unless the staff list keeps people after they leave. Is that a fact
or a decision? Partly a fact — whether the list keeps leavers is in a sample file
somebody can send within the hour. So: get the sample. It does keep them, with a
status field.

That leaves the decision: which status values mean somebody has given up their
seat. Nothing contains that answer; a person owns it, and two answers change what
the requester reads — a colleague on long-term leave either appears as a leaver
holding a seat or does not. Requirement-level. Every task classifying a mismatch
would have to implement it. So the plan is **not written**, and this is the whole
of the handoff:

> Not planned. The spec's three mismatch kinds cannot all be derived as written:
> two of them describe the same rows unless the staff list distinguishes people who
> have left, and it does — by a status field, which I confirmed from a real extract
> rather than asking anyone. What is not decided is which status values mean the
> person has given up their seat; someone on long-term leave sits on either side of
> that line depending on the answer, and the requester is the only person who can
> draw it. That is requirement-level, so it goes to `relay-refining`. Nothing else
> in the spec is blocked — once that answer exists this is a six-task plan and I
> can write it the same day. Continue with `relay-refining`, go to a different step
> instead, or stop here?

One question, one named destination, nothing to throw away. The three idle mornings
are now a decision the lead makes with real information, instead of a plan that
spends them building the wrong half of a comparison.
