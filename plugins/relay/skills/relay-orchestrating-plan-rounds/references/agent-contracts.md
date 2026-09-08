# Agent contracts

What each subagent returns, so routing stays a lookup instead of a judgment.

## Review finding record

One block per finding. The reviewer states what it observed; the orchestrator
derives the weight from `stage`.

```
id        PR2-03              round-local, assigned by the reviewer
category  coverage | seam | card | run | fact | other
stage     build | acceptance | note
rests_on  B4                  only on `fact`; the requirement resting on the claim
route     planning | requester
root      <one line, in fix form>
problem   <what is wrong, quoting the plan>
guess     <what the card holder would have to guess, or `nothing`>
```

`root` is the field the ledger matches on. Write it as the fix, not as the
complaint:

```
root: Task 3 defines clearLayers, Task 7 consumes clearFullLayers
```

### The stages

`stage` is the second observation, and it answers one question only: **what happens
if this goes out unrepaired?** Like `category` it is an observation, not a verdict —
you are not saying how much it matters, you are saying what breaks.

| stage | Observed condition |
|---|---|
| `build` | it does not compile, it does not run, or a requirement is implemented in no card at all |
| `acceptance` | an `## Acceptance` entry with no card carrying it — the code may well be right, nothing checks that it is |
| `note` | a `Done when` that claims more than its steps assert; an internal the cards do not assert |

A finding that fits two takes the earlier row. `stage` and `category` are
independent: a `coverage` finding is `build` when nothing implements the
requirement and `acceptance` when the requirement is implemented but untested.

### The categories

| category  | Observed condition |
|---|---|
| `coverage` | A `## Behaviour` or `## Acceptance` entry that no card carries, or that a card carries only in part; a step with no acceptance criterion |
| `seam` | A `Consumes` with no character-identical `Produces` in an earlier task |
| `card` | A card its holder cannot finish alone — placeholder, unreachable done-when |
| `run` | Walking one run end to end through the cards produces behaviour the spec does not describe |
| `fact` | The plan asserts something from a source nobody opened |
| `other` | Everything else |

Categories are observations. A finding that fits two takes the earlier row.

`guess` is what routing rule C turns on, so it is never left blank: write what the
implementer cannot answer from the card, or `nothing` when the finding costs them
nothing to build against.

## Review coverage report

Two fractions per round, with every miss named. The reviewer counts; the
orchestrator compares against the gates.

```
acceptance: 8/8
behaviour:  8/9 — B4 has no test step and no stated reason
```

A `## Behaviour` point counts as covered when a card carries a test step for it, or
when the plan states in one line why no test is possible ("naming convention, not
observable at runtime"). A criterion the planner derived must be traceable to the
behaviour's own wording; if deriving it means deciding what a user sees or which
case counts as an error, that is a `route: requester` finding instead.

## Re-planner report

`relay-planning` on re-entry (stage 4) receives `04-plan.md`, `02-spec.md`, the
round's routed findings **and the resolver's answers to them**, and returns one line
per ledger id it received:

| Status | Meaning | Orchestrator does |
|---|---|---|
| `closed` | fixed, plus one line on what changed | ledger to "claimed closed" — the next review checks it independently |
| `cannot-close` | plus the reason | the resolver already answered this one in the same round, so no lane is left: record it under `## Open for a human`, entry stays open |
| `not-a-defect` | plus why the re-planner disagrees | if the next review raises the same `root`, it is a standoff — out of the loop |

A `closed` is never believed. If the next review reports the same `root`, that
is the evidence of a failed attempt, and the attempt count rises.

The re-planner never settles a question the spec left open — that answer arrived with
its inputs. A `cannot-close` that reads like a decision it could have made is a
finding the resolver failed to answer, not a licence to answer it at stage 4.

## Resolver answer record

Stage 3 receives `02-spec.md` and the round's routed findings — never `04-plan.md`.
One block per question. The resolver answers only from what it can point at, and it
writes no file: its answers travel to stage 4 and into `06-clarifications.md`.

```
id        PR2-05
herkunft  spec | fakt | default | spec-defekt | requester
answer    <the answer; empty for spec-defekt and requester>
evidence  <verbatim quote for `spec`; file:line or command for `fakt`; for
           `default`, the convention and the line that reverses it>
question  <only for `requester`: the question as it should be put>
```

The test the resolver applies to every question has two halves, and both get asked:

1. **Would two different answers change anything the requester can see or check?**
   **No** — it is a technical decision and belongs to planning, not to the
   resolver.
2. **Yes — then what does being wrong cost?** Two conditions, both required: the
   reversal is a one-line change, *and* one of the answers is the conventional one
   in this kind of software. Then it is `default`: answer it, name the convention
   as the reason, name the line that reverses it, and it travels as a note the
   requester can overrule rather than a question that stops the chain. If either
   condition fails — the reversal touches more than a line, or no answer is the
   conventional one — it is `requester`, and the resolver never answers it,
   whatever it could argue.

A `default` is not a bucket for guesses. It requires a convention you can name and
a reversal you can point at, and the answer is recorded where the requester will
see it: `06-clarifications.md`'s `## Defaults the requester can overrule`. If you
find yourself writing "probably" or "most likely", the question was `requester`.
