# Orchestrator ledger — export-nightly

L-01  root: A3 not fully carried — exit status / previous file untouched
      category coverage · seen: PR1-06, PR2-03, PR3-01, PR4-01
      re-planner round 1: closed — "added exit-status wording"
      re-planner round 2: closed — "clarified Task 3 done-when"
      re-planner round 3: closed — "done-when now states non-zero exit"
      attempts: 3
      round 3: routed to resolver in parallel.
      resolver round 3 returned: herkunft = requester
        question "May the error path touch the existing export file at all, or
        must it be left byte-identical?" — the spec does not settle it, and two
        answers change what an operator finds on disk after a failed run.

L-06  root: Task 1 fixture file not named
      category other · seen: PR3-07 · re-planner round 3: closed · not raised again
      status: done
