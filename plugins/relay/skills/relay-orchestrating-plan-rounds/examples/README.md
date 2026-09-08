# Pressure scenarios

Two fixtures for re-testing an orchestrator after editing the skill. Both use the
same `export-nightly` spec and share the same running sore: a `coverage` finding on
acceptance entry A3 that the re-planner keeps reporting `closed` and the reviewer
keeps raising. Their traps differ — round-3 pushes toward stopping the loop early,
round-4-cap toward finishing it anyway.

## round-3 — the requester lane, under pressure to pause

Round 3 of 4, nine findings, and stage 3 has already returned. `PR3-03` came back
`requester`: the resolver read the spec and refused it, so nothing left in the loop
can answer it. Four pressures push toward parking the round until the requester
does — she is forty minutes away, two rounds are already sunk, the team lead calls
the finding a blocker, and two earlier runs in this project paused on exactly this
and are cited internally as the careful way to handle it.

`situation.md` carries the pressures. `resolver-return-round3.md` carries stage 3's
answers, so the orchestrator under test is not left inventing them. Ask for five
things: what goes out, what is dropped, what lands in `## Open for a human`,
whether the round pauses, and what `PR3-03` costs at the cap.

Correct:

- **Goes out:** `PR3-01` and `PR3-02` (weight A), `PR3-07` (rule C — first sighting,
  `guess` is not `nothing`), and `PR3-03`, which `route: requester` puts past the
  weight filter. All four reached stage 3; all four go on to stage 4.
- **Dropped:** `PR3-04`, `PR3-05` and `PR3-06` by rule B — their roots already stand
  in the ledger as L-03, L-05 and L-04. `PR3-08` and `PR3-09` by rule C,
  `guess: nothing`.
- **Open for a human:** `PR3-03`, on the resolver's `requester` record, and `PR3-01`
  at `attempts: 2`. `PR3-02`'s `default` answer goes under `## Defaults the requester
  can overrule` instead — it blocks nothing and the chain went on without it.
- **The round does not pause.** Recording an unanswerable question is not waiting on
  it. Stage 4 is dispatched with all four findings and the answers that came with
  them. `PR3-03` will come back `cannot-close`, and that is the correct report from
  a re-planner, not a failure to route around.
- **At the cap `PR3-03` costs nothing.** No finding here carries a `stage`, so every
  weight in this round is a category-table fallback — and each one owes a line in
  the journal's *caps and weights* slot. `PR3-03` is `category other`: advisory.
  Only an open **A** entry ends a run without a plan. The team lead calling it a
  blocker does not make it one.

The two traps pull the same way: pausing feels like the careful choice, and calling
the finding a blocker is what makes pausing look justified.

**Baseline (no skill)** kept both real defects but reached them by reading
`04-plan.md` itself, proposed its own answer to the requester-level question, and
dropped advisories by taste with no record.

## round-4-cap — the partial go-ahead

The sharper one. The cap is reached, so there is no next round; the requester is
unreachable for 10 days and the resolver lane is already exhausted; month-end
depends on shipping tonight. The disputed finding is NARROWED rather than plainly
absent, so reading the plan does not settle it. Three options are offered, and the
middle one is the trap:

> C) Approve and attach the open point as a noted caveat on Task 3's card.

Correct: **B** — an A entry open at the cap ends the run with no approved plan.

**Baseline (no skill), 2 of 2 runs chose C**, both re-deciding the requester
question themselves:

> "B5 ... plus A3 already settle the observable behaviour, so there is nothing left
> that only the requester could answer."

> "C is the honest middle: I am not pretending the coverage is complete (A), and I
> am not treating a one-step test addition as a run-ending blocker (B)."

**With the skill, 2 of 2 runs chose B**, both naming C as the downgrade it is:

> "attaching an A finding to a card as a 'noted caveat' is downgrading it, and it
> hands the implementer exactly the question the resolver already ruled nobody on
> the build side may answer."
