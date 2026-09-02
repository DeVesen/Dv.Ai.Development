# Ledger and clarifications file

The ledger is the orchestrator's own state. It is the only thing that carries
continuity between rounds, because no subagent sees a previous one.

## Ledger entry

```
lid       L-04                stable across all rounds
root      <copied from the finding that opened this entry>
category  coverage | seam | card | run | fact | other
weight    A | advisory        derived from category, never edited afterwards
seen      PR1-02, PR3-05      the round-local finding ids that mapped here
attempts  1                   failed attempts, counted — not inferred
status    see below
```

An entry is opened from either of two sources: a finding record, or a miss named
in the round's coverage report. A named miss with no finding record still gets its
entry — `root` is the report's own wording for it, `category` is `coverage`, and
`seen` stays empty for that round because no round-local finding id exists. This
is the only entry you author yourself, and it is transcription: the review decided
the miss was real, you record that it was named.

Round-local finding ids restart each round (`PR1-01`, `PR2-01`), so every incoming
finding has to be mapped onto an `lid` first. Map on `root`, using the root-cause
test: **would the answer that closes it be the same answer as last time?** Identical
wording is not the test, and neither is a rewritten finding a new one.

## States

```
open
 ├─ A, every round ──────────────> attempts 1 ──> attempts 2 ──> resolver
 ├─ advisory, seen before ───────> dropped (rule B)
 ├─ fixer: cannot-close ──────────> resolver                       (at once)
 ├─ fixer: not-a-defect,
 │   raised again by the review ─> standoff, out of the loop       (at once)
 └─ fixer: closed,
     not raised again ──────────> done
```

`attempts` rises only when the fixer reported `closed` and the next review
raised the same `root` again. A finding nobody worked on stays at its count — it
never burns the escalation budget.

An A entry reaching the resolver keeps going out to the fixer as well: the spec
question and the planning defect are worked in parallel, and only the human ends the
loop early.

## Round accounting

One round is one pass of stage 3 plus stage 4. Four rounds is the cap. At the cap:

- no A entries open → the plan is approved, successor `relay-plan-execution`
- any A entry open → the run ends with no approved plan; the plan, the open entries
  and `06-clarifications.md` go to a human

## `06-clarifications.md`

Written by the orchestrator only. One file per request, appended across rounds.

```markdown
# Clarifications — <request-id>-<slug>

## Resolved
| lid | question | answer | provenance |
|-----|----------|--------|------------|
<`spec` rows quote the passage; `fakt` rows name file:line or the command run.>

## Open for a human
<Per entry: the question as it should be put, who has to answer it, and what it
blocks. Includes every `spec-defekt` and every standoff.>

## Dropped
| lid | root | rounds seen | why dropped |
|-----|------|-------------|-------------|
<Every advisory finding rule B removed. This block is what makes the filtering
auditable; without it, the orchestrator's own decisions are the only ones nobody
can check.>

## Rounds
<One line per round: which lids went out, which came back, the two coverage
fractions.>
```

The `## Dropped` block is never omitted for being long or for holding only small
things. It is read together with `## Open for a human` — those two sections are the
whole audit of a run that no person watched.
