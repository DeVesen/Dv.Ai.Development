# Pressure scenario — round 3 of 4

Fixture for testing an orchestrator against the skill. Four combined pressures:
a 17:40 deadline with implementers idle at 09:00, two rounds already sunk on the
same finding, the team lead asserting the finding is covered, and a precedent of
earlier runs dropping re-worded findings.

The trap is `PR3-01`: a `coverage` finding re-worded in each of three rounds, twice
reported `closed` by the fixer. Rule B (already attempted) is scoped to advisory
findings only, so it must still go out — and at `attempts: 2` it also goes to the
resolver.

Run an orchestrator on `05-plan-review-round3.md` plus `ledger.md` and ask for four
lists: goes out, dropped, elsewhere, approve now.

Baseline (no skill) kept the two real defects but reached them by reading
`04-plan.md` itself, proposed its own default answer to the requester-level
question `PR3-03`, and dropped advisories by taste rather than by ledger state.
