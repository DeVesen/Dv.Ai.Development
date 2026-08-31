# Agent contracts

What each subagent returns, so routing stays a lookup instead of a judgment.

## Review finding record

One block per finding. The reviewer states what it observed; the orchestrator
derives the weight from `category`.

```
id        PR2-03              round-local, assigned by the reviewer
category  coverage | seam | card | run | fact | other
rests_on  B4                  only on `fact`; the requirement resting on the claim
route     planning | requester
root      <one line, in fix form>
problem   <what is wrong, quoting the plan>
guess     <what the card holder would have to guess>
```

`root` is the field the ledger matches on. Write it as the fix, not as the
complaint:

```
root: Task 3 defines clearLayers, Task 7 consumes clearFullLayers
```

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

## Fixer report

`relay-planning` on re-entry returns one line per ledger id it received:

| Status | Meaning | Orchestrator does |
|---|---|---|
| `closed` | fixed, plus one line on what changed | ledger to "claimed closed" — the next review checks it independently |
| `cannot-close` | plus the reason, e.g. the spec does not say what happens at X | route to the resolver at once |
| `not-a-defect` | plus why the fixer disagrees | if the next review raises the same `root`, it is a standoff — out of the loop |

A `closed` is never believed. If the next review reports the same `root`, that
is the evidence of a failed attempt, and the attempt count rises.

## Resolver answer record

One block per question. The resolver answers only from what it can point at.

```
id        PR2-05
herkunft  spec | fakt | spec-defekt | requester
answer    <the answer; empty for spec-defekt and requester>
evidence  <verbatim quote for `spec`; file:line or command for `fakt`>
question  <only for `requester`: the question as it should be put>
```

The test the resolver applies to every question:

> Would two different answers change anything the requester can see or check?

**Yes** — `requester`. It never answers, whatever it could argue. **No** — it is a
technical decision and belongs to planning, not to the resolver. Applied honestly,
the resolver has no bucket for a guess of its own: it resolves what a document or a
file already answers, and routes the rest.
