---
name: relay-discussing
description: Use when a raw request arrives — a typed prompt, a ticket, a story, a bug report, a feature idea — and nobody has confirmed yet what is actually wanted, especially when it comes with urgency, "just build it", "no discussion", "requirements are final", "full freedom on the details", or a requester who says they cannot answer questions right now. Also use when about to write a spec, a plan, or code for a request that was never talked through.
---

# Relay Discussing

## Overview

First stage of the relay. It turns a raw request into a **shared, confirmed
understanding** of what is wanted — and produces one artifact recording that
understanding. Nothing else.

Core principle:

> Understanding is something the requester gives you by answering questions.
> It is not something you produce by making defensible choices.

A choice you made alone is not understanding, no matter how well reasoned,
how well documented, or how clearly flagged as an open point. Documenting an
ambiguity is not resolving it.

## When to Use

- A new request lands and no confirmed understanding of it exists yet.
- You are about to write a spec, a plan, or code, and cannot point to a
  confirmed intake note for this request.
- A request arrives already "settled" — groomed ticket, signed-off story,
  "requirements are final" — but reading it leaves you with choices to make.
- A request arrives with pressure attached: a deadline, "don't ask
  questions", "you decide the details", an absent requester.
- Someone asks for a spec/plan/implementation of something that was only ever
  described in one sentence.

## When NOT to Use

One conditional, keyed to something observable — not a judgment call:

> Skip the relay only when the request names **the exact change** and **the
> exact place**, and there is exactly one way to carry it out.

"Fix the typo `recieve` in the login banner" qualifies. "Add export",
"make it faster", "users need X" never qualify, however short they are.

If you find yourself constructing an argument for why a request qualifies,
it does not qualify. The need to argue is the evidence.

This is the only *skip*. A request that fails it still isn't necessarily the
heaviest procedure below — see step 2: most requests that fail this clause
turn out to be `Bounded`, not `Architectural`.

### Skip still gets one yes

Skip removes the intake note, the classification, and the journal. It does
not remove confirmation. Before touching anything, state the exact change
and the exact place you found it, in one message, and wait for an explicit
yes. No template, no file — one sentence saying what you're about to change
and where, one answer.

This exists because "the exact place" is your own reading of the code, not
yet a fact the requester has seen. A one-word typo can live in two places —
a template and the translation file it actually renders from, say — and
that turns "exactly one way to carry it out" into two ways, silently,
unless the requester gets a chance to say so first. Stating it costs one
message. Building the wrong half of it costs a second pass.

## The Gate

Until an intake note exists **and** the requester has confirmed the
understanding in it, you do not:

- write or modify production code
- create, scaffold, or rename files, folders, modules, or branches
- add tests, dependencies, configuration, or build scripts
- write a spec (that is `relay-refining`)
- write an implementation plan (that is `relay-planning`)
- start implementing (that is `relay-plan-execution`)

You may: read anything, run read-only commands, ask questions, and write the
two artifacts this skill owns (`01-intake.md`, `00-journal.md`).

The skip path (see *When NOT to Use*) is the one case with no intake note.
It is never a case with no confirmation at all — *Skip still gets one yes*,
above, is this gate's version there.

**Violating the letter of this rule is violating the spirit of this rule.**
Asking excellent questions *and also* shipping the code does not satisfy the
gate — it fails it. The gate is about what does not exist yet, not about the
quality of your reasoning.

### The gate does not lift because…

Each of these was tried by an agent under test. None of them lift it.

- The requester said they are unavailable, on a call, or off for the day.
- The requester said "no discussion", "don't ask questions", or "just get it
  done".
- The requester said the requirements are final, groomed, or signed off.
- The requester said "you have full freedom on the details".
- The requester said they trust your judgement, or told you to decide. (That
  can resolve a *question* — see "When the Requester Delegates" below. It
  never lifts the gate.)
- The codebase "contains everything you need".
- The ambiguity only becomes visible once you start building.
- You would flag the ambiguity afterwards as an open point.
- You picked the interpretation that is defensible / reversible / one line to
  change later.
- Your change is small, additive, touches nothing existing, or is easy to
  throw away.
- You wrote tests and they pass.
- You classified it as `Spike` or `Bounded`. Classification (step 2) changes
  what gets produced and how fast — never whether an intake note gets
  written and confirmed first.
- The request is skip-eligible. Skip lifts the intake note — never the
  one-message confirmation in *Skip still gets one yes*.

Reading the codebase is encouraged. It answers *what exists*. It never
answers *what is wanted* — that information exists only in the requester's
head until they say it out loud.

Tests answer *does this work*. They never answer *is this the right thing*.
Green tests on the wrong feature are a more expensive failure than no
feature, because now someone has to argue with working code.

## Intake Is Not a Spec

Keep this boundary sharp, because the artifacts sit next to each other:

| `01-intake.md` (this skill) | `02-spec.md` (`relay-refining`) |
|---|---|
| What the requester wants, in their words | Binding requirements, in precise terms |
| May contain leanings and open questions | No open questions, no hedge words |
| Not a commitment to build anything | The thing later stages are held to |
| Written to be read by a human and by `relay-refining` | Written to be reviewed and implemented against |

Nothing in `01-intake.md` is a requirement. Say so in the note itself — the
template below has a required line for it. A reader who mistakes intake
notes for a spec will build the wrong thing and be able to cite you for it.

The same boundary holds for a Bounded request's `## Short design (bounded
path)` section below: an approach, not a spec, confirmed the same way, owned
by this skill — not `relay-refining` or `relay-planning` — and never a
file-by-file implementation plan.

## Procedure

### 1. Look for an existing relay first

Default artifact home:

```
docs/relay/<request-id>-<slug>/
```

Default only — project/user preference for a different location overrides
it, check first. Neither `docs/relay/` nor this request's folder existing
yet is normal, not a blocker — create both as needed.

If a folder for this request already exists with an `01-intake.md` in it,
read it before asking anything, and say what you found. Do not silently
start a second intake for the same request.

### 2. Classify: Spike / Bounded / Architectural

Before minting an identity, decide which of three shapes this request is —
this decides how much of the rest of this document applies and how fast the
requester gets an answer.

- **Spike** — feasibility/investigation, no commitment to build regardless
  of the answer: "can we", "is this realistic", "what would it take". Look,
  think, answer — don't build, don't write a spec.
- **Bounded** — a real, scoped change to one existing flow: files/components
  are already identifiable, what's open is the detail — not whether it needs
  a new component/subsystem or an undecided design. Fails the skip clause
  above, but doesn't need a separate binding spec and plan to build safely.
- **Architectural** — everything else: a new component, cross-subsystem
  coordination, or an undecided solution shape. This skill's full, unchanged
  procedure — successor still `relay-refining`.

State the classification out loud, with one sentence of why, in the opening
message that proposes the slug (step 4) — same idiom as the slug itself:
propose it, let the requester correct it in that message. Proceed on their
correction if one comes; otherwise on your own call.

**The ratchet is one-way.** Discovering mid-flow that a Spike or Bounded
request needs a new component, spans more than one subsystem/service, or
hides a design fork behind an assumed "one way to do it": say so, upgrade to
Architectural, continue there. Never the reverse — "turned out smaller"
isn't "was never Architectural".

### 3. Mint the request identity

```
<request-id>-<slug>
```

- `<request-id>` defaults to `YYYY-MM-DD` — **your environment's current
  date**. Never computed, guessed, or reused from an example; ask if
  unavailable.
- `<slug>` is a short kebab-case name: 2–4 words, recognisable a month
  later. Propose it, and get it confirmed in the same message that proposes
  it.
- If an external tracker ID (issue, ticket, story) is already in context, it
  may prefix the slug: `2026-08-28-tl-212-task-export`. Never invent one and
  never assume one exists.

### 4. Open with a restatement, not with questions

Your first message contains four things and nothing more: (1) the request
restated in your own words, short — so a misunderstanding surfaces now
rather than in the spec; (2) the classification from step 2, with the
one-sentence reason; (3) the proposed `<slug>` for confirmation; (4) **one**
question — for a Spike, whatever you still need to answer the feasibility
question; for Bounded/Architectural, whatever is most load-bearing toward
"what does done look like".

The slug confirmation is a confirmation, not an exploration — bundling it
with the classification and the first question is intended and does not
count against the one-question rule.

### 5. One question per message

Ask one question. Wait. Ask the next.

This is not politeness. Each answer changes which question matters next; a
list of five questions asked at once gets four shallow answers and hides the
one that mattered. A question dump is also how "we discussed it" turns into a
transcript nobody can act on.

Cover, across the exchange:

- **Purpose** — what becomes possible, or stops hurting, once this exists.
  Who benefits, and what do they do today instead.
- **Scope boundaries** — what is explicitly *not* part of this. Ask for at
  least one exclusion; requesters rarely volunteer them.
- **Constraints** — deadlines, systems that must not change, compatibility,
  data, people who must approve.
- **Success criteria** — how the requester will decide this is done, stated
  as something observable.

Ask about whatever is genuinely unclear, in whatever order the answers
suggest. Do not run this list as a script.

**Ask the load-bearing question first.** Before you send a question, check
whether a different one subsumes it. Under test, an agent asked a real
question about scope, then discovered while reading that the answer to an
unasked question — what the output was actually for — would have settled the
scope question by itself. It had spent the requester's patience on the
smaller of the two. You usually get fewer questions than you want; spend the
first on the one whose answer changes the most.

**Stop condition:** Bounded/Architectural — you can state what "done" looks
like, in the requester's own terms, with no gap you'd fill by guessing. Not
"no gap I can't reasonably fill" — no gap. Spike — you can answer the
feasibility question itself, with no gap in *that*; if a question you're
about to ask only a build would need answered, that's the step-2 ratchet
firing, not a bigger Spike — say so and reclassify.

If the picture is still shapeless after several rounds, say that plainly and
ask the requester to reframe the request. Handing an unclear request back is
a valid outcome. Proceeding is not.

### 6. Sketch directions only if there is a real fork

If the request can plausibly be satisfied in genuinely different ways,
offer 2–3 **high-level** directions and name which one you would pick and
why. High-level means the shape of the answer — where the capability lives,
what the user interacts with, what the trade-off is. Not steps, not files,
not interfaces.

If there is no real fork, skip this. Inventing alternatives to look thorough
wastes the requester's attention. A Spike skips this too — its findings
belong in `## Directions considered` in step 8, not a separate sketch.

### 7. Play the understanding back and get an explicit yes

Summarise: request, purpose, in-scope, out-of-scope, constraints, success
criteria, any leaning. Ask the requester to confirm or correct it. Silence
is not confirmation. "Sounds good" on a summary you actually wrote is.

Bounded: fold the Short design (`## Short design (bounded path)`, step 8's
template — approach, files/components touched, test approach) into this
same playback, and ask for one yes that covers both what is wanted and
that approach. Two things confirmed in one message is not two gates;
asking twice for something this size is ceremony the task doesn't carry.
The one yes has to actually cover both — if the requester answers before
you've described the approach, or answers only the scope half ("makes
sense" said to the summary, silence on the design), that is not yet a yes
to the Short design. Notice that, and ask the narrower question before
treating it as confirmed.

Spike: no build to say "yes" to — skip straight to step 8.

### 8. Write `01-intake.md`

Every heading below is **required**. If a section has nothing in it, write
`None` — do not omit the heading. A missing heading reads as an oversight;
an explicit `None` reads as an answer. For a Spike: `In scope` describes what
the investigation covers, not a build; `Out of scope`/`Constraints` collapse
to `N/A — spike, no build`; `Success criteria` describes how the
recommendation will be judged, not a build outcome.

```markdown
# Intake — <request-id>-<slug>

## Classification
<Spike / Bounded / Architectural, and the one-sentence reason. If the
ratchet fired mid-flow, say what changed and what it was reclassified from.>

## Request (in the requester's own terms)
<Their framing, quoted where you can. Not your improved version of it.>

## Purpose
<What becomes possible or stops hurting. Who benefits.>

## In scope
<->

## Out of scope
<What was explicitly excluded. "None stated" if nothing was.>

## Constraints
<Deadlines, systems that must not change, compatibility, approvals, data.>

## Success criteria
<Observable. How the requester will decide this is done.>

## Directions considered
<2-3 high-level options and the leaning, or "None — no real fork." Spike:
your actual answer instead — feasible or not, rough shape, rough cost —
labelled `Recommendation (not a decision)`.>

## Short design (bounded path)
<Bounded only: approach, files/components touched, test approach — solution
shape, not a file-by-file plan. "N/A — architectural path" / "N/A — spike"
otherwise.>

## Open questions
<Each: the question, why it matters, what changes depending on the answer.
Mark each BLOCKING or NON-BLOCKING. "None" if none.>

## Decisions delegated to me
<Only questions the requester saw and handed back. Each: the question as you
put it, what you told them changes depending on it, their words handing it
over, and what you will therefore treat as chosen. "None" if none.>

## Confirmation status
<Confirmed on <date>: which parts. Or: not yet confirmed, what's outstanding.
Bounded: confirm that the Short design was part of the same yes as the rest
— not a second confirmation, but still named explicitly, not assumed.>

## Not in this note
This note records understanding, not requirements. Nothing here is binding.
Binding requirements are produced by `relay-refining` in `02-spec.md` — for
Architectural requests only. A Spike's recommendation and a Bounded's Short
design are not requirements either, and neither is reviewed or overruled by
`relay-refining`.
```

### 9. Append to `00-journal.md`

Create it if absent. Append-only — never edit a section written by an
earlier stage.

```markdown
# Relay Journal — <request-id>-<slug>

## <date> — relay-discussing
<2-4 sentences of prose: what was understood, which decisions were taken and
by whom, anything ruled out, anything left open and why.>
```

Prose, not a ledger line. The last stage of the relay reviews the process
with the journal as its only source — "done" tells it nothing.

### 10. Hand off

Branches by step 2's classification. Say which one; don't silently pick.

**Architectural** — unchanged: **status line** with the file path; name
**`relay-refining`** as successor (turns this note into a binding spec,
`02-spec.md`); **one question** — continue with `relay-refining` / a
different step / stop here.

**Bounded:** step 7's playback already carried the Short design and got its
one yes — nothing left to confirm here. **status line** with the file path;
name **implementation directly** — never `relay-refining`, never
`relay-planning` (naming it is the hand-off, you don't implement here);
**one question** — proceed to implementation / a different step / stop here.

**Spike:** **status line** with the file path and the recommendation stated
plainly, labelled a recommendation, not a decision. **No successor** —
nothing was decided or committed. Wanting to build on this later is a new
request, classified fresh at step 2 — not a continuation of this Spike.

Never invoke a named successor yourself, in any branch. Naming it is the
handoff; the requester decides whether the relay continues.

## When the Requester Cannot Answer

The predicate: *the requester has stated they are unavailable, or you asked
and no answer came.*

Then:

1. The gate still holds. No code, no spec, no plan.
2. **Do not decide the open questions.** Not even provisionally, not even
   with the safest option, not even reversibly.
3. Write `01-intake.md` with what you do know filled in, the rest under
   `## Open questions` marked `BLOCKING`, each stating what changes
   depending on the answer. If you have a recommendation, label it
   `Recommendation (not a decision)`.
4. Set `## Confirmation status` to not-yet-confirmed and name what is
   outstanding.
5. Append the journal section.
6. Report: what is understood, what is blocked on whom, and that the relay
   stops here until answered.

Handing back a blocked intake in five minutes is the successful outcome of
this situation. It is worth more than a working feature built on a guess,
because it costs nothing to redirect.

## When the Requester Delegates the Decision

The predicate — all three parts must hold:

1. You put the question to them explicitly, **and**
2. you told them what changes depending on the answer, **and**
3. they answered by handing the decision back: "you decide", "use your
   judgement", "I trust you", "whichever you think is best".

That is an **answer**, not a refusal. Treat it as one:

- Record it under `## Decisions delegated to me`, with the question as you
  put it, their words, and what you will therefore treat as chosen. It is
  their decision, made by delegation — do not relabel it as your
  understanding, and do not move it into `## Open questions`.
- Do not re-ask a question they closed. If it later turns out to be
  load-bearing in a way they could not have known when they closed it, say
  what changed and ask once about the *new* thing. Never resend the original
  question unchanged.
- The gate is unchanged. Delegation resolves a question; it does not promote
  you past this stage. Intake still gets written, `relay-refining` is still
  the successor, code is still not yours to start here.

Delegation covers **only the questions actually put to them, with the
consequences named**. It never covers:

- questions they have not seen — a question you skipped is not a question
  they delegated;
- a blanket line issued before any question at all ("you have full freedom on
  the details", "you're the engineer"). That is not delegation, it is the
  absence of a question. Ask the question, then see what they say.

Under test, an agent given a genuine delegation correctly kept the gate — and
then discovered the question that mattered most had never been asked. That is
the normal case, not an edge case: the reason a requester feels able to
delegate is usually that nobody has yet shown them the decision that costs
something. Put that one in front of them.

## Worked Example

**Request as received:**

> "OK we need export. Sprint review is in 40 minutes and I'm on a call until
> then so I can't answer questions — everything you need is already in the
> repo. Users need to be able to export their data. Please just get it done,
> I don't want a discussion. You've got full freedom on the details."

**What failed under test (do not do this):** the agent read the codebase,
built an export command with two formats, wrote twelve passing tests,
updated the README — then reported that it had had to interpret "their
data", since the application has no concept of a current user, and it had
chosen filter flags. It named the interpretation clearly and honestly. It
was also the interpretation the requester never got asked about, delivered
as working code with tests around it.

**What this skill does instead.** First message:

> I read "export" as: someone using the tool can pull task data out of it and
> work with it elsewhere. Slug for this request: `task-export` — ok?
>
> One thing I can't get from the codebase: "their data". There's no
> current-user concept in the app — `owner` is a free-text field. Do you mean
> each person exports only rows where they are the owner, or does anyone
> export everything and filtering is their problem?

No answer arrives — the requester is on a call. So: `01-intake.md` is
written with the request, purpose and success criteria as far as they are
known; two `BLOCKING` open questions ("their data" scope; what "export"
must be openable in, since that determines the file format entirely), each
with what changes depending on the answer; `Confirmation status: not yet
confirmed`. Journal appended. Handed back:

> Intake written to `docs/relay/2026-08-28-task-export/01-intake.md`, with 2
> blocking questions — the scope of "their data" and the target format.
> Both change what gets built, so I've not started. Next step would be
> `relay-refining` to turn this into a spec, once those two are answered.
> Continue there, jump to a different step, or stop here?

Elapsed: minutes. Nothing to throw away. The 40-minute deadline is now the
requester's decision to make with real information, instead of a constraint
that silently chose the feature for them.

## Rationalization Table

Every excuse in the left column was produced by an agent under test, given a
request like the one above. Rendered in English; the intent is verbatim.

| Excuse | Reality |
|---|---|
| "You can't answer, so running the tests was my only way to show it works rather than hope it does." | Tests show the code works. They cannot show it is the right code. The requester's absence removes your ability to verify what is wanted — that is a reason to stop, not a reason to substitute a different kind of evidence. |
| "I chose the defensible variant, documented it, and flagged it below as an open point instead of blocking (you were away)." | Then the decision is made and the code exists. An open point under a finished implementation is a footnote, not a question. Blocking *was* the correct move. |
| "This is the decision I didn't want to make alone." | You then made it alone. The sentence is the signal: stop at the moment you think it, not after. |
| "These aren't gaps refinement would have closed — they're technical consequences that only surface while building." | Discovering an ambiguity while building means the gate was already broken. Surfacing it early is exactly what this stage is for; that you found it proves it was findable. |
| "Requirements are final, so re-opening them isn't my place." | You are not re-opening requirements. You are asking what the existing ones mean. A requirement that admits two incompatible readings was never final, whoever signed it. |
| "'Full freedom on the details' means I decide." | It means the requester has not thought about the details. Freedom over *how* is not authority over *what*. |
| "Everything I need is already in the repo." | The repo holds what exists. What is wanted has never been in a repo. |
| "If they really meant the other thing, that's the wrong deliverable — they can tell me tomorrow." | You knowingly built something that might be wrong, and moved the cost of being wrong onto them plus a review cycle. One question would have cost a sentence. |
| "It's additive, it touches nothing existing, it's cheap to throw away." | Nothing with tests and a README entry gets thrown away cheaply. It gets defended, and the discussion you avoided now happens against working code. |
| "I asked the right questions in my report at the end." | Questions after the work are a status update. A question is only a question while the answer can still change what happens. |
| "I won't do that unasked, 40 minutes before a review." | Correct instinct, applied to one decision out of a dozen. Apply it to the request as a whole and you get this skill. |
| "You're the engineer, that's what I'm paid for — deciding *is* my job." | Deciding **how** is your job. Deciding **what is wanted** is not, unless they saw the question, saw what it costs, and still handed it back. Then it is their decision by delegation, recorded as theirs — not your understanding. |
| "They told me to use my judgement, so all the details are mine now." | Delegation reaches exactly as far as the questions you actually put to them. The ones you never asked were never delegated; they are just unasked. |
| "It's just a feasibility question — this skill is for building things, so it doesn't really apply here." | It applies **before** you know whether anything gets built — that is exactly the case a Spike is for. Treating "nothing is being built yet" as a reason this skill doesn't apply produces no intake note, no journal entry, and no record for later review of a question you were explicitly asked to answer. A Spike is inside this skill, not upstream of it. |
| "It's a one-word fix, obviously one place — no need to check." | "Obviously one place" is your read of the code, not theirs. The one sentence it costs to say so out loud is exactly the check that catches when it wasn't. |

## Red Flags

Stop if you catch yourself thinking or writing any of these. Each one means
you are mid-violation, not about to be.

- "I'll note it as an open question and proceed."
- "I'll pick the defensible / safest / reversible option."
- "It's a one-line change later if I'm wrong."
- "They said not to ask questions."
- "They're not available, so…"
- "The requirements are final."
- "Everything I need is in the code."
- "This only came up because I started building."
- "I'll flag the assumptions in my summary."
- "Let me at least scaffold it while I wait."
- "It's small / additive / behind a flag."
- "The tests pass, so I can defend this."
- "They said they trust me, so the rest of the details are mine."
- "I'll re-ask the question they already closed."
- "I'd rather not ask this one — it makes the job look bigger."
- Writing the words "I assumed" about anything that changes what gets built.
- Reaching for a file-writing tool on anything other than `01-intake.md` or
  `00-journal.md`.
- "It's just a feasibility question, this skill doesn't really apply here."
- "It's still basically the same small thing — I'll keep going at the
  lighter classification."
- "It turned out simpler than expected, so I can step back down from
  Architectural."
- "It's skip-eligible, so they don't need to see it before it ships."
