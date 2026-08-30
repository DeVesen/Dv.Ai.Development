---
name: relay-subagent-driven-development
description: Use when relay-plan-execution has routed here to build an approved plan with a fresh implementer subagent per card and an independent reviewer between cards. Also use when a reviewer's finding contradicts the plan's own text — that finding is never resolved by ruling on it and continuing, only by stopping the card and naming which other relay stage owns it.
---

# Relay Subagent-Driven Development

## Overview

Reached only by hand-off from `relay-plan-execution`, after the gate opened and
this path — fresh implementer subagent per card, independent reviewer between
cards, fix loop — was chosen over `relay-executing-plans`. It turns
`04-plan.md` into the change it describes and into `06-implementation-log.md`.

**Core principle, inherited unchanged:** fresh subagent per card + card review
(spec + quality) + broad final review = high quality, fast iteration. The
controller never writes code and never judges its own dispatched work —
judgment always comes from an independently dispatched reviewer.

**The one place this differs from the general technique, and the reason this
skill exists as its own relay stage rather than a thin restatement:** when a
reviewer's finding is that the **card itself contradicts `02-spec.md` or
`04-plan.md`**, the controller does not weigh it, decide which document wins,
record a ruling, and keep going. It stops that card and names which other
relay stage owns the fix. See *When a Card Is Not Trustworthy* — this is not
optional, and it is not the same thing as the ordinary fix loop below.

Why this matters, in evidence: under pressure-testing, a controller asked to
run exactly this technique, told a reviewer had found a card instruction
contradicting the spec, with two people idle waiting, reasoned as follows and
then acted on it — verbatim: *"I don't send this back to a human for a
go/no-go. I treat it as a plan defect, not an open design question. I update
Task 4's card text on the spot."* That is the failure this section exists to
close. The card being obviously, verifiably wrong does not make repairing it
this stage's job — see the rationalization table.

**Narration:** between tool calls, narrate at most one short line — the
ledger and the tool results carry the record.

**Continuous execution:** do not pause to check in with your human partner
between cards. Execute the plan without stopping. The only reasons to stop
are the four named below, or all tasks complete. "Should I continue?"
prompts and progress summaries waste their time — they asked you to execute
the plan, so execute it.

**Rulings, not stalls, for ordinary defects.** A running build does not wait
on a human over plan text that is merely under-specified, an ambiguity the
spec already resolves, or a fix-loop cap it would have asked to exceed.
Decide it: the spec is the binding authority, the plan is its argument, and
your judgment settles what neither answers. Record every decision in the
ledger as `Ruling: <what you decided> — <why> — <what it costs if wrong>`,
and keep going. **This never covers a Card Validity concern** — see *When a
Card Is Not Trustworthy* below; that is never a ruling, cap or no cap.

Four things stop you, and only these: an irreversible or destructive
operation; a security-sensitive action; a side effect outside this worktree
that norms say you ask about first (a merge, a push to a shared branch, a
publish); and a plan so broken that every path forward is a guess — a Card
Validity concern is this stage's own always-stop instance of that fourth
case. For those, stop and ask.

## When to Use

- `relay-plan-execution` named this stage as the chosen build path.
- A reviewer's finding needs adjudicating mid-loop, or a fix round is mid-flight.

## When NOT to Use

- **You were not routed here by `relay-plan-execution`.** That stage owns the
  gate and the choice between this skill and `relay-executing-plans`.
- **The plan is what is being reviewed.** That is `relay-reviewing-plan`.
- **The built change is what is being reviewed.** That is
  `relay-reviewing-implementation` — a different, later, arm's-length audit
  that this skill's own per-card reviews do not replace.

## Load the Ground Truth First

Default artifact home: `docs/relay/<request-id>-<slug>/`.

This is a **default**, and so is the language the artifacts are written in.
Where the project's always-loaded instruction file names an artifact home or
an artifact language in its `## Relay process discipline` section — installed
by `relay-init` — that binds. Absent it, use the path above and the language
of this conversation, say in your first message which language you are writing
in, and never infer it from files that already exist. Anything quoted from the
requester is recorded in the words they used, never translated.

Read `04-plan.md`,
`02-spec.md`, and `00-journal.md` (including `relay-plan-execution`'s section
confirming the gate was open and this path chosen) from disk. Do not re-check
the gate — that already happened; arriving here means it is open.

**This stage writes exactly two files in the request folder:**
`06-implementation-log.md` and its own appended section of `00-journal.md`,
plus the files `04-plan.md`'s `## Files` section names. It also owns a
git-ignored `.sdd-workspace/` scratch directory (below) for briefs, reports
and diffs — nothing in it is a durable relay artifact.

## Setup

Ensure the work happens in an isolated workspace (`superpowers:using-git-worktrees`
or your platform's equivalent). **Never start implementation on a main/master
branch without your human partner's explicit consent.** Conversation memory
does not survive compaction — track progress in a ledger file, not only in
todos.

- At start, run `scripts/relay-sdd-workspace 04-plan.md` — prints
  `<request-dir>/.sdd-workspace/`, home to every artifact for this build:
  ledger, briefs, reports, review packages.
- Check for a ledger at `<workspace>/progress.md`. A `Task <N>: complete` line
  means DONE — resume at the first task without one. A ledger whose last line
  is a fix round is mid-loop: resume the loop at the next round.
- Create the ledger with its identity as the first line:
  `# SDD ledger — <request-id>-<slug>`.
- Trust the ledger and `git log` over your own recollection after compaction.

Read `04-plan.md` once, note its Global Constraints, and create a todo per
task. Before dispatching Task 1, scan the plan once for conflicts between
tasks (shared files/interfaces) and within a task (its own tests vs its own
code). Write the scan as a table to the ledger — one row per pair of tasks
that share a file or interface, one row per task's internal self-consistency.
A finding here that turns out to be the card contradicting the spec is **not**
yours to rule on even at this pre-flight stage — see *When a Card Is Not
Trustworthy*; everything else, rule on and record.

## Model Selection

Use the least powerful model that can handle each role. Mechanical tasks
(isolated functions, clear specs, 1-2 files): cheap model. Integration/judgment
tasks: standard model. The final whole-branch review: the most capable
available model. Fix-loop rounds 4-5: a tier above the implementer that got
stuck. **Always specify the model explicitly** — an omitted model inherits
the session's, usually the most expensive.

**Turn count beats token price.** Wall-clock and context cost scale with how
many turns a subagent takes, and the cheapest models routinely take 2-3× the
turns on multi-step work — costing more overall. Use a mid-tier model as the
floor for reviewers and for implementers working from prose descriptions.
When the card text contains the complete code to write, the implementation is
transcription plus testing: use the cheapest tier for that implementer.
Single-file mechanical fixes also take the cheapest tier.

**Task complexity signals (implementation tasks):**
- Touches 1-2 files with a complete card → cheap model
- Touches multiple files with integration concerns → standard model
- Requires design judgment or broad codebase understanding → most capable model

**Review tasks:** choose the model with the same judgment, scaled to the
diff's size, complexity, and risk. A small mechanical diff does not need the
most capable model; a subtle concurrency change does. Scoped re-reviews of
small fix diffs take a cheap-to-mid tier.

## The Task Loop

**Batch small same-shape work** — several small, independent, same-kind edits
go to ONE subagent as one dispatch, not one dispatch each.

Everything pasted into a dispatch prompt stays resident in context for the
rest of the session. Hand artifacts over as files, not pasted text.

**Never dispatch multiple implementation subagents in parallel** — concurrent
implementers risk conflicting edits to shared files or interfaces.

**Waiting on a dispatched subagent:** never poll a wait interface with short
timeouts, and never sit in one silent, open-ended wait either. While you have
local work — ledger updates, packaging the next review, reading reports —
keep working; the result arrives on its own. When you are genuinely idle,
wait in bounded stretches (five to ten minutes, where your platform allows),
and between stretches post one line of status and check whether the
dispatched agent finished without reporting back. A bounded stretch keeps
nearly all of a long wait's efficiency while guaranteeing a stuck or lost
subagent is noticed within minutes, not at the end of the session.

### 1. Dispatch the implementer

Record BASE (`git rev-parse HEAD`) before dispatching. Run
`scripts/relay-task-brief 04-plan.md N` for the brief path. Dispatch per
[implementer-prompt.md](implementer-prompt.md): brief path, interfaces from
earlier tasks the brief cannot know, your resolution of any ambiguity you
noticed, the report-file path. Never paste the whole plan or prior tasks'
accumulated summaries into a dispatch. The implementer never dispatches
subagents, not even a reviewer.

### 2. Handle the report

**DONE:** generate the review package
(`scripts/relay-review-package 04-plan.md BASE HEAD`), dispatch the task
reviewer.

**DONE_WITH_CONCERNS:** read the concerns; if about correctness/scope, address
before review; if observational, note and proceed to review.

**NEEDS_CONTEXT with a card-vs-reality contradiction:** this is the same
category as *When a Card Is Not Trustworthy* below, arrived at from the
implementer's side instead of the reviewer's. Treat it identically — do not
resolve it yourself because the implementer, not a reviewer, is the one who
flagged it.

**NEEDS_CONTEXT (ordinary, missing information):** provide it, re-dispatch.

**BLOCKED:** assess — more context and re-dispatch same model; more reasoning
needed and re-dispatch a more capable model; task too large, split it; plan
wrong in the ordinary sense, rule on it (see Model Selection / ledger) and
carry the ruling into the re-dispatch.

### 3. Review the card

Hand the reviewer its diff as a file
(`scripts/relay-review-package 04-plan.md BASE HEAD`), plus the brief, the
report, and Global Constraints copied verbatim from `02-spec.md`. Per
[task-reviewer-prompt.md](task-reviewer-prompt.md), the reviewer returns
three things: Spec Compliance, Issues (Critical/Important/Minor), and **Card
Validity** — separately.

Do not pre-judge findings for the reviewer. Do not instruct it to skip
checking Card Validity because the plan already passed review — a plan
review checks the plan as a whole; a reviewer with the diff in front of it
can catch things visible only once the card meets real code.

### 4. When a Card Is Not Trustworthy

**Trigger:** the reviewer's Card Validity section is not "no concern", or an
implementer reported NEEDS_CONTEXT citing a card-vs-reality contradiction.

**This never enters the fix loop below, is never a Ruling, and is never
something the round-5 breaker adjudicates or parks.** However confident you
are that you already know which document is right — however short the fix
would obviously be — this stage does not repair `04-plan.md` or `02-spec.md`,
and does not instruct the implementer to build to a corrected version of
either. The reasoning "the spec is authoritative by construction, so
confirming that and fixing the card is just applying the standing rule, not
deciding anything" is exactly the reasoning that produced the verbatim
failure quoted in Overview. Confirming which document is right is still a
decision about content neither of those documents has settled yet in a form
anyone downstream can see.

**What you do instead, in order:**

1. **Stop.** Do not dispatch the next task. Do not re-dispatch this task's
   implementer with your own guess at a corrected card. What is already
   built and reviewed clean on earlier tasks stays built.
2. **Classify by which document is wrong**, the same test the relay's
   planning and review stages use:

   | What was found | Destination |
   |---|---|
   | The card says something false, names something that doesn't exist, contradicts another card or the spec, and `02-spec.md` is right | `relay-planning` |
   | The card is faithful to the spec, and the spec is ambiguous, contradictory, or silent | `relay-refining` |

   If you cannot tell which, treat it as the second — a redundant pass costs
   a conversation, a spec defect built into working code costs the build.
3. **Do a fast blast-radius check**, nothing more: does the same pattern the
   finding names appear in an already-completed task's card? If so, say so
   in the log as a suspected finding against that task too — do not
   re-open or silently patch that task's own commits. Naming it is enough;
   deciding it is not yours either.
4. **Record it in the ledger and in `06-implementation-log.md`**'s
   Deviations section: which card, what it said, what was actually true, the
   bucket, the destination. Then hand off — see *Hand Off*. Do not continue
   building later cards "to use the time" — see relay-executing-plans'
   Overview for why that specific rationalization is closed off; it applies
   here identically.

### 5. The fix loop (ordinary findings only)

Triggers on spec ❌, any Critical/Important finding, or a confirmed ⚠️ item —
**never** on a Card Validity concern, which exits at step 4 above instead.

- Minor findings: ledger them (`Task <N>: minor (deferred): <one-liner>`),
  never enter the loop.
- A finding that conflicts with the plan's own text, where the plan itself is
  correct and just under-specified (not a spec contradiction) — this is
  yours to rule on. Weigh it against the plan text, spec is the binding
  authority, ledger the ruling, act.

One fix round = one fix dispatch + one scoped re-review. **Five rounds max.**
Rounds 1-3: resume the original implementer with the findings verbatim.
Rounds 4-5: fresh implementer, more capable model, framed as "a prior
implementer attempted this [N] times; read the report file for what was
tried."

Every round: implementer fixes, re-runs covering tests, appends to the report
file, returns the short contract. Confirm the fix report has covering tests +
command + output before dispatching the scoped re-review
([re-review-prompt.md](re-review-prompt.md)) — a re-review is scoped to the
findings list and the fix diff only; new Critical/Important breakage in the
fix diff joins the open list, out-of-scope observations go to the ledger as
deferred minors.

After each round, ledger:
`Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`.

Never fix findings yourself in the controller session.

**The breaker, round 5 still open:** adjudicate yourself — park a wrong or
contestable finding with a ruling; park a real-but-non-load-bearing one with a
ruling; rule on a load-bearing one (a later task depends on it) and carry the
ruling forward. **This breaker never applies to a Card Validity concern** —
that always exits at step 4, cap or no cap.

### 6. Complete the task

Review clean, or every open finding parked/ruled at the cap: ledger
`Task <N>: complete (commits <base7>..<head7>, review clean | <K> parked)`,
mark the todo complete, move on — unless step 4 fired, in which case there is
no "move on": hand off instead.

## Final Review

After all tasks: package the whole branch
(`scripts/relay-review-package 04-plan.md MERGE_BASE HEAD`), dispatch on the
most capable available model using superpowers:requesting-code-review's
`code-reviewer.md`, pointed at the ledger's deferred-minor and parked lines.
This is a code-quality/architecture pass across the whole change — it does
not replace `relay-reviewing-implementation`'s later, independent,
spec-and-acceptance-driven audit, and it cannot verdict a Card Validity
concern; if the final reviewer surfaces one, it goes through step 4 exactly
the same as one found mid-build.

Findings: ONE fix dispatch with the complete list, one scoped re-review.
Residual load-bearing findings surface in your hand-off, not a second wave.

## Write `06-implementation-log.md`

Same required, in-order headings as the solo path's log (see
`relay-executing-plans`'s template): Where the changes are; Execution
(confirms this was built via relay-subagent-driven-development, names the
ledger path); Baseline before anything changed; Tasks (per task: what was
done, files, verification run, done when); Deviations from the plan
(including every Card Validity finding, per task 4's classification);
What is not done; Verification not run. All three of the last are written
even when empty.

## Append to `00-journal.md` and Hand Off

Journal section named `## <date> — relay-subagent-driven-development`, prose,
2-4 sentences: how the build went, what the final review found, any Card
Validity stop and where it was routed, any pressure this stage ran under.

Before finishing, collect every ledger line containing `Ruling:` into your
hand-off under "Rulings I made" — this list never includes a Card Validity
routing decision, because that was never a ruling; it names the destination
and stops.

End with exactly this shape: status line (tasks done, log path); successor —
`relay-reviewing-implementation`, or the stage a Card Validity finding named;
one question offering three ways forward. Never invoke the successor
yourself.

**Branch integration is nobody's job in this chain.** `relay-reviewing-implementation`
and `relay-reporting` both finish without deciding whether or when the branch is
merged — this skill's own reference to "merged" below is not a step anyone here
performs. It is the requester's call, taken once the branch has cleared review,
using `superpowers:finishing-a-development-branch` where that skill is available,
or the project's own convention otherwise. Say so plainly in the hand-off rather
than assuming it happens.

When the final review is clean and merged, delete `.sdd-workspace/` — the
git history and the relay artifacts are the record now.

## Rationalization Table

| Excuse | Reality |
|---|---|
| "I don't send this back to a human for a go/no-go. I treat it as a plan defect, not an open design question. I update the card text on the spot." | Verbatim from testing. Confirming which document is authoritative is still a decision nobody downstream can see was made. Stop, classify, name the destination — do not edit. |
| "The spec is authoritative by construction, so this isn't really my judgment call." | It is the reasoning that produced the failure above. Being obviously right about which document should win does not make editing it yours. |
| "Two people are idle, I can't stall on this." | Naming the destination and stopping takes one message. Idle time costs less than a second implementation built on a card you patched yourself. |
| "I'll rule on it like any other plan-text conflict — the fix-loop already has a mechanism for this." | The fix-loop's ruling mechanism is for the plan being internally right but under-specified. A card that contradicts the spec is a different category, closed to ruling by design here. |
| "The later cards are mostly a repeat of the earlier ones, they'll go fast, no harm building ahead." | Building ahead of a stopped card risks two reworks instead of one if the fix changes what those cards were assuming. |

Full table, including every quote from testing, in
[references/rationalization-table.md](references/rationalization-table.md).

## Red Flags

- "I'll fix the card, it's obviously right."
- "I'll rule on this and keep the pipeline moving."
- "I can get ahead on the next task while this gets sorted."
- "The reviewer's Card Validity note is basically a Critical finding, I'll fix it in the loop."
- Editing `04-plan.md` or `02-spec.md` from this skill, ever.
- Ending without a status line, a named successor, and a question.

See [references/worked-example.md](references/worked-example.md) for a full
run including a Card Validity stop.

## Common Rationalizations (process mechanics, not Card Validity)

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | Reviewer found spec gaps = not done. Fix or hit the cap and adjudicate. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. |
| "One more round will converge" | Past the cap, rounds don't converge — adjudicate and route. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. |
| "The implementer spawned its own reviewer — free extra assurance" | A duplicate seat reviewing the same diff; flag it as a defect. |
